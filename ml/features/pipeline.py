import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler
from typing import List, Dict, Any, Tuple, Optional
import joblib
from ml.config.settings import ISOLATION_FOREST_FEATURES, SCALER_PATH

REFERENCE_DATE = pd.Timestamp("2025-06-01")


def calculate_project_timeline(p: Dict[str, Any]) -> Dict[str, float]:
    """
    Computes planned duration, actual execution duration, delay days, and project age days
    identically to the TypeScript FeatureEngineeringService.
    """
    start_str = p.get("start_date")
    exp_end_str = p.get("expected_completion_date")
    comp_str = p.get("completion_date")
    sanc_str = p.get("sanction_date") or start_str

    try:
        start_dt = pd.to_datetime(start_str) if start_str and str(start_str) != "nan" else REFERENCE_DATE
    except Exception:
        start_dt = REFERENCE_DATE

    try:
        exp_end_dt = pd.to_datetime(exp_end_str) if exp_end_str and str(exp_end_str) != "nan" else start_dt + pd.Timedelta(days=180)
    except Exception:
        exp_end_dt = start_dt + pd.Timedelta(days=180)

    try:
        end_dt = pd.to_datetime(comp_str) if comp_str and str(comp_str).strip() and str(comp_str) != "nan" else REFERENCE_DATE
    except Exception:
        end_dt = REFERENCE_DATE

    try:
        sanc_dt = pd.to_datetime(sanc_str) if sanc_str and str(sanc_str) != "nan" else start_dt
    except Exception:
        sanc_dt = start_dt

    actual_execution_days = max(1.0, float((end_dt - start_dt).days))
    delay_days = max(0.0, float((end_dt - exp_end_dt).days))
    project_age_days = max(1.0, float((end_dt - sanc_dt).days))

    return {
        "actual_execution_days": actual_execution_days,
        "delay_days": delay_days,
        "project_age_days": project_age_days
    }


