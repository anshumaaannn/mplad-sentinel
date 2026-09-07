import { Project, RiskBreakdown, RiskLevel, AnomalyEvidence, ProjectRiskAnalysis, DuplicateMatch } from '../types/project.js';
import { EngineeredFeatures } from './featureEngineering.service.js';
import { PeerBenchmark, PeerGroupStats, PeerBenchmarkingService } from './peerBenchmarking.service.js';
import { NlpSimilarityService } from './nlpSimilarity.service.js';
import { AgencyMetrics } from './agencyAnalytics.service.js';
import { getSystemConfig } from '../config/thresholds.js';

export class RiskScoringService {
  public static evaluateProject(
    project: Project,
    features: EngineeredFeatures,
    peerGroups: Map<string, PeerGroupStats>,
    allProjects: Project[],
    agencyProfiles: Map<string, AgencyMetrics>
  ): ProjectRiskAnalysis {
    const config = getSystemConfig();
    const peerBenchmark = PeerBenchmarkingService.getBenchmarkForProject(project, features, peerGroups);
    const duplicateCandidates = NlpSimilarityService.findDuplicateMatches(
      project,
      allProjects,
      config.thresholds.semantic_similarity_threshold,
      config.thresholds.duplicate_distance_threshold_km
    );
    const agencyMetric = agencyProfiles.get(project.implementing_agency);

    const evidences: AnomalyEvidence[] = [];

    // ==========================================
    // 1. FINANCIAL RISK (0 - 25)
    // ==========================================
    let financial_score = 0;
    let criticalFinancialMultiplier = 0;

    // A. Peer cost deviation
    if (peerBenchmark.cost_deviation_pct > config.thresholds.peer_cost_deviation_threshold_pct) {
      const excess = peerBenchmark.cost_deviation_pct - config.thresholds.peer_cost_deviation_threshold_pct;
      const points = Math.min(25, Math.round(10 + (excess / 100) * 15));
      financial_score += points;

      if (peerBenchmark.cost_deviation_pct >= 100) {
        criticalFinancialMultiplier = Math.min(35, Math.round(20 + (peerBenchmark.cost_deviation_pct / 100) * 8));
      }

      evidences.push({
        anomaly_type: 'Financial Anomaly',
        severity: peerBenchmark.cost_deviation_pct > 100 ? 'CRITICAL' : 'HIGH',
        metric: 'Sanctioned / Actual Cost vs Peer Median',
        observed_value: `₹${(project.actual_expenditure > 0 ? project.actual_expenditure : project.sanctioned_amount).toLocaleString('en-IN')}`,
        baseline_value: `₹${peerBenchmark.peer_cost_median.toLocaleString('en-IN')}`,
        comparison_group: peerBenchmark.peer_group_name,
        deviation: `+${peerBenchmark.cost_deviation_pct}% above peer median`,
        explanation: `Project cost is ${peerBenchmark.cost_deviation_pct}% higher than the median cost observed across comparable ${peerBenchmark.peer_group_name} works.`,
        recommended_action: 'Conduct technical estimate verification and schedule of rates (SoR) audit for line items.'
      });
    }

    // B. Direct cost overrun
    const costOverrunPct = Math.round(features.cost_overrun_ratio * 100);
    if (costOverrunPct > config.thresholds.cost_overrun_threshold_pct) {
      const points = Math.min(15, Math.round(6 + (costOverrunPct / 10) * 3));
      financial_score = Math.max(financial_score, points);

      evidences.push({
        anomaly_type: 'Financial Anomaly',
        severity: costOverrunPct > 30 ? 'HIGH' : 'MODERATE',
        metric: 'Actual Expenditure vs Estimated Cost',
        observed_value: `₹${project.actual_expenditure.toLocaleString('en-IN')}`,
        baseline_value: `₹${project.estimated_cost.toLocaleString('en-IN')}`,
        comparison_group: 'Project Sanction Baseline',
        deviation: `+${costOverrunPct}% cost overrun`,
        explanation: `Disbursed expenditure has exceeded initial technical sanctioned estimate by ${costOverrunPct}%.`,
        recommended_action: 'Review revised estimate sanction approvals and variation orders.'
      });
    }

    if (peerBenchmark.cost_percentile > 85 && financial_score === 0) {
      financial_score += 4;
    }
    financial_score = Math.min(config.weights.financial_weight, financial_score);

    // ==========================================
    // 2. DELAY RISK (0 - 20)
    // ==========================================
    let delay_score = 0;
    let criticalDelayMultiplier = 0;

    if (features.delay_days > config.thresholds.delay_days_threshold) {
      const delayPoints = Math.min(20, Math.round(8 + (features.delay_days / 150) * 12));
      delay_score += delayPoints;

      if (features.delay_days >= 300 || features.is_stalled) {
        criticalDelayMultiplier = Math.min(30, Math.round(15 + (features.delay_days / 200) * 10));
      }

      const sev = features.delay_days > 250 ? 'CRITICAL' : (features.delay_days > 120 ? 'HIGH' : 'MODERATE');
      evidences.push({
        anomaly_type: 'Delay Anomaly',
        severity: sev,
        metric: 'Timeline Execution Delay',
        observed_value: `${features.actual_execution_days} days elapsed`,
        baseline_value: `${features.planned_duration_days} days planned (${peerBenchmark.peer_duration_median_days}d peer median)`,
        comparison_group: peerBenchmark.peer_group_name,
        deviation: `+${features.delay_days} days overdue`,
        explanation: `Work execution timeline has extended ${features.delay_days} days beyond target completion date (${project.expected_completion_date}).`,
        recommended_action: 'Obtain progress impediment report from executive engineer and verify physical milestones on ground.'
      });
    }

    if (features.is_stalled && delay_score < 15) {
      delay_score += 8;
    }
    delay_score = Math.min(config.weights.delay_weight, delay_score);

    // ==========================================
    // 3. PROGRESS / EXPENDITURE GAP RISK (0 - 20)
    // ==========================================
    let progress_score = 0;
    let criticalProgressMultiplier = 0;
    const gap = Math.round(features.expenditure_progress_gap);

    if (gap > config.thresholds.expenditure_progress_gap_threshold) {
      const points = Math.min(20, Math.round(10 + (gap / 10) * 2));
      progress_score += points;

      if (gap >= 50) {
        criticalProgressMultiplier = Math.min(35, Math.round(20 + (gap / 10) * 2.5));
      }

      const expPct = Math.round((project.actual_expenditure / project.sanctioned_amount) * 100);
      evidences.push({
        anomaly_type: 'Progress Mismatch',
        severity: gap > 50 ? 'CRITICAL' : 'HIGH',
        metric: 'Expenditure Disbursement vs Physical Progress',
        observed_value: `${expPct}% funds utilized (₹${project.actual_expenditure.toLocaleString('en-IN')})`,
        baseline_value: `${project.physical_progress_percentage}% physical completion reported`,
        comparison_group: 'Utilization Alignment Matrix',
        deviation: `+${gap}% advance payment divergence`,
        explanation: `Substantial financial utilization (${expPct}%) has occurred despite lagging physical ground progress (${project.physical_progress_percentage}%).`,
        recommended_action: 'Dispatch field inspection team with geo-tagged photographic verification before further milestone release.'
      });
    } else if (gap > 15) {
      progress_score += 4;
    }
    progress_score = Math.min(config.weights.progress_mismatch_weight, progress_score);

    // ==========================================
    // 4. DUPLICATE & SEMANTIC RISK (0 - 15)
    // ==========================================
    let duplicate_score = 0;
    let criticalDuplicateMultiplier = 0;

    if (duplicateCandidates.length > 0) {
      const topMatch = duplicateCandidates[0];
      if (topMatch.semantic_similarity >= 80 && topMatch.distance_km <= 2.0) {
        duplicate_score = 15;
        criticalDuplicateMultiplier = 25;
      } else if (topMatch.semantic_similarity >= 70 && topMatch.distance_km <= 6.0) {
        duplicate_score = 12;
        criticalDuplicateMultiplier = 15;
      } else {
        duplicate_score = 7;
      }

      evidences.push({
        anomaly_type: 'Duplicate Candidate',
        severity: topMatch.semantic_similarity >= 80 ? 'HIGH' : 'MODERATE',
        metric: 'Semantic Description & Geographic Proximity',
        observed_value: `Matched with ${topMatch.matched_project_id} ("${topMatch.matched_work_name.substring(0, 48)}...")`,
        baseline_value: 'Independent Non-overlapping Scope',
        comparison_group: `${topMatch.matched_district} Project Pool`,
        deviation: `${topMatch.semantic_similarity}% NLP match | ${topMatch.distance_km} km distance`,
        explanation: `High lexical and thematic overlap with nearby project ${topMatch.matched_project_id} located ${topMatch.distance_km} km away.`,
        recommended_action: 'Cross-reference GIS coordinates and municipal asset register to ensure non-duplication of asset creation.'
      });
    }
    duplicate_score = Math.min(config.weights.duplicate_weight, duplicate_score);

    // ==========================================
    // 5. GEOSPATIAL CLUSTERING RISK (0 - 10)
    // ==========================================
    let geo_score = 0;
    const nearbyCount = duplicateCandidates.filter(d => d.distance_km <= 5.0).length;
    if (nearbyCount >= 2) {
      geo_score = 10;
      evidences.push({
        anomaly_type: 'Geospatial Anomaly',
        severity: 'MODERATE',
        metric: 'Geographic Asset Clustering',
        observed_value: `${nearbyCount} similar works within 5.0 km radius`,
        baseline_value: 'Distributed Coverage Benchmark',
        comparison_group: `${project.district} Work Density`,
        deviation: 'High density clustering',
        explanation: `Multiple similar infrastructure assets sanctioned within narrow geographic boundary (${nearbyCount} works within 5 km).`,
        recommended_action: 'Verify demographic demand and saturation assessment for proposed location.'
      });
    } else if (nearbyCount === 1) {
      geo_score = 5;
    }
    geo_score = Math.min(config.weights.geospatial_weight, geo_score);

    // ==========================================
    // 6. AGENCY BEHAVIORAL RISK (0 - 10)
    // ==========================================
    let agency_score = 0;
    if (agencyMetric) {
      if (agencyMetric.risk_profile === 'HIGH') {
        agency_score = 10;
        evidences.push({
          anomaly_type: 'Agency Behavioral Pattern',
          severity: 'MODERATE',
          metric: 'Implementing Agency Portfolio Risk Index',
          observed_value: `${agencyMetric.delay_rate_pct}% portfolio delay rate | +${agencyMetric.avg_cost_overrun_pct}% cost overrun`,
          baseline_value: '< 20% delay rate benchmark',
          comparison_group: 'State Implementing Agencies',
          deviation: `Elevated systemic delay in ${agencyMetric.agency_name}`,
          explanation: `Implementing agency (${agencyMetric.agency_name}) displays historic trend of timeline slippage across ${agencyMetric.delayed_projects} projects.`,
          recommended_action: 'Require senior engineer progress attestation and bi-weekly milestone checkpoints.'
        });
      } else if (agencyMetric.risk_profile === 'ELEVATED') {
        agency_score = 5;
      }
    }
    agency_score = Math.min(config.weights.agency_weight, agency_score);

    // ==========================================
    // TOTAL RISK SCORE & LEVEL
    // ==========================================
    const baseSum = financial_score + delay_score + progress_score + duplicate_score + geo_score + agency_score;
    const maxCriticalBoost = Math.max(
      criticalFinancialMultiplier,
      criticalDelayMultiplier,
      criticalProgressMultiplier,
      criticalDuplicateMultiplier
    );

    const total_score = Math.min(100, Math.round(Math.max(baseSum, baseSum + maxCriticalBoost * 0.75, maxCriticalBoost > 0 ? 55 + maxCriticalBoost * 0.9 : baseSum)));

    let risk_level: RiskLevel = 'LOW';
    if (total_score >= 75) {
      risk_level = 'CRITICAL';
    } else if (total_score >= 50) {
      risk_level = 'HIGH';
    } else if (total_score >= 25) {
      risk_level = 'MODERATE';
    } else {
      risk_level = 'LOW';
    }

    // Determine primary reason
    let primary_reason = 'Normal project execution parameters within expected thresholds.';
    if (evidences.length > 0) {
      const topEvidence = evidences.find(e => e.severity === 'CRITICAL') ||
        evidences.find(e => e.severity === 'HIGH') ||
        evidences[0];
      primary_reason = `${topEvidence.anomaly_type}: ${topEvidence.deviation}`;
    }

    const risk_breakdown: RiskBreakdown = {
      financial_risk: financial_score,
      delay_risk: delay_score,
      progress_mismatch_risk: progress_score,
      duplicate_risk: duplicate_score,
      geospatial_risk: geo_score,
      agency_risk: agency_score
    };

    return {
      project_id: project.project_id,
      risk_score: total_score,
      risk_level,
      primary_reason,
      risk_breakdown,
      evidences,
      peer_benchmark: peerBenchmark,
      duplicate_candidates: duplicateCandidates,
      features: {
        expenditure_ratio: features.expenditure_ratio.toFixed(2),
        cost_overrun_ratio: `${(features.cost_overrun_ratio * 100).toFixed(1)}%`,
        expenditure_progress_gap: `${features.expenditure_progress_gap.toFixed(1)}%`,
        actual_execution_days: features.actual_execution_days,
        delay_days: features.delay_days,
        peer_cost_median: peerBenchmark.peer_cost_median,
        peer_cost_deviation: `${peerBenchmark.cost_deviation_pct}%`
      },
      analyzed_at: new Date().toISOString()
    };
  }
}
