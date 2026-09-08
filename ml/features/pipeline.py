import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler
from typing import List, Dict, Any, Tuple
import joblib
from ml.config.settings import ISOLATION_FOREST_FEATURES, SCALER_PATH

class FeaturePipeline:
    def __init__(self):
        self.scaler: RobustScaler = RobustScaler()
        self.feature_names = ISOLATION_FOREST_FEATURES
        self.feature_medians: Dict[str, float] = {}

    def extract_raw_features(self, projects: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Converts project records into a clean numerical DataFrame for ML.
        No IDs, names, or arbitrary categorical text are fed to the model.
        """
        rows = []
        for p in projects:
            # Financial metrics
            sanctioned = float(p.get("sanctioned_amount", 0) or 0)
            estimated = float(p.get("estimated_cost", sanctioned) or sanctioned or 0)
            actual = float(p.get("actual_expenditure", 0) or 0)
            cost = actual if actual > 0 else sanctioned

            exp_ratio = actual / estimated if estimated > 0 else 0.0
            overrun_ratio = (actual - estimated) / estimated if (estimated > 0 and actual > estimated) else 0.0
            progress = float(p.get("physical_progress_percentage", 0) or 0)
            exp_progress_gap = max(0.0, (exp_ratio * 100.0) - progress)

            # Execution timeline features
            delay_days = float(p.get("delay_days", 0) or 0)
            execution_days = float(p.get("execution_duration_days", p.get("actual_execution_days", 180)) or 180)
            project_age = float(p.get("project_age_days", execution_days) or execution_days)

            # Peer-relative features
            peer_benchmark = p.get("peer_benchmark", {}) or {}
            peer_cost_median = float(peer_benchmark.get("peer_cost_median", p.get("peer_cost_median", cost)) or cost or 1)
            peer_duration_median = float(peer_benchmark.get("peer_duration_median_days", p.get("peer_duration_median_days", 180)) or 180 or 1)

            peer_cost_ratio = cost / peer_cost_median if peer_cost_median > 0 else 1.0
            peer_duration_ratio = execution_days / peer_duration_median if peer_duration_median > 0 else 1.0
            peer_progress_dev = progress - float(p.get("peer_progress_median", 75))

            peer_cost_dev = float(peer_benchmark.get("cost_deviation_pct", p.get("cost_deviation_pct", 0)) or 0)
            peer_dur_dev = float(peer_benchmark.get("duration_deviation_pct", p.get("duration_deviation_pct", 0)) or 0)

            beneficiaries = float(p.get("beneficiary_count", 1000) or 1000)

            row = {
                "sanctioned_amount": sanctioned,
                "estimated_cost": estimated,
                "actual_expenditure": actual,
                "expenditure_ratio": exp_ratio,
                "cost_overrun_ratio": overrun_ratio,
                "physical_progress_percentage": progress,
                "expenditure_progress_gap": exp_progress_gap,
                "project_age_days": project_age,
                "delay_days": delay_days,
                "execution_duration_days": execution_days,
                "peer_cost_deviation": peer_cost_dev,
                "peer_duration_deviation": peer_dur_dev,
                "beneficiary_count": beneficiaries,
                "peer_cost_ratio": peer_cost_ratio,
                "peer_duration_ratio": peer_duration_ratio,
                "peer_progress_deviation": peer_progress_dev
            }
            rows.append(row)

        df = pd.DataFrame(rows)

        # Impute missing values with column medians
        for col in self.feature_names:
            if col not in df.columns:
                df[col] = 0.0
            median_val = df[col].median()
            if pd.isna(median_val):
                median_val = 0.0
            self.feature_medians[col] = float(median_val)
            df[col] = df[col].fillna(median_val)

        return df[self.feature_names]

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        return self.scaler.fit_transform(df[self.feature_names])

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        return self.scaler.transform(df[self.feature_names])

    def save_scaler(self, path=SCALER_PATH):
        joblib.dump({"scaler": self.scaler, "medians": self.feature_medians}, path)

    def load_scaler(self, path=SCALER_PATH):
        if path.exists():
            data = joblib.load(path)
            self.scaler = data["scaler"]
            self.feature_medians = data.get("medians", {})
            return True
        return False
