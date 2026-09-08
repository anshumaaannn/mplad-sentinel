import type { Project, PeerBenchmark } from '../types/project.js';
import { EngineeredFeatures } from './featureEngineering.service.js';

export type { PeerBenchmark };

export interface PeerGroupStats {
  peer_group_key: string;
  peer_level: 'DISTRICT' | 'STATE' | 'SECTOR';
  peer_group_definition: string;
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
  public static calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  public static calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / values.length);
  }

  public static calculateStdDev(values: number[], mean: number): number {
    if (values.length <= 1) return 0;
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((acc, v) => acc + v, 0) / (values.length - 1);
    return Math.round(Math.sqrt(avgSquareDiff));
  }

  public static calculatePercentile(values: number[], target: number): number {
    if (values.length === 0) return 50;
    const sorted = [...values].sort((a, b) => a - b);
    let count = 0;
    for (const v of sorted) {
      if (v < target) count++;
      else if (v === target) count += 0.5;
    }
    return Math.min(100, Math.max(0, Math.round((count / sorted.length) * 100)));
  }

  /**
   * Pre-computes Level 3 sector::work_type summary groups
   */
  public static computePeerGroups(
    projects: Project[],
    featuresMap: Map<string, EngineeredFeatures>
  ): Map<string, PeerGroupStats> {
    const rawGroups = new Map<string, { costs: number[]; unitCosts: number[]; durations: number[] }>();

    for (const p of projects) {
      const groupKey = `${p.sector}::${p.work_type}`;
      if (!rawGroups.has(groupKey)) {
        rawGroups.set(groupKey, { costs: [], unitCosts: [], durations: [] });
      }
      const g = rawGroups.get(groupKey)!;
      const feat = featuresMap.get(p.project_id);
      const cost = p.actual_expenditure > 0 ? p.actual_expenditure : p.sanctioned_amount;
      g.costs.push(cost);
      if (feat) {
        g.unitCosts.push(feat.unit_cost);
        g.durations.push(feat.actual_execution_days);
      }
    }

    const peerGroups = new Map<string, PeerGroupStats>();
    for (const [key, g] of rawGroups.entries()) {
      const mean = this.calculateMean(g.costs);
      peerGroups.set(key, {
        peer_group_key: key,
        peer_level: 'SECTOR',
        peer_group_definition: `Sector & Work Type Cohort (${key})`,
        count: g.costs.length,
        costs: g.costs,
        unit_costs: g.unitCosts,
        durations: g.durations,
        cost_median: this.calculateMedian(g.costs),
        cost_mean: mean,
        cost_std: this.calculateStdDev(g.costs, mean),
        unit_cost_median: this.calculateMedian(g.unitCosts),
        duration_median: this.calculateMedian(g.durations)
      });
    }

    return peerGroups;
  }

  /**
   * Hierarchical Peer Benchmarking:
   * Level 1: same work_type + sector + district (min 3 peers)
   * Level 2: same work_type + sector + state (min 3 peers)
   * Level 3: same work_type + sector (fallback)
   *
   * Crucially: Excludes the project itself from the candidate peer pool
   * so extreme outliers do not distort their own baseline.
   */
  public static getBenchmarkForProject(
    project: Project,
    features: EngineeredFeatures,
    allProjects: Project[],
    featuresMap?: Map<string, EngineeredFeatures>
  ): PeerBenchmark {
    const projectCost = project.actual_expenditure > 0 ? project.actual_expenditure : project.sanctioned_amount;

    // Self-exclusion filter
    const otherProjects = allProjects.filter(p => p.project_id !== project.project_id);

    // Level 1: same work_type + sector + district
    const level1Peers = otherProjects.filter(p =>
      p.work_type === project.work_type &&
      p.sector === project.sector &&
      p.district.trim().toLowerCase() === project.district.trim().toLowerCase()
    );

    // Level 2: same work_type + sector + state
    const level2Peers = otherProjects.filter(p =>
      p.work_type === project.work_type &&
      p.sector === project.sector &&
      p.state.trim().toLowerCase() === project.state.trim().toLowerCase()
    );

    // Level 3: same work_type + sector
    const level3Peers = otherProjects.filter(p =>
      p.work_type === project.work_type &&
      p.sector === project.sector
    );

    let selectedPeers: Project[];
    let peerLevel: 'DISTRICT' | 'STATE' | 'SECTOR';
    let peerDef: string;

    if (level1Peers.length >= 3) {
      selectedPeers = level1Peers;
      peerLevel = 'DISTRICT';
      peerDef = `${project.work_type} (${project.sector}) in ${project.district} District`;
    } else if (level2Peers.length >= 3) {
      selectedPeers = level2Peers;
      peerLevel = 'STATE';
      peerDef = `${project.work_type} (${project.sector}) across ${project.state} State`;
    } else if (level3Peers.length >= 1) {
      selectedPeers = level3Peers;
      peerLevel = 'SECTOR';
      peerDef = `${project.work_type} (${project.sector}) Nationwide Sector Cohort`;
    } else {
      selectedPeers = otherProjects;
      peerLevel = 'SECTOR';
      peerDef = `All Works Benchmark Pool`;
    }

    const costs = selectedPeers.map(p => p.actual_expenditure > 0 ? p.actual_expenditure : p.sanctioned_amount);
    const durations = selectedPeers.map(p => {
      if (featuresMap && featuresMap.has(p.project_id)) {
        return featuresMap.get(p.project_id)!.actual_execution_days;
      }
      return 180;
    });
    const progresses = selectedPeers.map(p => Number(p.physical_progress_percentage) || 0);

    const medianCost = this.calculateMedian(costs) || projectCost;
    const meanCost = this.calculateMean(costs) || projectCost;
    const stdCost = this.calculateStdDev(costs, meanCost);
    const medianDuration = this.calculateMedian(durations) || 180;
    const medianProgress = this.calculateMedian(progresses);

    const percentile = this.calculatePercentile(costs, projectCost);
    const deviationPct = medianCost > 0
      ? Math.round(((projectCost - medianCost) / medianCost) * 100)
      : 0;

    const durationDeviationPct = medianDuration > 0
      ? Math.round(((features.actual_execution_days - medianDuration) / medianDuration) * 100)
      : 0;

    const peerCostRatio = medianCost > 0 ? Number((projectCost / medianCost).toFixed(4)) : 1.0;
    const peerDurationRatio = medianDuration > 0 ? Number(((features.actual_execution_days || 180) / medianDuration).toFixed(4)) : 1.0;
    const peerProgressDev = Number((project.physical_progress_percentage - medianProgress).toFixed(1));

    return {
      peer_group_name: `${project.sector} • ${project.work_type}`,
      peer_group_definition: peerDef,
      peer_level: peerLevel,
      peer_count: selectedPeers.length,
      peer_cost_median: medianCost,
      peer_cost_mean: meanCost,
      peer_cost_std: stdCost,
      peer_duration_median_days: medianDuration,
      cost_percentile: percentile,
      cost_deviation_pct: deviationPct,
      deviation_from_peer: deviationPct,
      duration_deviation_pct: durationDeviationPct,
      peer_progress_median: medianProgress,
      peer_progress_deviation: peerProgressDev,
      peer_cost_ratio: peerCostRatio,
      peer_duration_ratio: peerDurationRatio
    };
  }
}
