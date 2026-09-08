import os
import sys
from pathlib import Path

# Ensure utf-8 output encoding
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from ml.training.train import train_isolation_forest
from ml.similarity.embeddings import SemanticEmbeddingService

def main():
    print("==================================================")
    print(">> MPLAD SENTINEL ML MODEL BUILD & CACHE PIPELINE")
    print("==================================================")
    
    # 1. Train Isolation Forest
    csv_path = "data/demo_projects.csv"
    if not Path(csv_path).exists():
        csv_path = str(BASE_DIR / "data" / "demo_projects.csv")

    metadata = train_isolation_forest(csv_path)

    # 2. Warm up and verify Sentence Transformers
    print("\n[NLP] Initializing and testing Sentence Transformers...")
    nlp = SemanticEmbeddingService()
    test_sim = nlp.compute_similarity(
        "Construction of Community Hall at Village Rampur Kalan",
        "Construction of Community Centre and Cultural Hall at Rampur Kalan"
    )
    print(f"[NLP] Demo similarity test result: {test_sim}% match")
    nlp.save_cache()

    print("\n[SUCCESS] All ML models and pipelines successfully trained and cached.")

if __name__ == "__main__":
    main()
