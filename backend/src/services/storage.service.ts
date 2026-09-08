import {
  Project,
  EnrichedProject,
  ProjectRiskAnalysis,
  RiskLevel,
  DuplicateMatch
} from '../types/project.js';
import { generateSyntheticProjects } from '../data/syntheticDataGenerator.js';
import { FeatureEngineeringService, EngineeredFeatures } from './featureEngineering.service.js';
import { PeerBenchmarkingService, PeerGroupStats } from './peerBenchmarking.service.js';
import { AgencyAnalyticsService, AgencyMetrics } from './agencyAnalytics.service.js';
import { RiskScoringService } from './riskScoring.service.js';
import { MLClientService, MLAnomalyResult, MLBatchResponse } from './mlClient.service.js';
import fs from 'fs';
import path from 'path';

export interface DataQualitySummary {
  total_projects: number;
  valid_records: number;
  invalid_records: number;
  records_requiring_review: number;
  missing_coordinates_count: number;
  missing_completion_dates_count: number;
  missing_required_fields_count: number;
  data_integrity_score_pct: number;
  last_analyzed_at: string;
}

export interface MLEngineInfo {
  isolation_forest_status: 'Active' | 'Fallback';
  sentence_transformers_status: 'Active' | 'Fallback';
  peer_benchmarking_status: 'Active';
  rule_engine_status: 'Active';
  model_version: string;
  training_records: number;
  ml_anomalies_count: number;
  duplicate_candidates_count: number;
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
  ml_engine?: MLEngineInfo;
}

export class StorageService {
  private static projects: Project[] = [];
  private static enrichedProjects: Map<string, EnrichedProject> = new Map();
  private static riskAnalyses: Map<string, ProjectRiskAnalysis> = new Map();
  private static featuresMap: Map<string, EngineeredFeatures> = new Map();
  private static peerGroups: Map<string, PeerGroupStats> = new Map();
  private static agencyProfiles: Map<string, AgencyMetrics> = new Map();
  private static isInitialized = false;
  private static isMLActive = false;
  private static lastAnalyzedAt: string = new Date().toISOString();
  private static mlAnomalyMap: Map<string, MLAnomalyResult> = new Map();
  private static mlDuplicateCandidates: Map<string, DuplicateMatch[]> = new Map();

  public static initialize(): void {
    if (this.isInitialized) return;

    // Generate initial synthetic dataset
    console.log('[StorageService] Initializing Synthetic MPLADS Dataset...');
    const generated = generateSyntheticProjects();
    this.projects = generated;

    // Also persist demo CSV to data folder
    const csvPath = path.resolve(process.cwd(), '../data/demo_projects.csv');
    try {
      if (!fs.existsSync(path.dirname(csvPath))) {
        fs.mkdirSync(path.dirname(csvPath), { recursive: true });
      }
      const header = 'project_id,work_name,sector,work_type,state,district,constituency,mp_name,sanction_date,start_date,expected_completion_date,completion_date,status,sanctioned_amount,estimated_cost,actual_expenditure,physical_progress_percentage,implementing_agency,beneficiary_count,latitude,longitude\n';
      const rows = generated.map(p =>
        `"${p.project_id}","${p.work_name.replace(/"/g, '""')}","${p.sector}","${p.work_type}","${p.state}","${p.district}","${p.constituency}","${p.mp_name}","${p.sanction_date}","${p.start_date}","${p.expected_completion_date}","${p.completion_date || ''}","${p.status}",${p.sanctioned_amount},${p.estimated_cost},${p.actual_expenditure},${p.physical_progress_percentage},"${p.implementing_agency}",${p.beneficiary_count},${p.latitude},${p.longitude}`
      ).join('\n');
      fs.writeFileSync(csvPath, header + rows, 'utf8');
      console.log(`[StorageService] Exported demo dataset to ${csvPath}`);
    } catch {
      // Ignore write errors if running in constrained container
    }

    this.runFullAnalysis();
    this.isInitialized = true;

    // Trigger asynchronous ML analytics pass in the background
    this.triggerMLAnalysis().catch(err => {
      console.warn('[StorageService] Background ML pass initialized in fallback mode:', err.message);
    });
  }

  public static async triggerMLAnalysis(): Promise<void> {
    try {
      const mlResponse = await MLClientService.analyzeProjects(this.projects);
      if (mlResponse && mlResponse.success) {
        this.isMLActive = true;
        this.applyMLResults(mlResponse);
        console.log(`[StorageService] Applied Python ML signals to ${this.projects.length} projects (ML Active)`);
      } else {
        this.isMLActive = false;
        console.log('[StorageService] Python ML service not active — running rule/statistical fallback.');
      }
    } catch (err: any) {
      this.isMLActive = false;
      console.warn('[StorageService] ML analysis fallback:', err.message);
    }
  }

