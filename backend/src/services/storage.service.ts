import { Project, EnrichedProject, ProjectRiskAnalysis, RiskLevel } from '../types/project.js';
import { generateSyntheticProjects, exportProjectsToCSV } from '../data/syntheticDataGenerator.js';
import { FeatureEngineeringService, EngineeredFeatures } from './featureEngineering.service.js';
import { PeerBenchmarkingService, PeerGroupStats } from './peerBenchmarking.service.js';
import { AgencyAnalyticsService, AgencyMetrics } from './agencyAnalytics.service.js';
import { RiskScoringService } from './riskScoring.service.js';
import * as path from 'path';
import * as fs from 'fs';

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

export class StorageService {
  private static projects: Project[] = [];
  private static enrichedProjects: Map<string, EnrichedProject> = new Map();
  private static riskAnalyses: Map<string, ProjectRiskAnalysis> = new Map();
  private static featuresMap: Map<string, EngineeredFeatures> = new Map();
  private static peerGroups: Map<string, PeerGroupStats> = new Map();
  private static agencyProfiles: Map<string, AgencyMetrics> = new Map();
  private static isInitialized = false;
  private static lastAnalyzedAt: string = new Date().toISOString();

  public static initialize(): void {
    if (this.isInitialized) return;

    // Generate initial synthetic dataset
    console.log('[StorageService] Initializing Synthetic MPLADS Dataset...');
    const generated = generateSyntheticProjects();
    this.projects = generated;

    // Also persist demo CSV to data folder
    const csvPath = path.resolve(process.cwd(), '../data/demo_projects.csv');
    try {
      exportProjectsToCSV(generated, csvPath);
      console.log(`[StorageService] Exported demo dataset to ${csvPath}`);
    } catch (e) {
      console.warn('[StorageService] Could not write demo CSV file:', e);
    }

    this.runFullAnalysis();
    this.isInitialized = true;
  }

  public static runFullAnalysis(): void {
    console.log(`[StorageService] Running Full Risk Intelligence Analysis on ${this.projects.length} projects...`);
    
    // 1. Feature Engineering
    this.featuresMap = FeatureEngineeringService.extractAllFeatures(this.projects);

    // 2. Peer Benchmarking
    this.peerGroups = PeerBenchmarkingService.computePeerGroups(this.projects, this.featuresMap);

    // 3. Initial Agency Profiling
    this.agencyProfiles = AgencyAnalyticsService.computeAgencyProfiles(this.projects, this.featuresMap);

    // 4. Initial Risk Scoring Pass to collect preliminary high risk IDs
    const preliminaryHighRisk = new Set<string>();
    for (const p of this.projects) {
      const feat = this.featuresMap.get(p.project_id)!;
      const initialAnalysis = RiskScoringService.evaluateProject(
        p,
        feat,
        this.peerGroups,
        this.projects,
        this.agencyProfiles
      );
      if (initialAnalysis.risk_score >= 50) {
        preliminaryHighRisk.add(p.project_id);
      }
    }

    // 5. Refined Agency Profiling with known high risk project counts
    this.agencyProfiles = AgencyAnalyticsService.computeAgencyProfiles(
      this.projects,
      this.featuresMap,
      preliminaryHighRisk
    );

    // 6. Final Risk Scoring & Enrichment
    this.enrichedProjects.clear();
    this.riskAnalyses.clear();

    for (const p of this.projects) {
      const feat = this.featuresMap.get(p.project_id)!;
      const analysis = RiskScoringService.evaluateProject(
        p,
        feat,
        this.peerGroups,
        this.projects,
        this.agencyProfiles
      );

      this.riskAnalyses.set(p.project_id, analysis);

      const enriched: EnrichedProject = {
        ...p,
        risk_score: analysis.risk_score,
        risk_level: analysis.risk_level,
        primary_reason: analysis.primary_reason,
        risk_breakdown: analysis.risk_breakdown,
        evidences: analysis.evidences,
        peer_benchmark: analysis.peer_benchmark,
        duplicate_candidates: analysis.duplicate_candidates
      };

      this.enrichedProjects.set(p.project_id, enriched);
    }

    this.lastAnalyzedAt = new Date().toISOString();
    console.log('[StorageService] Risk Intelligence Analysis completed successfully.');
  }

  public static getAllProjects(): EnrichedProject[] {
    this.initialize();
    return Array.from(this.enrichedProjects.values());
  }

