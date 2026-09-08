import { Project, PeerBenchmark } from '../types/project.js';
import { EngineeredFeatures, FeatureEngineeringService } from './featureEngineering.service.js';
import { PeerBenchmarkingService } from './peerBenchmarking.service.js';

export interface MLAnomalyResult {
  project_id: string;
  anomaly_score: number;
  anomaly_percentile: number;
  is_ml_anomaly: boolean;
  unusual_characteristics: Array<{
    metric: string;
    observed: string;
    deviation: string;
    description: string;
  }>;
  model_status: 'ACTIVE' | 'FALLBACK';
}

export interface MLDuplicateMatch {
  projectA: any;
  projectB: any;
  similarity: number;
  distance_km: number;
  duplicate_score: number;
  risk_level: string;
  risk_indicator: 'Potential Duplicate' | 'Overlapping Scope' | 'Requires Verification';
  reasons: string[];
}

export interface MLBatchResponse {
  success: boolean;
  total_projects: number;
  ml_engine: {
    isolation_forest_active: boolean;
    sentence_transformers_active: boolean;
  };
  anomalies: Record<string, MLAnomalyResult>;
  duplicate_pairs: MLDuplicateMatch[];
  duplicate_count: number;
}

/**
 * Explicit 16-feature input vector contract matching Python Isolation Forest
 */
export interface MLFeatureInput {
  sanctioned_amount: number;
  estimated_cost: number;
  actual_expenditure: number;
  expenditure_ratio: number;
  cost_overrun_ratio: number;
  physical_progress_percentage: number;
  expenditure_progress_gap: number;
  project_age_days: number;
  delay_days: number;
  execution_duration_days: number;
  peer_cost_deviation: number;
  peer_duration_deviation: number;
  beneficiary_count: number;
  peer_cost_ratio: number;
  peer_duration_ratio: number;
  peer_progress_deviation: number;
}

export interface EnrichedMLProjectPayload extends Project {
  features?: EngineeredFeatures;
  peer_benchmark?: PeerBenchmark;
  ml_features: MLFeatureInput;
  delay_days: number;
  execution_duration_days: number;
  project_age_days: number;
  peer_cost_deviation: number;
  peer_duration_deviation: number;
  peer_progress_deviation: number;
  peer_cost_ratio: number;
  peer_duration_ratio: number;
  expenditure_ratio: number;
  cost_overrun_ratio: number;
  expenditure_progress_gap: number;
}

export class MLClientService {
  private static readonly ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
  private static isServiceAvailable = false;
  private static lastCheckTime = 0;
  private static cachedHealthInfo: any = null;

  /**
   * Explicitly transforms already-computed EngineeredFeatures and hierarchical PeerBenchmark
   * into the exact 16-feature ML input vector expected by Python Isolation Forest.
   */
  public static transformToMLFeatures(
    project: Project,
    features: EngineeredFeatures,
    peerBenchmark: PeerBenchmark
  ): MLFeatureInput {
    const sanctioned = Number(project.sanctioned_amount) || 0;
    const estimated = Number(project.estimated_cost) || sanctioned || 0;
    const actual = Number(project.actual_expenditure) || 0;
    const cost = actual > 0 ? actual : sanctioned;

    const peerCostMedian = Number(peerBenchmark.peer_cost_median) || cost || 1;
    const peerDurationMedian = Number(peerBenchmark.peer_duration_median_days) || 180 || 1;
    const peerProgressMedian = peerBenchmark.peer_progress_median !== undefined
      ? Number(peerBenchmark.peer_progress_median)
      : 75;

    const peerCostRatio = peerBenchmark.peer_cost_ratio !== undefined
      ? Number(peerBenchmark.peer_cost_ratio)
      : (peerCostMedian > 0 ? Number((cost / peerCostMedian).toFixed(4)) : 1.0);

    const peerDurationRatio = peerBenchmark.peer_duration_ratio !== undefined
      ? Number(peerBenchmark.peer_duration_ratio)
      : (peerDurationMedian > 0 ? Number(((features.actual_execution_days || 180) / peerDurationMedian).toFixed(4)) : 1.0);

    const peerProgressDev = peerBenchmark.peer_progress_deviation !== undefined
      ? Number(peerBenchmark.peer_progress_deviation)
      : Number(((project.physical_progress_percentage || 0) - peerProgressMedian).toFixed(2));

    const projectAge = features.project_age_days !== undefined
      ? Number(features.project_age_days)
      : (features.actual_execution_days || 180);

    return {
      sanctioned_amount: sanctioned,
      estimated_cost: estimated,
      actual_expenditure: actual,
      expenditure_ratio: Number(features.expenditure_ratio) || 0,
      cost_overrun_ratio: Number(features.cost_overrun_ratio) || 0,
      physical_progress_percentage: Number(project.physical_progress_percentage) || 0,
      expenditure_progress_gap: Number(features.expenditure_progress_gap) || 0,
      project_age_days: projectAge,
      delay_days: Number(features.delay_days) || 0,
      execution_duration_days: Number(features.actual_execution_days) || 180,
      peer_cost_deviation: Number(peerBenchmark.cost_deviation_pct) || 0,
      peer_duration_deviation: Number(peerBenchmark.duration_deviation_pct) || 0,
      beneficiary_count: Number(project.beneficiary_count) || 1000,
      peer_cost_ratio: peerCostRatio,
      peer_duration_ratio: peerDurationRatio,
      peer_progress_deviation: peerProgressDev
    };
  }