  private static applyMLResults(mlResponse: MLBatchResponse): void {
    this.mlAnomalyMap.clear();
    this.mlDuplicateCandidates.clear();

    if (mlResponse.anomalies) {
      for (const [id, res] of Object.entries(mlResponse.anomalies)) {
        this.mlAnomalyMap.set(id, res);
      }
    }

    if (mlResponse.duplicate_pairs) {
      for (const pair of mlResponse.duplicate_pairs) {
        const p1Id = pair.projectA.project_id;
        const p2Id = pair.projectB.project_id;

        const matchForP1: DuplicateMatch = {
          matched_project_id: p2Id,
          matched_work_name: pair.projectB.work_name,
          matched_district: pair.projectB.district,
          matched_agency: pair.projectB.implementing_agency,
          matched_sanctioned_amount: pair.projectB.sanctioned_amount,
          semantic_similarity: pair.similarity,
          distance_km: pair.distance_km,
          risk_indicator: pair.risk_indicator,
          reasons: pair.reasons
        };

        const existingP1 = this.mlDuplicateCandidates.get(p1Id) || [];
        existingP1.push(matchForP1);
        this.mlDuplicateCandidates.set(p1Id, existingP1);

        const matchForP2: DuplicateMatch = {
          matched_project_id: p1Id,
          matched_work_name: pair.projectA.work_name,
          matched_district: pair.projectA.district,
          matched_agency: pair.projectA.implementing_agency,
          matched_sanctioned_amount: pair.projectA.sanctioned_amount,
          semantic_similarity: pair.similarity,
          distance_km: pair.distance_km,
          risk_indicator: pair.risk_indicator,
          reasons: pair.reasons
        };

        const existingP2 = this.mlDuplicateCandidates.get(p2Id) || [];
        existingP2.push(matchForP2);
        this.mlDuplicateCandidates.set(p2Id, existingP2);
      }
    }

    // Re-evaluate projects with ML signals incorporated
    for (const p of this.projects) {
      const feat = this.featuresMap.get(p.project_id)!;
      const mlRes = this.mlAnomalyMap.get(p.project_id);
      const mlDups = this.mlDuplicateCandidates.get(p.project_id);

      const analysis = RiskScoringService.evaluateProject(
        p,
        feat,
        this.projects,
        this.featuresMap,
        this.agencyProfiles,
        mlRes,
        mlDups
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
        duplicate_candidates: analysis.duplicate_candidates,
        ml_anomaly_score: analysis.ml_anomaly_score,
        ml_anomaly_percentile: analysis.ml_anomaly_percentile,
        is_ml_anomaly: analysis.is_ml_anomaly,
        ml_unusual_characteristics: analysis.ml_unusual_characteristics,
        ml_status: analysis.ml_status
      };

      this.enrichedProjects.set(p.project_id, enriched);
    }
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
        this.projects,
        this.featuresMap,
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

    // 6. Final Risk Scoring & Enrichment (Deterministic pass)
    this.enrichedProjects.clear();
    this.riskAnalyses.clear();

    for (const p of this.projects) {
      const feat = this.featuresMap.get(p.project_id)!;
      const mlRes = this.mlAnomalyMap.get(p.project_id);
      const mlDups = this.mlDuplicateCandidates.get(p.project_id);

      const analysis = RiskScoringService.evaluateProject(
        p,
        feat,
        this.projects,
        this.featuresMap,
        this.agencyProfiles,
        mlRes,
        mlDups
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
        duplicate_candidates: analysis.duplicate_candidates,
        ml_anomaly_score: analysis.ml_anomaly_score,
        ml_anomaly_percentile: analysis.ml_anomaly_percentile,
        is_ml_anomaly: analysis.is_ml_anomaly,
        ml_unusual_characteristics: analysis.ml_unusual_characteristics,
        ml_status: analysis.ml_status
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
      if (p.duplicate_candidates && p.duplicate_candidates.length > 0) {
        for (const match of p.duplicate_candidates) {
          const other = this.enrichedProjects.get(match.matched_project_id);
          if (other) {
            const pairKey = [p.project_id, other.project_id].sort().join(':::');
            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              pairs.push({
                projectA: p,
                projectB: other,
                similarity: match.semantic_similarity,
                distance_km: match.distance_km,
                risk_level: match.semantic_similarity >= 75 ? 'CRITICAL' : 'HIGH',
                reasons: match.reasons
              });
            }
          }
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
    let mlAnomaliesCount = 0;

    // Actual Data Quality Counters
    let missingCoords = 0;
    let missingCompletion = 0;
    let missingRequiredFields = 0;
    let invalidRecords = 0;
    let totalChecksPassed = 0;
    const CHECKS_PER_RECORD = 6;

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
      if (p.duplicate_candidates && p.duplicate_candidates.length > 0) duplicateCandidatesCount++;
      if (p.is_ml_anomaly) mlAnomaliesCount++;

      // Check 1: Coordinates validity
      const hasCoords = Boolean(
        p.latitude && p.longitude &&
        !isNaN(p.latitude) && !isNaN(p.longitude) &&
        p.latitude >= 6 && p.latitude <= 38 &&
        p.longitude >= 68 && p.longitude <= 98
      );
      if (hasCoords) totalChecksPassed++;
      else missingCoords++;

      // Check 2: Completion date consistency
      const hasCompletionDate = p.status !== 'Completed' || (Boolean(p.completion_date) && Boolean(p.completion_date?.trim()));
      if (hasCompletionDate) totalChecksPassed++;
      else missingCompletion++;

      // Check 3: Mandatory text identification fields
      const hasIdentity = Boolean(
        p.project_id && p.project_id.trim() !== '' &&
        p.work_name && p.work_name.trim() !== '' &&
        p.state && p.state.trim() !== '' &&
        p.district && p.district.trim() !== ''
      );
      if (hasIdentity) totalChecksPassed++;
      else missingRequiredFields++;

      // Check 4: Mandatory category and agency fields
      const hasClassification = Boolean(
        p.sector && p.work_type && p.implementing_agency && p.status
      );
      if (hasClassification) totalChecksPassed++;

      // Check 5: Financial validity (positive, non-zero numbers)
      const hasValidFinances = (
        !isNaN(p.sanctioned_amount) && p.sanctioned_amount > 0 &&
        !isNaN(p.estimated_cost) && p.estimated_cost > 0 &&
        !isNaN(p.actual_expenditure) && p.actual_expenditure >= 0
      );
      if (hasValidFinances) totalChecksPassed++;

      // Check 6: Valid progress bounds and timeline
      const hasValidTimeline = (
        !isNaN(p.physical_progress_percentage) &&
        p.physical_progress_percentage >= 0 && p.physical_progress_percentage <= 100 &&
        Boolean(p.sanction_date && p.expected_completion_date)
      );
      if (hasValidTimeline) totalChecksPassed++;

      if (!hasCoords || !hasCompletionDate || !hasIdentity || !hasClassification || !hasValidFinances || !hasValidTimeline) {
        invalidRecords++;
      }
    }

    const avgRisk = total > 0 ? Math.round(scoreSum / total) : 0;
    const validRecords = total - invalidRecords;
    const totalPossibleChecks = total * CHECKS_PER_RECORD;
    const dataIntegrityPct = totalPossibleChecks > 0
      ? Number(((totalChecksPassed / totalPossibleChecks) * 100).toFixed(1))
      : 100.0;

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
        valid_records: validRecords,
        invalid_records: invalidRecords,
        records_requiring_review: high + critical,
        missing_coordinates_count: missingCoords,
        missing_completion_dates_count: missingCompletion,
        missing_required_fields_count: missingRequiredFields,
        data_integrity_score_pct: dataIntegrityPct,
        last_analyzed_at: this.lastAnalyzedAt
      },
      ml_engine: {
        isolation_forest_status: this.isMLActive ? 'Active' : 'Fallback',
        sentence_transformers_status: this.isMLActive ? 'Active' : 'Fallback',
        peer_benchmarking_status: 'Active',
        rule_engine_status: 'Active',
        model_version: '0.2.0-HYBRID',
        training_records: total,
        ml_anomalies_count: mlAnomaliesCount,
        duplicate_candidates_count: duplicateCandidatesCount
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
    this.triggerMLAnalysis().catch(() => {});
  }

  public static reAnalyze(): void {
    this.runFullAnalysis();
    this.triggerMLAnalysis().catch(() => {});
  }

  public static resetToDemo(): void {
    this.projects = generateSyntheticProjects();
    this.runFullAnalysis();
    this.triggerMLAnalysis().catch(() => {});
  }
}
