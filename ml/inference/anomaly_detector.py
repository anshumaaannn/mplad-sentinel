import json
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
import joblib
from ml.config.settings import MODEL_PATH, METADATA_PATH, SCALER_PATH
from ml.features.pipeline import FeaturePipeline

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.pipeline = FeaturePipeline()
        self.metadata: Dict[str, Any] = {}
        self.training_scores: List[float] = []
        self.is_loaded = False
        self.load_model()

    def load_model(self) -> bool:
        if MODEL_PATH.exists() and METADATA_PATH.exists() and SCALER_PATH.exists():
            try:
                self.model = joblib.load(MODEL_PATH)
                self.pipeline.load_scaler(SCALER_PATH)
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                self.training_scores = self.metadata.get("training_score_distribution", [])
                self.is_loaded = True
                print(f"[AnomalyDetector] Loaded Isolation Forest v{self.metadata.get('model_version', '1.0')} ({len(self.metadata.get('features', []))} features)")
                return True
            except Exception as e:
                print(f"[AnomalyDetector] Failed to load model: {e}")
                self.is_loaded = False
                return False
        return False

    def predict(self, projects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Runs inference on projects. If model is not loaded, gracefully returns default scores.
        """
        if not projects:
            return []

        if not self.is_loaded or self.model is None:
            return [
                {
                    "project_id": p.get("project_id"),
                    "anomaly_score": 0.0,
                    "anomaly_percentile": 50.0,
                    "is_ml_anomaly": False,
                    "unusual_characteristics": [],
                    "model_status": "UNLOADED"
                }
                for p in projects
            ]

        df_raw = self.pipeline.extract_raw_features(projects)
        X_scaled = self.pipeline.transform(df_raw)

        # Isolation Forest: decision_function returns negative values for anomalies
        # We invert so that higher = more anomalous
        decision = self.model.decision_function(X_scaled)
        preds = self.model.predict(X_scaled)  # -1 for outlier, 1 for inlier
        raw_anomaly_scores = -decision

        results = []
        dist = np.array(self.training_scores) if len(self.training_scores) > 0 else raw_anomaly_scores

        min_val = float(np.min(dist))
        max_val = float(np.max(dist))
        val_range = max_val - min_val if max_val > min_val else 1.0

        for i, p in enumerate(projects):
            raw_s = float(raw_anomaly_scores[i])
            # Bounded normalized anomaly score: 0 to 100
            norm_score = round(max(0.0, min(100.0, ((raw_s - min_val) / val_range) * 100.0)), 1)

            # Percentile rank against training distribution
            percentile = round(float(np.mean(dist <= raw_s) * 100.0), 1)
            is_anomaly = bool(preds[i] == -1 or percentile >= 88.0)

            # Extract non-causal feature deviation characteristics
            row_dict = df_raw.iloc[i].to_dict()
            characteristics = self._explain_characteristics(row_dict, p)

            results.append({
                "project_id": p.get("project_id"),
                "anomaly_score": norm_score,
                "anomaly_percentile": percentile,
                "is_ml_anomaly": is_anomaly,
                "unusual_characteristics": characteristics,
                "model_status": "ACTIVE"
            })

        return results

    def _explain_characteristics(self, row: Dict[str, float], p: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extracts factual feature-level deviations relative to peer and dataset baselines.
        Does NOT claim causal fraud.
        """
        characteristics = []

        # 1. Cost & peer deviation
        cost_dev = row.get("peer_cost_deviation", 0)
        if cost_dev > 50:
            characteristics.append({
                "metric": "Sanctioned Cost vs Peer Median",
                "observed": f"₹{(row.get('sanctioned_amount', 0) / 100000):.1f} L",
                "deviation": f"+{cost_dev:.0f}% above peer median",
                "description": f"Cost is {row.get('peer_cost_ratio', 1):.1f}× the peer group median."
            })

        # 2. Expenditure vs progress gap
        gap = row.get("expenditure_progress_gap", 0)
        if gap > 30:
            exp_pct = row.get("expenditure_ratio", 0) * 100
            prog_pct = row.get("physical_progress_percentage", 0)
            characteristics.append({
                "metric": "Expenditure vs Progress Disparity",
                "observed": f"{exp_pct:.0f}% spent vs {prog_pct:.0f}% ground progress",
                "deviation": f"+{gap:.0f} percentage points divergence",
                "description": f"Disbursement significantly outpaces verified on-ground completion."
            })

        # 3. Chronic Execution Delay
        delay = row.get("delay_days", 0)
        if delay > 90:
            characteristics.append({
                "metric": "Execution Timeline Slippage",
                "observed": f"{int(delay)} days overdue",
                "deviation": f"{row.get('peer_duration_ratio', 1):.1f}× peer median timeline",
                "description": f"Timeline exceeded planned schedule by {int(delay)} days."
            })

        # 4. Budget Overrun Ratio
        overrun = row.get("cost_overrun_ratio", 0)
        if overrun > 0.15:
            characteristics.append({
                "metric": "Estimate Cost Escalation",
                "observed": f"+{(overrun * 100):.0f}% cost increase",
                "deviation": f"Exceeds initial DPR sanctioned allocation",
                "description": f"Actual expenditure escalated past the original sanctioned budget."
            })

        return characteristics
