import unittest
import numpy as np
from pathlib import Path
from ml.features.pipeline import FeaturePipeline
from ml.inference.anomaly_detector import AnomalyDetector
from ml.similarity.embeddings import SemanticEmbeddingService
from ml.config.settings import ISOLATION_FOREST_FEATURES, MODEL_PATH

class TestMLComponents(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.detector = AnomalyDetector()
        cls.nlp = SemanticEmbeddingService()

    def test_01_isolation_forest_loaded(self):
        """Test that Isolation Forest model and metadata are properly loaded."""
        self.assertTrue(self.detector.is_loaded, "Isolation Forest model should be loaded")
        self.assertIn("model_name", self.detector.metadata)
        self.assertEqual(len(self.detector.metadata["features"]), len(ISOLATION_FOREST_FEATURES))

    def test_02_anomaly_scoring_bounds(self):
        """Test that anomaly scores are bounded between 0 and 100."""
        sample_projects = [
            {
                "project_id": "TEST-NORMAL",
                "sanctioned_amount": 1500000,
                "estimated_cost": 1500000,
                "actual_expenditure": 1400000,
                "physical_progress_percentage": 90,
                "delay_days": 10,
                "execution_duration_days": 180,
                "beneficiary_count": 2500,
                "peer_benchmark": {
                    "peer_cost_median": 1600000,
                    "peer_duration_median_days": 180,
                    "cost_deviation_pct": -6,
                    "duration_deviation_pct": 0
                }
            },
            {
                "project_id": "TEST-ANOMALY",
                "sanctioned_amount": 9500000,
                "estimated_cost": 9500000,
                "actual_expenditure": 9200000,
                "physical_progress_percentage": 25,
                "delay_days": 450,
                "execution_duration_days": 600,
                "beneficiary_count": 2500,
                "peer_benchmark": {
                    "peer_cost_median": 1600000,
                    "peer_duration_median_days": 180,
                    "cost_deviation_pct": 475,
                    "duration_deviation_pct": 233
                }
            }
        ]
        results = self.detector.predict(sample_projects)
        self.assertEqual(len(results), 2)
        
        for r in results:
            self.assertGreaterEqual(r["anomaly_score"], 0.0)
            self.assertLessEqual(r["anomaly_score"], 100.0)
            self.assertGreaterEqual(r["anomaly_percentile"], 0.0)
            self.assertLessEqual(r["anomaly_percentile"], 100.0)

        normal_res = next(r for r in results if r["project_id"] == "TEST-NORMAL")
        anomaly_res = next(r for r in results if r["project_id"] == "TEST-ANOMALY")
        self.assertGreater(anomaly_res["anomaly_score"], normal_res["anomaly_score"])
        self.assertTrue(anomaly_res["is_ml_anomaly"])
        self.assertGreater(len(anomaly_res["unusual_characteristics"]), 0)

    def test_03_semantic_similarity_ranking(self):
        """Test that semantically related texts rank higher than unrelated texts."""
        base = "Construction of CC Road from Market to Panchayat Bhavan"
        similar = "Construction of Cement Concrete Road to Gram Panchayat"
        unrelated = "Supply and Installation of RO Drinking Water Plant"

        sim_high = self.nlp.compute_similarity(base, similar)
        sim_low = self.nlp.compute_similarity(base, unrelated)

        self.assertGreater(sim_high, sim_low, "Similar descriptions must score higher than unrelated descriptions")
        self.assertGreaterEqual(sim_high, 50.0)

    def test_04_haversine_geospatial_distance(self):
        """Test Haversine distance calculation."""
        lat1, lon1 = 28.6692, 77.4538
        lat2, lon2 = 28.6715, 77.4565
        dist = self.nlp.haversine_distance(lat1, lon1, lat2, lon2)
        self.assertGreater(dist, 0.2)
        self.assertLess(dist, 0.6)

    def test_05_duplicate_candidate_detection(self):
        """Test multi-factor duplicate evaluation combining NLP, distance, work type, district."""
        p1 = {
            "project_id": "DEMO-004",
            "work_name": "Construction of Multipurpose Community Hall at Village Rampur Kalan, Loni Block",
            "district": "Ghaziabad",
            "sector": "Public Amenities",
            "work_type": "Community Hall",
            "sanctioned_amount": 3500000,
            "implementing_agency": "Rural Engineering Services (RES Div-1)",
            "latitude": 28.6692,
            "longitude": 77.4538
        }
        p2 = {
            "project_id": "DEMO-005",
            "work_name": "Construction of Community Hall and Cultural Center at Gram Rampur Kalan",
            "district": "Ghaziabad",
            "sector": "Public Amenities",
            "work_type": "Community Hall",
            "sanctioned_amount": 3400000,
            "implementing_agency": "Zila Parishad Ghaziabad",
            "latitude": 28.6715,
            "longitude": 77.4565
        }
        dup = self.nlp.evaluate_duplicate_pair(p1, p2)
        self.assertIsNotNone(dup)
        self.assertIn("duplicate_score", dup)
        self.assertGreaterEqual(dup["duplicate_score"], 65.0)
        self.assertIn(dup["risk_indicator"], ["Potential Duplicate", "Overlapping Scope"])

if __name__ == "__main__":
    unittest.main()
