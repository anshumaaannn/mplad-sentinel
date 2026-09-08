export type SectorType =
  | 'Drinking Water & Sanitation'
  | 'Education & School Infrastructure'
  | 'Health & Family Welfare'
  | 'Roads, Bridges & Pathways'
  | 'Community Infrastructure & Public Halls'
  | 'Renewable Energy & Public Lighting'
  | 'Irrigation & Flood Control'
  | 'Sports & Youth Development';

export type WorkType =
  | 'Borewell & Water Purification Unit'
  | 'Piped Drinking Water Supply Scheme'
  | 'School Classroom & Smart Lab Construction'
  | 'Primary Health Centre Ward Modernization'
  | 'Concrete & Interlocking Pavement Road'
  | 'Culvert & Small Span Bridge'
  | 'Multipurpose Community Centre Hall'
  | 'Solar High-Mast Street Light Installation'
  | 'Minor Check Dam & Pond Rejuvenation'
  | 'Public Sports Complex & Gymnasium';

export type ProjectStatus = 'Sanctioned' | 'In Progress' | 'Delayed' | 'Completed' | 'Stalled';

export interface Project {
  project_id: string;
  work_name: string;
  state: string;
  district: string;
  constituency: string;
  mp_name: string;
  sector: SectorType | string;
  work_type: WorkType | string;
  sanctioned_amount: number; // in INR
  estimated_cost: number;
  actual_expenditure: number;
  sanction_date: string; // YYYY-MM-DD
  start_date: string; // YYYY-MM-DD
  expected_completion_date: string; // YYYY-MM-DD
  completion_date?: string | null;
  status: ProjectStatus;
  physical_progress_percentage: number; // 0 - 100
  implementing_agency: string;
  latitude: number;
  longitude: number;
  beneficiary_count: number;
  unit: string;
  quantity: number;
  created_at?: string;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RiskBreakdown {
  financial_risk: number;         // 0 - 25
  delay_risk: number;             // 0 - 20
  progress_mismatch_risk: number; // 0 - 20
  duplicate_risk: number;         // 0 - 15
  geospatial_risk: number;        // 0 - 10
  agency_risk: number;            // 0 - 10
}

export interface AnomalyEvidence {
  id?: string;
  anomaly_type: 'Financial Anomaly' | 'Delay Anomaly' | 'Progress Mismatch' | 'Duplicate Candidate' | 'Geospatial Anomaly' | 'Agency Behavioral Pattern' | 'ML Anomaly Signal' | string;
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
  peer_group_definition: string;
  peer_level: 'DISTRICT' | 'STATE' | 'SECTOR';
  peer_count: number;
  peer_cost_median: number;
  peer_cost_mean: number;
  peer_cost_std: number;
  peer_duration_median_days: number;
  cost_percentile: number;
  cost_deviation_pct: number;
  deviation_from_peer: number;
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
  semantic_similarity: number; // 0 - 100 %
  distance_km: number;
  risk_indicator: 'Potential Duplicate' | 'Overlapping Scope' | 'Requires Verification';
  reasons: string[];
}

export interface MLUnusualCharacteristic {
  metric: string;
  observed: string;
  deviation: string;
  description: string;
}

export interface ProjectRiskAnalysis {
  project_id: string;
  risk_score: number; // 0 - 100
  risk_level: RiskLevel;
  primary_reason: string;
  risk_breakdown: RiskBreakdown;
  evidences: AnomalyEvidence[];
  peer_benchmark: PeerBenchmark;
  duplicate_candidates: DuplicateMatch[];
  features: Record<string, number | string>;
  analyzed_at: string;
  // ML signals
  ml_anomaly_score?: number;
  ml_anomaly_percentile?: number;
  is_ml_anomaly?: boolean;
  ml_unusual_characteristics?: MLUnusualCharacteristic[];
  ml_status?: 'ACTIVE' | 'FALLBACK';
}

export interface EnrichedProject extends Project {
  risk_score: number;
  risk_level: RiskLevel;
  primary_reason: string;
  risk_breakdown: RiskBreakdown;
  evidences: AnomalyEvidence[];
  peer_benchmark: PeerBenchmark;
  duplicate_candidates: DuplicateMatch[];
  // ML signals
  ml_anomaly_score?: number;
  ml_anomaly_percentile?: number;
  is_ml_anomaly?: boolean;
  ml_unusual_characteristics?: MLUnusualCharacteristic[];
  ml_status?: 'ACTIVE' | 'FALLBACK';
}
