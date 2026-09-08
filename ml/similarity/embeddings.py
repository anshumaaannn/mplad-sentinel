import math
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import joblib
from ml.config.settings import SENTENCE_TRANSFORMER_MODEL, EMBEDDINGS_CACHE_PATH, DUPLICATE_WEIGHTS

class SemanticEmbeddingService:
    def __init__(self):
        self.model = None
        self.is_sentence_transformer_active = False
        self.embeddings_cache: Dict[str, List[float]] = {}
        self.load_cache()
        self._initialize_model()

    def _initialize_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)
            self.is_sentence_transformer_active = True
            print(f"[SemanticNLP] Successfully initialized SentenceTransformer ({SENTENCE_TRANSFORMER_MODEL})")
        except Exception as e:
            self.model = None
            self.is_sentence_transformer_active = False
            print(f"[SemanticNLP] Warning: SentenceTransformer unavailable ({e}). Using lexical fallback.")

    def load_cache(self):
        if EMBEDDINGS_CACHE_PATH.exists():
            try:
                self.embeddings_cache = joblib.load(EMBEDDINGS_CACHE_PATH)
            except Exception:
                self.embeddings_cache = {}

    def save_cache(self):
        try:
            joblib.dump(self.embeddings_cache, EMBEDDINGS_CACHE_PATH)
        except Exception:
            pass

    def get_embedding(self, text: str) -> np.ndarray:
        clean_text = text.strip()
        if clean_text in self.embeddings_cache:
            return np.array(self.embeddings_cache[clean_text], dtype=np.float32)

        if self.is_sentence_transformer_active and self.model is not None:
            emb = self.model.encode(clean_text, normalize_embeddings=True)
            self.embeddings_cache[clean_text] = emb.tolist()
            return np.array(emb, dtype=np.float32)
        else:
            # Deterministic pseudo-embedding fallback based on token hashing + n-grams
            emb = self._lexical_pseudo_embedding(clean_text)
            self.embeddings_cache[clean_text] = emb.tolist()
            return emb

    def _lexical_pseudo_embedding(self, text: str, dim: int = 128) -> np.ndarray:
        words = [w.lower() for w in text.split() if len(w) > 2]
        vec = np.zeros(dim, dtype=np.float32)
        for i, word in enumerate(words):
            h = hash(word) % dim
            vec[h] += 1.0 / (i + 1)
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def compute_similarity(self, text1: str, text2: str) -> float:
        emb1 = self.get_embedding(text1)
        emb2 = self.get_embedding(text2)
        dot_product = float(np.dot(emb1, emb2))
        norm1 = float(np.linalg.norm(emb1))
        norm2 = float(np.linalg.norm(emb2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        similarity = max(0.0, min(1.0, dot_product / (norm1 * norm2)))
        return round(similarity * 100.0, 1)

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates great-circle distance between two geographic coordinates in kilometers.
        """
        if lat1 == 0 or lon1 == 0 or lat2 == 0 or lon2 == 0:
            return 999.0

        R = 6371.0  # Earth's radius in kilometers
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2.0) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(R * c, 2)

    def evaluate_duplicate_pair(
        self,
        p1: Dict[str, Any],
        p2: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Multi-factor duplicate candidate evaluation combining:
        - Semantic embedding similarity (Sentence Transformers)
        - Haversine geographic proximity
        - Work type identity
        - Administrative district co-location
        """
        if p1.get("project_id") == p2.get("project_id"):
            return None

        # Calculate geospatial distance
        lat1, lon1 = float(p1.get("latitude", 0) or 0), float(p1.get("longitude", 0) or 0)
        lat2, lon2 = float(p2.get("latitude", 0) or 0), float(p2.get("longitude", 0) or 0)
        distance_km = self.haversine_distance(lat1, lon1, lat2, lon2)

        # Skip if projects are in different districts and far apart (> 15 km)
        same_district = p1.get("district", "").strip().lower() == p2.get("district", "").strip().lower()
        if not same_district and distance_km > 15.0:
            return None

        # Semantic NLP similarity
        title1 = p1.get("work_name", "")
        title2 = p2.get("work_name", "")
        semantic_sim = self.compute_similarity(title1, title2)

        # Work type comparison
        wt1 = p1.get("work_type", "").strip().lower()
        wt2 = p2.get("work_type", "").strip().lower()
        same_work_type = wt1 == wt2 or (wt1 in wt2) or (wt2 in wt1)

        # Proximity score (0 - 100)
        if distance_km <= 1.0:
            proximity_score = 100.0
        elif distance_km <= 3.0:
            proximity_score = 80.0
        elif distance_km <= 5.0:
            proximity_score = 60.0
        elif distance_km <= 10.0:
            proximity_score = 40.0
        else:
            proximity_score = 10.0

        # Weighted composite duplicate score
        weights = DUPLICATE_WEIGHTS
        composite_score = (
            weights["semantic_similarity"] * semantic_sim +
            weights["proximity"] * proximity_score +
            weights["work_type_match"] * (100.0 if same_work_type else 20.0) +
            weights["district_match"] * (100.0 if same_district else 0.0)
        )
        composite_score = round(min(100.0, max(0.0, composite_score)), 1)

        # Determine objective governance status
        if composite_score >= 70.0 and distance_km <= 3.0:
            risk_indicator = "Potential Duplicate"
        elif composite_score >= 55.0 and distance_km <= 10.0:
            risk_indicator = "Overlapping Scope"
        elif composite_score >= 45.0:
            risk_indicator = "Requires Verification"
        else:
            return None

        reasons = []
        if semantic_sim >= 70.0:
            reasons.append(f"High semantic embedding similarity ({semantic_sim}%)")
        if distance_km <= 3.0:
            reasons.append(f"Geographic proximity of {distance_km} km")
        if same_work_type:
            reasons.append(f"Identical work type: {p1.get('work_type')}")
        if same_district:
            reasons.append(f"Same administrative district: {p1.get('district')}")

        return {
            "matched_project_id": p2.get("project_id"),
            "matched_work_name": p2.get("work_name"),
            "matched_district": p2.get("district"),
            "matched_agency": p2.get("implementing_agency"),
            "matched_sanctioned_amount": p2.get("sanctioned_amount"),
            "semantic_similarity": semantic_sim,
            "distance_km": distance_km,
            "duplicate_score": composite_score,
            "risk_indicator": risk_indicator,
            "reasons": reasons
        }
