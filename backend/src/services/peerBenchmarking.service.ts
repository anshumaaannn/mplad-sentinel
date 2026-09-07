import { Project, PeerBenchmark } from '../types/project.js';
import { FeatureEngineeringService, EngineeredFeatures } from './featureEngineering.service.js';

export interface PeerGroupStats {
  peer_group_key: string;
  count: number;
  costs: number[];
  unit_costs: number[];
  durations: number[];
  cost_median: number;
  cost_mean: number;
  cost_std: number;
  unit_cost_median: number;
  duration_median: number;
}

export class PeerBenchmarkingService {
  private static calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private static calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  private static calculateStdDev(values: number[], mean: number): number {
    if (values.length <= 1) return 0;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private static calculatePercentile(values: number[], value: number): number {
    if (values.length === 0) return 50;
    const countBelow = values.filter(v => v < value).length;
    const countEqual = values.filter(v => v === value).length;
    return Math.round(((countBelow + 0.5 * countEqual) / values.length) * 100);
  }

  public static computePeerGroups(projects: Project[], featuresMap: Map<string, EngineeredFeatures>): Map<string, PeerGroupStats> {
    const rawGroups = new Map<string, { costs: number[]; unit_costs: number[]; durations: number[] }>();

    for (const p of projects) {
      const groupKey = `${p.sector}::${p.work_type}`;
      if (!rawGroups.has(groupKey)) {
        rawGroups.set(groupKey, { costs: [], unit_costs: [], durations: [] });
      }
      const group = rawGroups.get(groupKey)!;
      const feat = featuresMap.get(p.project_id);
      
      group.costs.push(p.actual_expenditure > 0 ? p.actual_expenditure : p.sanctioned_amount);
      if (feat) {
        group.unit_costs.push(feat.unit_cost);
        group.durations.push(feat.actual_execution_days);
      }
    }

    const peerStatsMap = new Map<string, PeerGroupStats>();

    for (const [key, data] of rawGroups.entries()) {
      const cost_median = this.calculateMedian(data.costs);
      const cost_mean = this.calculateMean(data.costs);
      const cost_std = this.calculateStdDev(data.costs, cost_mean);
      const unit_cost_median = this.calculateMedian(data.unit_costs);
      const duration_median = this.calculateMedian(data.durations);

      peerStatsMap.set(key, {
        peer_group_key: key,
        count: data.costs.length,
        costs: data.costs,
        unit_costs: data.unit_costs,
        durations: data.durations,
        cost_median,
        cost_mean,
        cost_std,
        unit_cost_median,
        duration_median
      });
    }

    return peerStatsMap;
  }

  public static getBenchmarkForProject(
    project: Project,
    features: EngineeredFeatures,
    peerGroups: Map<string, PeerGroupStats>
  ): PeerBenchmark {
    const groupKey = `${project.sector}::${project.work_type}`;
    const stats = peerGroups.get(groupKey) || {
      peer_group_key: groupKey,
      count: 1,
      costs: [project.sanctioned_amount],
      unit_costs: [features.unit_cost],
      durations: [features.actual_execution_days],
      cost_median: project.sanctioned_amount,
      cost_mean: project.sanctioned_amount,
      cost_std: 0,
      unit_cost_median: features.unit_cost,
      duration_median: features.actual_execution_days
    };

    const observedCost = project.actual_expenditure > 0 ? project.actual_expenditure : project.sanctioned_amount;
    const cost_percentile = this.calculatePercentile(stats.costs, observedCost);
    const cost_deviation_pct = stats.cost_median > 0 
      ? Math.round(((observedCost - stats.cost_median) / stats.cost_median) * 100)
      : 0;

    const duration_deviation_pct = stats.duration_median > 0
      ? Math.round(((features.actual_execution_days - stats.duration_median) / stats.duration_median) * 100)
      : 0;

    return {
      peer_group_name: `${project.work_type} (${project.sector})`,
      peer_count: stats.count,
      peer_cost_median: stats.cost_median,
      peer_cost_mean: stats.cost_mean,
      peer_cost_std: Math.round(stats.cost_std),
      peer_duration_median_days: stats.duration_median,
      cost_percentile,
      cost_deviation_pct,
      duration_deviation_pct,
      unit_cost_observed: Math.round(features.unit_cost),
      unit_cost_peer_median: Math.round(stats.unit_cost_median)
    };
  }
}