def compute_cohort_benchmarks(projects: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
    """
    Computes hierarchical peer benchmark values (cost deviation, duration deviation,
    progress deviation, cost ratio, duration ratio) with strict self-exclusion,
    identical to TypeScript PeerBenchmarkingService.
    """
    project_meta: Dict[str, Dict[str, Any]] = {}
    for idx, p in enumerate(projects):
        pid = str(p.get("project_id") or f"proj_{idx}")
        sanctioned = float(p.get("sanctioned_amount", 0) or 0)
        actual = float(p.get("actual_expenditure", 0) or 0)
        cost = actual if actual > 0 else sanctioned
        progress = float(p.get("physical_progress_percentage", 0) or 0)
        timeline = calculate_project_timeline(p)

        project_meta[pid] = {
            "project_id": pid,
            "work_type": str(p.get("work_type", "")).strip(),
            "sector": str(p.get("sector", "")).strip(),
            "district": str(p.get("district", "")).strip().lower(),
            "state": str(p.get("state", "")).strip().lower(),
            "cost": cost,
            "progress": progress,
            "execution_duration_days": timeline["actual_execution_days"],
            "delay_days": timeline["delay_days"],
            "project_age_days": timeline["project_age_days"]
        }

    cohort_results: Dict[str, Dict[str, float]] = {}
    for idx, p in enumerate(projects):
        pid = str(p.get("project_id") or f"proj_{idx}")
        m = project_meta[pid]

        # Exclude self from candidate peer pool
        others = [om for opid, om in project_meta.items() if opid != pid]

        # Level 1: same work_type + sector + district (min 3 peers)
        lvl1 = [o for o in others if o["work_type"] == m["work_type"] and o["sector"] == m["sector"] and o["district"] == m["district"]]
        # Level 2: same work_type + sector + state (min 3 peers)
        lvl2 = [o for o in others if o["work_type"] == m["work_type"] and o["sector"] == m["sector"] and o["state"] == m["state"]]
        # Level 3: same work_type + sector (fallback)
        lvl3 = [o for o in others if o["work_type"] == m["work_type"] and o["sector"] == m["sector"]]

        if len(lvl1) >= 3:
            selected = lvl1
        elif len(lvl2) >= 3:
            selected = lvl2
        elif len(lvl3) >= 1:
            selected = lvl3
        elif len(others) >= 1:
            selected = others
        else:
            selected = [m]

        costs = [s["cost"] for s in selected]
        durations = [s["execution_duration_days"] for s in selected]
        progresses = [s["progress"] for s in selected]

        med_cost = float(np.median(costs)) if costs else m["cost"]
        med_dur = float(np.median(durations)) if durations else m["execution_duration_days"]
        med_prog = float(np.median(progresses)) if progresses else 75.0

        cost_dev = round(((m["cost"] - med_cost) / med_cost) * 100.0) if med_cost > 0 else 0.0
        dur_dev = round(((m["execution_duration_days"] - med_dur) / med_dur) * 100.0) if med_dur > 0 else 0.0
        prog_dev = round(m["progress"] - med_prog, 1)

        cost_ratio = round(m["cost"] / med_cost, 4) if med_cost > 0 else 1.0
        dur_ratio = round(m["execution_duration_days"] / med_dur, 4) if med_dur > 0 else 1.0

        sanctioned = float(p.get("sanctioned_amount", 0) or 0)
        estimated = float(p.get("estimated_cost", sanctioned) or sanctioned or 1.0)
        actual = float(p.get("actual_expenditure", 0) or 0)

        exp_ratio = actual / estimated if estimated > 0 else 0.0
        overrun_ratio = (actual - estimated) / estimated if (estimated > 0 and actual > estimated) else 0.0
        exp_progress_gap = max(0.0, (exp_ratio * 100.0) - m["progress"])

        cohort_results[pid] = {
            "delay_days": m["delay_days"],
            "execution_duration_days": m["execution_duration_days"],
            "project_age_days": m["project_age_days"],
            "peer_cost_deviation": cost_dev,
            "peer_duration_deviation": dur_dev,
            "peer_progress_deviation": prog_dev,
            "peer_cost_ratio": cost_ratio,
            "peer_duration_ratio": dur_ratio,
            "expenditure_ratio": exp_ratio,
            "cost_overrun_ratio": overrun_ratio,
            "expenditure_progress_gap": exp_progress_gap
        }

    return cohort_results


class FeaturePipeline:
    def __init__(self):
        self.scaler: RobustScaler = RobustScaler()
        self.feature_names = ISOLATION_FOREST_FEATURES
        self.feature_medians: Dict[str, float] = {}

    def extract_raw_features(self, projects: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Converts project records into a clean numerical DataFrame for Isolation Forest.
        Uses already-computed EngineeredFeatures and hierarchical PeerBenchmark values
        when available (never falling back to default dummy values).
        If raw projects are provided (e.g. during offline training), dynamically constructs
        them using identical hierarchical self-exclusion logic.
        """
        if not projects:
            return pd.DataFrame(columns=self.feature_names)

        # Precalculate cohort benchmarks for any projects missing explicit peer benchmark features
        cohort_benchmarks = compute_cohort_benchmarks(projects)

        rows = []
        for idx, p in enumerate(projects):
            pid = str(p.get("project_id") or f"proj_{idx}")
            computed = cohort_benchmarks.get(pid, {})

            ml_f = p.get("ml_features") if isinstance(p.get("ml_features"), dict) else {}
            pb = p.get("peer_benchmark") if isinstance(p.get("peer_benchmark"), dict) else {}
            feat = p.get("features") if isinstance(p.get("features"), dict) else {}

            # Financial metrics
            sanctioned = float(
                ml_f.get("sanctioned_amount") if "sanctioned_amount" in ml_f
                else p.get("sanctioned_amount", 0) or 0
            )
            estimated = float(
                ml_f.get("estimated_cost") if "estimated_cost" in ml_f
                else p.get("estimated_cost", sanctioned) or sanctioned or 0
            )
            actual = float(
                ml_f.get("actual_expenditure") if "actual_expenditure" in ml_f
                else p.get("actual_expenditure", 0) or 0
            )

            # Expenditure ratio
            if "expenditure_ratio" in ml_f:
                exp_ratio = float(ml_f["expenditure_ratio"])
            elif "expenditure_ratio" in p:
                exp_ratio = float(p["expenditure_ratio"])
            elif "expenditure_ratio" in feat:
                exp_ratio = float(feat["expenditure_ratio"])
            else:
                exp_ratio = float(computed.get("expenditure_ratio", 0.0))

            # Cost overrun ratio
            if "cost_overrun_ratio" in ml_f:
                overrun_ratio = float(ml_f["cost_overrun_ratio"])
            elif "cost_overrun_ratio" in p:
                overrun_ratio = float(p["cost_overrun_ratio"])
            elif "cost_overrun_ratio" in feat:
                overrun_ratio = float(feat["cost_overrun_ratio"])
            else:
                overrun_ratio = float(computed.get("cost_overrun_ratio", 0.0))

            # Physical progress percentage
            progress = float(
                ml_f.get("physical_progress_percentage") if "physical_progress_percentage" in ml_f
                else p.get("physical_progress_percentage", 0) or 0
            )

            # Expenditure progress gap
            if "expenditure_progress_gap" in ml_f:
                exp_progress_gap = float(ml_f["expenditure_progress_gap"])
            elif "expenditure_progress_gap" in p:
                exp_progress_gap = float(p["expenditure_progress_gap"])
            elif "expenditure_progress_gap" in feat:
                exp_progress_gap = float(feat["expenditure_progress_gap"])
            else:
                exp_progress_gap = float(computed.get("expenditure_progress_gap", 0.0))

            # 1. Project Age Days
            if "project_age_days" in ml_f:
                project_age = float(ml_f["project_age_days"])
            elif "project_age_days" in p:
                project_age = float(p["project_age_days"])
            elif "project_age_days" in feat:
                project_age = float(feat["project_age_days"])
            else:
                project_age = float(computed.get("project_age_days", 180.0))

            # 2. Delay Days
            if "delay_days" in ml_f:
                delay_days = float(ml_f["delay_days"])
            elif "delay_days" in p:
                delay_days = float(p["delay_days"])
            elif "delay_days" in feat:
                delay_days = float(feat["delay_days"])
            else:
                delay_days = float(computed.get("delay_days", 0.0))

            # 3. Execution Duration Days
            if "execution_duration_days" in ml_f:
                execution_days = float(ml_f["execution_duration_days"])
            elif "execution_duration_days" in p:
                execution_days = float(p["execution_duration_days"])
            elif "actual_execution_days" in p:
                execution_days = float(p["actual_execution_days"])
            elif "actual_execution_days" in feat:
                execution_days = float(feat["actual_execution_days"])
            else:
                execution_days = float(computed.get("execution_duration_days", 180.0))

            # 4. Peer Cost Deviation
            if "peer_cost_deviation" in ml_f:
                peer_cost_dev = float(ml_f["peer_cost_deviation"])
            elif "peer_cost_deviation" in p:
                peer_cost_dev = float(p["peer_cost_deviation"])
            elif "cost_deviation_pct" in pb:
                peer_cost_dev = float(pb["cost_deviation_pct"])
            elif "deviation_from_peer" in pb:
                peer_cost_dev = float(pb["deviation_from_peer"])
            elif "cost_deviation_pct" in p:
                peer_cost_dev = float(p["cost_deviation_pct"])
            else:
                peer_cost_dev = float(computed.get("peer_cost_deviation", 0.0))

            # 5. Peer Duration Deviation
            if "peer_duration_deviation" in ml_f:
                peer_dur_dev = float(ml_f["peer_duration_deviation"])
            elif "peer_duration_deviation" in p:
                peer_dur_dev = float(p["peer_duration_deviation"])
            elif "duration_deviation_pct" in pb:
                peer_dur_dev = float(pb["duration_deviation_pct"])
            elif "duration_deviation_pct" in p:
                peer_dur_dev = float(p["duration_deviation_pct"])
            else:
                peer_dur_dev = float(computed.get("peer_duration_deviation", 0.0))

            # Beneficiary count
            beneficiaries = float(
                ml_f.get("beneficiary_count") if "beneficiary_count" in ml_f
                else p.get("beneficiary_count", 1000) or 1000
            )

            # Peer Cost Ratio
            if "peer_cost_ratio" in ml_f:
                peer_cost_ratio = float(ml_f["peer_cost_ratio"])
            elif "peer_cost_ratio" in p:
                peer_cost_ratio = float(p["peer_cost_ratio"])
            elif "peer_cost_ratio" in pb:
                peer_cost_ratio = float(pb["peer_cost_ratio"])
            else:
                peer_cost_ratio = float(computed.get("peer_cost_ratio", 1.0))

            # Peer Duration Ratio
            if "peer_duration_ratio" in ml_f:
                peer_duration_ratio = float(ml_f["peer_duration_ratio"])
            elif "peer_duration_ratio" in p:
                peer_duration_ratio = float(p["peer_duration_ratio"])
            elif "peer_duration_ratio" in pb:
                peer_duration_ratio = float(pb["peer_duration_ratio"])
            else:
                peer_duration_ratio = float(computed.get("peer_duration_ratio", 1.0))

            # 6. Peer Progress Deviation
            if "peer_progress_deviation" in ml_f:
                peer_progress_dev = float(ml_f["peer_progress_deviation"])
            elif "peer_progress_deviation" in p:
                peer_progress_dev = float(p["peer_progress_deviation"])
            elif "peer_progress_deviation" in pb:
                peer_progress_dev = float(pb["peer_progress_deviation"])
            else:
                peer_progress_dev = float(computed.get("peer_progress_deviation", 0.0))

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
                median_val = self.feature_medians.get(col, 0.0)
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
