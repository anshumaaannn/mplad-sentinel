import { Project, RiskBreakdown, RiskLevel, AnomalyEvidence, ProjectRiskAnalysis, DuplicateMatch, PeerBenchmark } from '../types/project.js';
import { EngineeredFeatures } from './featureEngineering.service.js';
import { PeerBenchmarkingService } from './peerBenchmarking.service.js';
import { NlpSimilarityService } from './nlpSimilarity.service.js';
import { AgencyMetrics } from './agencyAnalytics.service.js';
import { getSystemConfig } from '../config/thresholds.js';

export class RiskScoringService {
  /**
   * Deterministically evaluates a project against peer benchmarks, timeline features,
   * progress records, duplicate detection and agency profile.
   *
   * STRICT BOUNDS:
   * Financial Anomaly Risk: max 25
   * Delay Risk: max 20
   * Progress Mismatch Risk: max 20
   * Duplicate / Semantic Risk: max 15
   * Geospatial Risk: max 10
   * Implementing Agency Risk: max 10
   * TOTAL: strictly bounded to <= 100
   */
  public static evaluateProject(
    project: Project,
    features: EngineeredFeatures,
    allProjects: Project[],
    featuresMap?: Map<string, EngineeredFeatures>,
    agencyProfiles?: Map<string, AgencyMetrics>
  ): ProjectRiskAnalysis {
    const config = getSystemConfig();
    const thresholds = config.thresholds;
    const evidences: AnomalyEvidence[] = [];

    // Compute dynamic hierarchical peer benchmark (excluding self)
    const benchmark: PeerBenchmark = PeerBenchmarkingService.getBenchmarkForProject(
      project,
      features,
      allProjects,
      featuresMap
    );

    // 1. FINANCIAL RISK COMPONENT (Max 25 pts)
    let financialScore = 0;
    const projectCost = project.actual_expenditure > 0 ? project.actual_expenditure : project.sanctioned_amount;

    const peerThreshold = thresholds.peer_cost_deviation_threshold_pct || 45;

    if (benchmark.cost_deviation_pct > peerThreshold * 1.8) {
      financialScore = 25;
      evidences.push({
        anomaly_type: 'Financial Anomaly',
        severity: 'CRITICAL',
        metric: 'Sanctioned Cost Peer Outlier',
        observed_value: `₹${(projectCost / 100000).toFixed(2)} Lakh`,
        baseline_value: `₹${(benchmark.peer_cost_median / 100000).toFixed(2)} Lakh`,
        comparison_group: `${benchmark.peer_group_definition} (${benchmark.peer_level} Level, n=${benchmark.peer_count})`,
        deviation: `+${benchmark.cost_deviation_pct}%`,
        explanation: `Project cost of ₹${(projectCost / 100000).toFixed(1)} Lakh exceeds the ${benchmark.peer_level.toLowerCase()} peer median (₹${(benchmark.peer_cost_median / 100000).toFixed(1)} L) by +${benchmark.cost_deviation_pct}%, ranking in the ${benchmark.cost_percentile}th percentile.`,
        recommended_action: 'Conduct administrative technical cost justification audit against prevailing CPWD/PWD schedule of rates (SoR).'
      });
    } else if (benchmark.cost_deviation_pct > peerThreshold) {
      financialScore = 18;
      evidences.push({
        anomaly_type: 'Financial Anomaly',
        severity: 'HIGH',
        metric: 'Sanctioned Cost Peer Deviation',
        observed_value: `₹${(projectCost / 100000).toFixed(2)} Lakh`,
        baseline_value: `₹${(benchmark.peer_cost_median / 100000).toFixed(2)} Lakh`,
        comparison_group: `${benchmark.peer_group_definition} (${benchmark.peer_level} Level, n=${benchmark.peer_count})`,
        deviation: `+${benchmark.cost_deviation_pct}%`,
        explanation: `Project sanctioned budget deviates significantly above peer median by +${benchmark.cost_deviation_pct}%.`,
        recommended_action: 'Verify detailed project estimate (DPR) line items with District Planning Cell.'
      });
    } else if (features.cost_overrun_ratio > 0.15) {
      financialScore = 12;
      evidences.push({
        anomaly_type: 'Financial Anomaly',
        severity: 'MODERATE',
        metric: 'Expenditure vs Technical Estimate Overrun',
        observed_value: `₹${(project.actual_expenditure / 100000).toFixed(2)} Lakh`,
        baseline_value: `₹${(project.estimated_cost / 100000).toFixed(2)} Lakh`,
        comparison_group: 'Initial Sanctioned Estimate',
        deviation: `+${Math.round(features.cost_overrun_ratio * 100)}%`,
        explanation: `Disbursed expenditure exceeds original technical estimate by ${Math.round(features.cost_overrun_ratio * 100)}%.`,
        recommended_action: 'Review revised administrative sanction and excess expenditure approval approvals.'
      });
    } else if (benchmark.cost_deviation_pct > 20) {
      financialScore = 6;
    }
    financialScore = Math.min(25, financialScore);

    // 2. DELAY RISK COMPONENT (Max 20 pts)
    let delayScore = 0;
    if (features.is_stalled && features.delay_days > 180) {
      delayScore = 20;
      evidences.push({
        anomaly_type: 'Delay Anomaly',
        severity: 'CRITICAL',
        metric: 'Stalled Project with Chronic Delay',
        observed_value: `${features.actual_execution_days} days elapsed (${features.delay_days} days overdue)`,
        baseline_value: `${features.planned_duration_days} days planned`,
        comparison_group: 'Scheduled Target Milestone',
        deviation: `+${features.delay_days} days overdue`,
        explanation: `Project status is inactive/stalled with ${features.delay_days} days elapsed past target deadline with zero recent milestone updates.`,
        recommended_action: 'Deploy District inspection officer to ascertain root cause of stall and issue showcause notice.'
      });
    } else if (features.delay_days > 365) {
      delayScore = 18;
      evidences.push({
        anomaly_type: 'Delay Anomaly',
        severity: 'HIGH',
        metric: 'Severe Timeline Slippage',
        observed_value: `${features.delay_days} days overdue`,
        baseline_value: `Target: ${project.expected_completion_date}`,
        comparison_group: 'Contractual Milestone',
        deviation: `+${features.delay_days} days`,
        explanation: `Execution timeline has slipped by over one full year (${features.delay_days} days).`,
        recommended_action: 'Require implementing agency to submit a revised time-bound recovery schedule.'
      });
    } else if (features.delay_days > (thresholds.delay_days_threshold || 60)) {
      delayScore = 12;
      evidences.push({
        anomaly_type: 'Delay Anomaly',
        severity: 'MODERATE',
        metric: 'Moderate Execution Delay',
        observed_value: `${features.delay_days} days overdue`,
        baseline_value: `Target: ${project.expected_completion_date}`,
        comparison_group: 'Contractual Milestone',
        deviation: `+${features.delay_days} days`,
        explanation: `Execution delay exceeds ${(thresholds.delay_days_threshold || 60)} days past completion deadline.`,
        recommended_action: 'Send reminder notice to executing agency for status update.'
      });
    } else if (features.delay_days > 30) {
      delayScore = 6;
    }
    delayScore = Math.min(20, delayScore);

    // 3. PROGRESS VS EXPENDITURE MISMATCH (Max 20 pts)
    let progressScore = 0;
    if (features.expenditure_progress_gap > 45) {
      progressScore = 20;
      const expRatio = Math.round(features.expenditure_ratio * 100);
      evidences.push({
        anomaly_type: 'Progress Mismatch',
        severity: 'CRITICAL',
        metric: 'Disbursement Exceeding Physical Progress',
        observed_value: `${expRatio}% funds utilized (₹${(project.actual_expenditure / 100000).toFixed(1)} L)`,
        baseline_value: `${project.physical_progress_percentage}% verified physical progress`,
        comparison_group: 'Financial vs Physical Parity Baseline',
        deviation: `+${Math.round(features.expenditure_progress_gap)}% gap`,
        explanation: `High financial outflow (${expRatio}%) significantly outpaces verified on-ground physical completion (${project.physical_progress_percentage}%), showing a divergence gap of ${Math.round(features.expenditure_progress_gap)}%.`,
        recommended_action: 'Withhold subsequent fund tranche disbursements until physical milestone verification report is certified by third-party engineer.'
      });
    } else if (features.expenditure_progress_gap > (thresholds.expenditure_progress_gap_threshold || 30)) {
      progressScore = 14;
      const expRatio = Math.round(features.expenditure_ratio * 100);
      evidences.push({
        anomaly_type: 'Progress Mismatch',
        severity: 'HIGH',
        metric: 'Disbursement vs Physical Milestone Asymmetry',
        observed_value: `${expRatio}% funds utilized`,
        baseline_value: `${project.physical_progress_percentage}% physical progress`,
        comparison_group: 'Financial vs Physical Parity Baseline',
        deviation: `+${Math.round(features.expenditure_progress_gap)}% gap`,
        explanation: `Funds utilization leads ground progress by ${Math.round(features.expenditure_progress_gap)}%.`,
        recommended_action: 'Request intermediate Measurement Book (MB) inspection before releasing next tranche.'
      });
    } else if (features.expenditure_progress_gap > 15) {
      progressScore = 8;
    }
    progressScore = Math.min(20, progressScore);

    // 4. DUPLICATE & SEMANTIC OVERLAP RISK (Max 15 pts)
    let duplicateScore = 0;
    const duplicateMatches = NlpSimilarityService.findDuplicateMatches(project, allProjects);

    if (duplicateMatches.length > 0) {
      const topMatch = duplicateMatches[0];
      if (topMatch.semantic_similarity >= 75 && topMatch.distance_km <= 2.5) {
        duplicateScore = 15;
        evidences.push({
          anomaly_type: 'Duplicate Candidate',
          severity: 'CRITICAL',
          metric: 'Potential Duplicate Work Proposal',
          observed_value: `"${topMatch.matched_work_name}" (${topMatch.matched_project_id})`,
          baseline_value: `Unique work scope required`,
          comparison_group: `Nearby projects within ${topMatch.distance_km} km`,
          deviation: `${topMatch.semantic_similarity}% NLP match, ${topMatch.distance_km} km`,
          explanation: `Identified potential duplicate or overlapping scope with work ${topMatch.matched_project_id} located ${topMatch.distance_km} km away, sharing ${topMatch.semantic_similarity}% textual and technical similarity.`,
          recommended_action: 'Execute on-site cross-verification to ensure funds are not being sanctioned for pre-existing or co-located infrastructure.'
        });
      } else if (topMatch.semantic_similarity >= 65 && topMatch.distance_km <= 10.0) {
        duplicateScore = 10;
        evidences.push({
          anomaly_type: 'Duplicate Candidate',
          severity: 'HIGH',
          metric: 'Overlapping Scope Candidate',
          observed_value: `"${topMatch.matched_work_name}" (${topMatch.matched_project_id})`,
          baseline_value: `Distinct geo-spatial boundary`,
          comparison_group: `Projects in same sector & district within ${topMatch.distance_km} km`,
          deviation: `${topMatch.semantic_similarity}% similarity`,
          explanation: `Moderate semantic overlap detected with nearby project ${topMatch.matched_project_id} (${topMatch.distance_km} km away).`,
          recommended_action: 'Cross-reference GIS coordinates and asset register in District Urban/Rural Development Cell.'
        });
      } else {
        duplicateScore = 5;
      }
    }
    duplicateScore = Math.min(15, duplicateScore);

    // 5. GEOSPATIAL DENSITY CLUSTERING RISK (Max 10 pts)
    let geoScore = 0;
    const nearbySameSector = allProjects.filter(other =>
      other.project_id !== project.project_id &&
      other.sector === project.sector &&
      other.district.toLowerCase() === project.district.toLowerCase()
    );
    if (nearbySameSector.length >= 8) {
      geoScore = 10;
      evidences.push({
        anomaly_type: 'Geospatial Anomaly',
        severity: 'MODERATE',
        metric: 'Hyper-Dense Sectoral Work Concentration',
        observed_value: `${nearbySameSector.length} similar works`,
        baseline_value: `Standard spatial dispersion (<= 3 works)`,
        comparison_group: `${project.district} (${project.sector} Sector)`,
        deviation: `${nearbySameSector.length} co-located works`,
        explanation: `Unusual spatial concentration of ${nearbySameSector.length} works in the ${project.sector} sector within ${project.district}.`,
        recommended_action: 'Conduct spatial equity analysis to assess saturation and equitable distribution of MPLADS assets.'
      });
    } else if (nearbySameSector.length >= 5) {
      geoScore = 5;
    }
    geoScore = Math.min(10, geoScore);

    // 6. IMPLEMENTING AGENCY RISK COMPONENT (Max 10 pts)
    let agencyScore = 0;
    if (agencyProfiles && agencyProfiles.has(project.implementing_agency)) {
      const agency = agencyProfiles.get(project.implementing_agency)!;
      const delayRate = agency.delay_rate_pct || 0;
      if (agency.risk_profile === 'HIGH' || delayRate > 45) {
        agencyScore = 10;
        evidences.push({
          anomaly_type: 'Agency Behavioral Pattern',
          severity: 'HIGH',
          metric: 'Executing Agency Chronic Underperformance',
          observed_value: `${delayRate}% portfolio delayed, +${Math.round(agency.avg_cost_overrun_pct)}% cost overrun`,
          baseline_value: `Agency benchmark (delay <= 20%, overrun <= 5%)`,
          comparison_group: `All works executed by ${agency.agency_name}`,
          deviation: `${agency.delayed_projects} of ${agency.total_projects} projects delayed`,
          explanation: `Assigned implementing agency (${agency.agency_name}) demonstrates historical portfolio delay rate of ${delayRate}% and average cost overrun of ${Math.round(agency.avg_cost_overrun_pct)}%.`,
          recommended_action: 'Request quarterly capacity and staffing review from agency head prior to sanctioning further work allocations.'
        });
      } else if (agency.risk_profile === 'ELEVATED' || delayRate > 25) {
        agencyScore = 6;
      } else if (delayRate > 15) {
        agencyScore = 3;
      }
    }
    agencyScore = Math.min(10, agencyScore);

    // COMPOSITE BOUNDED RISK SCORE (Strictly 0 - 100)
    const riskBreakdown: RiskBreakdown = {
      financial_risk: Math.round(financialScore),
      delay_risk: Math.round(delayScore),
      progress_mismatch_risk: Math.round(progressScore),
      duplicate_risk: Math.round(duplicateScore),
      geospatial_risk: Math.round(geoScore),
      agency_risk: Math.round(agencyScore)
    };

    const baseSum =
      riskBreakdown.financial_risk +
      riskBreakdown.delay_risk +
      riskBreakdown.progress_mismatch_risk +
      riskBreakdown.duplicate_risk +
      riskBreakdown.geospatial_risk +
      riskBreakdown.agency_risk;

    const totalScore = Math.min(100, Math.max(0, baseSum));

    // Risk level classification
    let riskLevel: RiskLevel = 'LOW';
    if (totalScore >= 70) riskLevel = 'CRITICAL';
    else if (totalScore >= 45) riskLevel = 'HIGH';
    else if (totalScore >= 25) riskLevel = 'MODERATE';

    // Primary human-readable reason
    let primaryReason = 'Conforms to standard execution, financial, and peer parameters.';
    if (evidences.length > 0) {
      const topEvidence = [...evidences].sort((a, b) => {
        const order: Record<string, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
        return order[b.severity] - order[a.severity];
      })[0];
      primaryReason = `${topEvidence.anomaly_type}: ${topEvidence.explanation}`;
    }

    return {
      project_id: project.project_id,
      risk_score: totalScore,
      risk_level: riskLevel,
      primary_reason: primaryReason,
      risk_breakdown: riskBreakdown,
      evidences,
      peer_benchmark: benchmark,
      duplicate_candidates: duplicateMatches,
      features: features as any,
      analyzed_at: new Date().toISOString()
    };
  }
}