  public static async checkHealth(): Promise<{ isHealthy: boolean; info?: any }> {
    const now = Date.now();
    // Cache health check for 5 seconds
    if (now - this.lastCheckTime < 5000 && this.cachedHealthInfo) {
      return { isHealthy: this.isServiceAvailable, info: this.cachedHealthInfo };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.ML_BASE_URL}/ml/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.isServiceAvailable = true;
        this.cachedHealthInfo = data;
        this.lastCheckTime = now;
        return { isHealthy: true, info: data };
      }
    } catch {
      // Fallback
    }

    this.isServiceAvailable = false;
    this.cachedHealthInfo = null;
    this.lastCheckTime = now;
    console.log('[MLClient] ML service unavailable — running rule/statistical fallback.');
    return { isHealthy: false };
  }

  public static async getModelInfo(): Promise<any> {
    try {
      const res = await fetch(`${this.ML_BASE_URL}/ml/model-info`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return null;
  }

  public static async analyzeProjects(
    projects: Array<Project | EnrichedMLProjectPayload>
  ): Promise<MLBatchResponse | null> {
    const { isHealthy } = await this.checkHealth();
    if (!isHealthy) {
      return null;
    }

    try {
      // Ensure all projects carry the explicit 16-feature transform without fallback defaults
      const transformedPayload = projects.map(p => {
        if ('ml_features' in p && p.ml_features) {
          return p;
        }

        const feat = FeatureEngineeringService.extractFeatures(p);
        const benchmark = PeerBenchmarkingService.getBenchmarkForProject(p, feat, projects as Project[]);
        const mlFeatures = this.transformToMLFeatures(p, feat, benchmark);

        return {
          ...p,
          features: feat,
          peer_benchmark: benchmark,
          ml_features: mlFeatures,
          delay_days: mlFeatures.delay_days,
          execution_duration_days: mlFeatures.execution_duration_days,
          project_age_days: mlFeatures.project_age_days,
          peer_cost_deviation: mlFeatures.peer_cost_deviation,
          peer_duration_deviation: mlFeatures.peer_duration_deviation,
          peer_progress_deviation: mlFeatures.peer_progress_deviation,
          peer_cost_ratio: mlFeatures.peer_cost_ratio,
          peer_duration_ratio: mlFeatures.peer_duration_ratio,
          expenditure_ratio: mlFeatures.expenditure_ratio,
          cost_overrun_ratio: mlFeatures.cost_overrun_ratio,
          expenditure_progress_gap: mlFeatures.expenditure_progress_gap
        };
      });

      const res = await fetch(`${this.ML_BASE_URL}/ml/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: transformedPayload,
          find_duplicates: true
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (res.ok) {
        const data = (await res.json()) as MLBatchResponse;
        return data;
      }
    } catch (err) {
      console.warn('[MLClient] Error calling /ml/analyze, activating fallback:', err);
    }

    return null;
  }
}
