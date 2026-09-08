import json
import datetime
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.ensemble import IsolationForest
import joblib

from ml.config.settings import (
    MODEL_PATH, SCALER_PATH, METADATA_PATH,
    ISOLATION_FOREST_FEATURES, CONTAMINATION, RANDOM_STATE, N_ESTIMATORS
)
from ml.features.pipeline import FeaturePipeline

def train_isolation_forest(csv_path: str = "data/demo_projects.csv") -> dict:
    print("==================================================")
    print(">> TRAINING ISOLATION FOREST ANOMALY MODEL")
    print("==================================================")
    
    file_p = Path(csv_path)
    if not file_p.exists():
        raise FileNotFoundError(f"Dataset not found at {csv_path}")

    df_csv = pd.read_csv(file_p)
    projects = df_csv.to_dict(orient="records")
    total_records = len(projects)
    print(f"[Training] Loaded {total_records} project records from {csv_path}")

    # Initialize feature pipeline
    pipeline = FeaturePipeline()
    df_features = pipeline.extract_raw_features(projects)
    
    # Fit scaler & transform
    X_scaled = pipeline.fit_transform(df_features)
    print(f"[Training] Extracted {len(pipeline.feature_names)} numerical & peer-relative features.")

    # Train Isolation Forest
    model = IsolationForest(
        n_estimators=N_ESTIMATORS,
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        bootstrap=False
    )
    model.fit(X_scaled)
    print(f"[Training] Isolation Forest fitted with n_estimators={N_ESTIMATORS}, contamination={CONTAMINATION}")

    # Compute training distribution
    raw_scores = -model.decision_function(X_scaled)
    preds = model.predict(X_scaled)
    anomaly_count = int(np.sum(preds == -1))
    print(f"[Training] Detected {anomaly_count} statistical anomalies ({anomaly_count/total_records*100:.1f}%) in training data.")

    # Persist model and scaler
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    pipeline.save_scaler(SCALER_PATH)

    # Persist model metadata
    metadata = {
        "model_name": "Isolation Forest",
        "model_type": "Unsupervised Multi-Dimensional Anomaly Detector",
        "model_version": "0.2.0-HYBRID",
        "algorithm": "scikit-learn IsolationForest",
        "training_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "training_records": total_records,
        "features": pipeline.feature_names,
        "contamination": CONTAMINATION,
        "random_seed": RANDOM_STATE,
        "n_estimators": N_ESTIMATORS,
        "anomalies_detected_count": anomaly_count,
        "training_score_distribution": raw_scores.tolist()
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Training] Model persisted to {MODEL_PATH}")
    print(f"[Training] Scaler persisted to {SCALER_PATH}")
    print(f"[Training] Metadata persisted to {METADATA_PATH}")

    return metadata

if __name__ == "__main__":
    train_isolation_forest()
