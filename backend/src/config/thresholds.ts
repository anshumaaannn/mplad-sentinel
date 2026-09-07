export interface RiskWeightsConfig {
  financial_weight: number;       // default 25
  delay_weight: number;           // default 20
  progress_mismatch_weight: number; // default 20
  duplicate_weight: number;       // default 15
  geospatial_weight: number;      // default 10
  agency_weight: number;          // default 10
}

export interface RiskThresholdsConfig {
  cost_overrun_threshold_pct: number;      // e.g. 15% overrun flags financial risk
  peer_cost_deviation_threshold_pct: number;// e.g. 50% above peer median flags anomaly
  expenditure_progress_gap_threshold: number; // e.g. 35% difference (expenditure% - progress%)
  delay_days_threshold: number;            // e.g. 90 days past expected completion
  semantic_similarity_threshold: number;   // e.g. 75% NLP similarity
  duplicate_distance_threshold_km: number; // e.g. 5.0 km
  agency_delay_rate_threshold_pct: number; // e.g. 40% of agency projects delayed
}

export interface SystemConfig {
  weights: RiskWeightsConfig;
  thresholds: RiskThresholdsConfig;
}

export const DEFAULT_CONFIG: SystemConfig = {
  weights: {
    financial_weight: 25,
    delay_weight: 20,
    progress_mismatch_weight: 20,
    duplicate_weight: 15,
    geospatial_weight: 10,
    agency_weight: 10,
  },
  thresholds: {
    cost_overrun_threshold_pct: 15,
    peer_cost_deviation_threshold_pct: 45,
    expenditure_progress_gap_threshold: 30,
    delay_days_threshold: 60,
    semantic_similarity_threshold: 72,
    duplicate_distance_threshold_km: 5.0,
    agency_delay_rate_threshold_pct: 35,
  }
};

let currentConfig: SystemConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

export function getSystemConfig(): SystemConfig {
  return currentConfig;
}

export function updateSystemConfig(newConfig: Partial<SystemConfig>): SystemConfig {
  if (newConfig.weights) {
    currentConfig.weights = { ...currentConfig.weights, ...newConfig.weights };
  }
  if (newConfig.thresholds) {
    currentConfig.thresholds = { ...currentConfig.thresholds, ...newConfig.thresholds };
  }
  return currentConfig;
}

export function resetSystemConfig(): SystemConfig {
  currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  return currentConfig;
}
