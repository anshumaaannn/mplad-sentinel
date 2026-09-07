export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RiskBreakdown {
  financial_risk: number;
  delay_risk: number;
  progress_mismatch_risk: number;
  duplicate_risk: number;
  geospatial_risk: number;
  agency_risk: number;
}

export interface AnomalyEvidence {
  anomaly_type: 'Financial Anomaly' | 'Delay Anomaly' | 'Progress Mismatch' | 'Duplicate Candidate' | 'Geospatial Anomaly' | 'Agency Behavioral Pattern';
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  metric: string;
  observed_value: string | number;
  baseline_value: string | number;
  comparison_group: string;
  deviation: string;
  explanation: string;
  recommended_action: string;
}

export interface PeerBenchmark {
  peer_group_name: string;
  peer_count: number;
  peer_cost_median: number;
  peer_cost_mean: number;
  peer_cost_std: number;
  peer_duration_median_days: number;
  cost_percentile: number;
  cost_deviation_pct: number;
  duration_deviation_pct: number;
  unit_cost_observed?: number;
  unit_cost_peer_median?: number;
}

export interface DuplicateMatch {
  matched_project_id: string;
  matched_work_name: string;
  matched_district: string;
  matched_agency: string;
  matched_sanctioned_amount: number;
  semantic_similarity: number;
  distance_km: number;
  risk_indicator: 'Potential Duplicate' | 'Overlapping Scope' | 'Nearby Similar Work';
  reasons: string[];
}

export interface Project {
  project_id: string;
  work_name: string;
  state: string;
  district: string;
  constituency: string;
  mp_name: string;
  sector: string;
  work_type: string;
  sanctioned_amount: number;
  estimated_cost: number;
  actual_expenditure: number;
  sanction_date: string;
  start_date: string;
  expected_completion_date: string;
  completion_date?: string | null;
  status: 'Completed' | 'In Progress' | 'Stalled' | 'Sanctioned' | 'Cancelled';
  physical_progress_percentage: number;
  implementing_agency: string;
  latitude: number;
  longitude: number;
  beneficiary_count: number;
  unit: string;
  quantity: number;
  risk_score: number;
  risk_level: RiskLevel;
  primary_reason: string;
  risk_breakdown: RiskBreakdown;
  evidences: AnomalyEvidence[];
  peer_benchmark: PeerBenchmark;
  duplicate_candidates: DuplicateMatch[];
}

export interface DataQualitySummary {
  total_projects: number;
  valid_records: number;
  records_requiring_review: number;
  missing_coordinates_count: number;
  missing_completion_dates_count: number;
  data_integrity_score_pct: number;
  last_analyzed_at: string;
}

export interface DashboardSummary {
  total_projects: number;
  total_sanctioned_amount: number;
  total_actual_expenditure: number;
  avg_risk_score: number;
  risk_distribution: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  high_critical_count: number;
  duplicate_candidates_count: number;
  delay_risk_count: number;
  progress_mismatch_count: number;
  financial_anomaly_count: number;
  data_quality: DataQualitySummary;
}

export interface AgencyMetrics {
  agency_name: string;
  total_projects: number;
  total_sanctioned_amount: number;
  total_actual_expenditure: number;
  completed_projects: number;
  in_progress_projects: number;
  stalled_projects: number;
  delayed_projects: number;
  delay_rate_pct: number;
  avg_delay_days: number;
  avg_cost_overrun_pct: number;
  high_risk_projects: number;
  high_risk_rate_pct: number;
  completion_rate_pct: number;
  risk_profile: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  key_observations: string[];
}

export interface DuplicatePair {
  projectA: Project;
  projectB: Project;
  similarity: number;
  distance_km: number;
  risk_level: RiskLevel;
  reasons: string[];
}

export interface SystemConfig {
  weights: {
    financial_weight: number;
    delay_weight: number;
    progress_mismatch_weight: number;
    duplicate_weight: number;
    geospatial_weight: number;
    agency_weight: number;
  };
  thresholds: {
    cost_overrun_threshold_pct: number;
    peer_cost_deviation_threshold_pct: number;
    expenditure_progress_gap_threshold: number;
    delay_days_threshold: number;
    semantic_similarity_threshold: number;
    duplicate_distance_threshold_km: number;
    agency_delay_rate_threshold_pct: number;
  };
}
