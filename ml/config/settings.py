import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODELS_DIR / "isolation_forest.joblib"
SCALER_PATH = MODELS_DIR / "scaler.joblib"
METADATA_PATH = MODELS_DIR / "model_metadata.json"
EMBEDDINGS_CACHE_PATH = MODELS_DIR / "embeddings_cache.joblib"

# Numerical features for Isolation Forest
# (No raw IDs, names, or arbitrary categorical text)
ISOLATION_FOREST_FEATURES = [
    "sanctioned_amount",
    "estimated_cost",
    "actual_expenditure",
    "expenditure_ratio",
    "cost_overrun_ratio",
    "physical_progress_percentage",
    "expenditure_progress_gap",
    "project_age_days",
    "delay_days",
    "execution_duration_days",
    "peer_cost_deviation",
    "peer_duration_deviation",
    "beneficiary_count",
    # Peer-relative engineered features
    "peer_cost_ratio",
    "peer_duration_ratio",
    "peer_progress_deviation"
]

# Model Training Hyperparameters
CONTAMINATION = 0.08      # Approximately 8% upper bound for anomaly rate
RANDOM_STATE = 42         # Deterministic seed for reproducibility
N_ESTIMATORS = 150        # Tree ensemble size
MAX_SAMPLES = "auto"

# Sentence Transformers Configuration
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"

# Duplicate Detection Weights
DUPLICATE_WEIGHTS = {
    "semantic_similarity": 0.45,
    "proximity": 0.25,
    "work_type_match": 0.20,
    "district_match": 0.10
}
