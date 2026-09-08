import { Project } from '../types/project.js';

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

export class MLClientService {
  private static readonly ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
  private static isServiceAvailable = false;
  private static lastCheckTime = 0;
  private static cachedHealthInfo: any = null;

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

  public static async analyzeProjects(projects: Project[]): Promise<MLBatchResponse | null> {
    const { isHealthy } = await this.checkHealth();
    if (!isHealthy) {
      return null;
    }

    try {
      const res = await fetch(`${this.ML_BASE_URL}/ml/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects,
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
