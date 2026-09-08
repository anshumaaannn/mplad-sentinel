import sys
from pathlib import Path
import datetime
from typing import List, Dict, Any, Optional

# Set utf-8 encoding and sys.path
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ml.inference.anomaly_detector import AnomalyDetector
from ml.similarity.embeddings import SemanticEmbeddingService
from ml.training.train import train_isolation_forest
from ml.config.settings import METADATA_PATH

app = FastAPI(
    title="MPLAD Sentinel ML Analytics Engine",
    description="Unsupervised Anomaly Detection (Isolation Forest) & Semantic Proximity (Sentence Transformers)",
    version="0.2.0-HYBRID"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model services
detector = AnomalyDetector()
nlp_service = SemanticEmbeddingService()

# ---------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------
class ProjectListRequest(BaseModel):
    projects: List[Dict[str, Any]]

class SimilarityRequest(BaseModel):
    textA: str
    textB: str

class DuplicatePairRequest(BaseModel):
    projectA: Dict[str, Any]
    projectB: Dict[str, Any]

class BatchAnalyzeRequest(BaseModel):
    projects: List[Dict[str, Any]]
    find_duplicates: Optional[bool] = True

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------
@app.get("/ml/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "MPLAD Sentinel Python ML Engine",
        "version": "0.2.0-HYBRID",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "models": {
            "isolation_forest": {
                "active": detector.is_loaded,
                "version": detector.metadata.get("model_version", "unknown"),
                "features_count": len(detector.metadata.get("features", []))
            },
            "sentence_transformers": {
                "active": nlp_service.is_sentence_transformer_active,
                "model_name": "all-MiniLM-L6-v2" if nlp_service.is_sentence_transformer_active else "lexical_fallback"
            }
        }
    }

@app.get("/ml/model-info")
def model_info():
    if not detector.is_loaded:
        detector.load_model()
    return {
        "isolation_forest": detector.metadata,
        "semantic_nlp": {
            "model_name": "all-MiniLM-L6-v2",
            "active": nlp_service.is_sentence_transformer_active,
            "cached_embeddings_count": len(nlp_service.embeddings_cache)
        }
    }

@app.post("/ml/anomaly-score")
def anomaly_score(payload: ProjectListRequest):
    if not detector.is_loaded:
        detector.load_model()
    results = detector.predict(payload.projects)
    return {
        "success": True,
        "total": len(results),
        "results": results
    }

@app.post("/ml/similarity")
def compute_similarity(payload: SimilarityRequest):
    sim = nlp_service.compute_similarity(payload.textA, payload.textB)
    return {
        "success": True,
        "similarity": sim,
        "engine": "SentenceTransformer (all-MiniLM-L6-v2)" if nlp_service.is_sentence_transformer_active else "Lexical Fallback"
    }

@app.post("/ml/evaluate-duplicate")
def evaluate_duplicate(payload: DuplicatePairRequest):
    match = nlp_service.evaluate_duplicate_pair(payload.projectA, payload.projectB)
    return {
        "success": True,
        "is_duplicate_candidate": match is not None,
        "data": match
    }

@app.post("/ml/analyze")
def batch_analyze(payload: BatchAnalyzeRequest):
    projects = payload.projects
    if not detector.is_loaded:
        detector.load_model()

    # 1. Unsupervised Anomaly Scoring
    anomaly_results = detector.predict(projects)
    anomaly_map = {r["project_id"]: r for r in anomaly_results}

    # 2. Duplicate Detection (Sentence Transformers + Proximity + Work Type + District)
    duplicate_pairs = []
    if payload.find_duplicates and len(projects) > 1:
        # Candidate pruning: only compare projects within same state or sector to avoid O(n^2) explosion
        for i in range(len(projects)):
            p1 = projects[i]
            for j in range(i + 1, len(projects)):
                p2 = projects[j]
                # Fast pre-filter: skip if different sector and different district
                if p1.get("sector") != p2.get("sector") and p1.get("district") != p2.get("district"):
                    continue

                dup_eval = nlp_service.evaluate_duplicate_pair(p1, p2)
                if dup_eval is not None:
                    duplicate_pairs.append({
                        "projectA": p1,
                        "projectB": p2,
                        "similarity": dup_eval["semantic_similarity"],
                        "distance_km": dup_eval["distance_km"],
                        "duplicate_score": dup_eval["duplicate_score"],
                        "risk_level": "CRITICAL" if dup_eval["duplicate_score"] >= 75 else "HIGH",
                        "risk_indicator": dup_eval["risk_indicator"],
                        "reasons": dup_eval["reasons"]
                    })

    nlp_service.save_cache()

    return {
        "success": True,
        "total_projects": len(projects),
        "ml_engine": {
            "isolation_forest_active": detector.is_loaded,
            "sentence_transformers_active": nlp_service.is_sentence_transformer_active
        },
        "anomalies": anomaly_map,
        "duplicate_pairs": duplicate_pairs,
        "duplicate_count": len(duplicate_pairs)
    }

@app.post("/ml/train")
def trigger_training(csv_path: Optional[str] = None):
    path = csv_path or "data/demo_projects.csv"
    try:
        meta = train_isolation_forest(path)
        detector.load_model()
        return {"success": True, "metadata": meta}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