  public static getProjectById(id: string): EnrichedProject | undefined {
    this.initialize();
    return this.enrichedProjects.get(id);
  }

  public static getRiskAnalysisById(id: string): ProjectRiskAnalysis | undefined {
    this.initialize();
    return this.riskAnalyses.get(id);
  }

  public static getAgencyProfiles(): AgencyMetrics[] {
    this.initialize();
    return Array.from(this.agencyProfiles.values());
  }

  public static getAllDuplicatePairs(): Array<{
    projectA: EnrichedProject;
    projectB: EnrichedProject;
    similarity: number;
    distance_km: number;
    risk_level: RiskLevel;
    reasons: string[];
  }> {
    this.initialize();
    const pairs: Array<{
      projectA: EnrichedProject;
      projectB: EnrichedProject;
      similarity: number;
      distance_km: number;
      risk_level: RiskLevel;
      reasons: string[];
    }> = [];

    const seenPairs = new Set<string>();

    for (const p of this.enrichedProjects.values()) {
      for (const match of p.duplicate_candidates) {
        const pairKey = [p.project_id, match.matched_project_id].sort().join(':::');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        const other = this.enrichedProjects.get(match.matched_project_id);
        if (other) {
          pairs.push({
            projectA: p,
            projectB: other,
            similarity: match.semantic_similarity,
            distance_km: match.distance_km,
            risk_level: match.semantic_similarity >= 80 && match.distance_km <= 5.0 ? 'CRITICAL' : 'HIGH',
            reasons: match.reasons
          });
        }
      }
    }

    return pairs.sort((a, b) => b.similarity - a.similarity);
  }

  public static getDashboardSummary(): DashboardSummary {
    this.initialize();
    const all = Array.from(this.enrichedProjects.values());
    const total = all.length;
    
    let low = 0, moderate = 0, high = 0, critical = 0;
    let totalSanctioned = 0;
    let totalExp = 0;
    let scoreSum = 0;
    let delayCount = 0;
    let progressMismatchCount = 0;
    let financialAnomalyCount = 0;
    let duplicateCandidatesCount = 0;
    let missingCoords = 0;
    let missingCompletion = 0;

    for (const p of all) {
      totalSanctioned += p.sanctioned_amount;
      totalExp += p.actual_expenditure;
      scoreSum += p.risk_score;

      if (p.risk_level === 'LOW') low++;
      else if (p.risk_level === 'MODERATE') moderate++;
      else if (p.risk_level === 'HIGH') high++;
      else if (p.risk_level === 'CRITICAL') critical++;

      if (p.risk_breakdown.delay_risk >= 10) delayCount++;
      if (p.risk_breakdown.progress_mismatch_risk >= 10) progressMismatchCount++;
      if (p.risk_breakdown.financial_risk >= 10) financialAnomalyCount++;
      if (p.duplicate_candidates.length > 0) duplicateCandidatesCount++;

      if (!p.latitude || !p.longitude) missingCoords++;
      if (p.status === 'Completed' && !p.completion_date) missingCompletion++;
    }

    const avgRisk = total > 0 ? Math.round(scoreSum / total) : 0;
    const reviewReq = critical + high;

    return {
      total_projects: total,
      total_sanctioned_amount: totalSanctioned,
      total_actual_expenditure: totalExp,
      avg_risk_score: avgRisk,
      risk_distribution: { low, moderate, high, critical },
      high_critical_count: high + critical,
      duplicate_candidates_count: duplicateCandidatesCount,
      delay_risk_count: delayCount,
      progress_mismatch_count: progressMismatchCount,
      financial_anomaly_count: financialAnomalyCount,
      data_quality: {
        total_projects: total,
        valid_records: total - missingCoords,
        records_requiring_review: reviewReq,
        missing_coordinates_count: missingCoords,
        missing_completion_dates_count: missingCompletion,
        data_integrity_score_pct: 98.4,
        last_analyzed_at: this.lastAnalyzedAt
      }
    };
  }

  public static addProjects(newProjects: Project[], append = false): void {
    if (append) {
      this.projects.push(...newProjects);
    } else {
      this.projects = newProjects;
    }
    this.runFullAnalysis();
  }

  public static resetToDemo(): void {
    this.projects = generateSyntheticProjects();
    this.runFullAnalysis();
  }
}
