import {
  Project,
  ProjectRiskAnalysis,
  RiskBreakdown,
  RiskLevel,
  AnomalyEvidence,
  DuplicateMatch
} from '../types/project.js';
import { EngineeredFeatures } from './featureEngineering.service.js';
import { PeerBenchmarkingService, PeerBenchmark } from './peerBenchmarking.service.js';
import { NlpSimilarityService } from './nlpSimilarity.service.js';
import { GeoSpatialService } from './geoSpatial.service.js';
import { AgencyMetrics } from './agencyAnalytics.service.js';
import { getSystemConfig } from '../config/thresholds.js';
import { MLAnomalyResult } from './mlClient.service.js';

export class RiskScoringService {
  /**
   * Evaluates project risk using a multi-signal hybrid intelligence pipeline:
   * 1. Financial Anomaly (max 25)
   * 2. Delay & Temporal Risk (max 20)
   * 3. Progress / Disbursement Mismatch (max 20)
   * 4. Semantic Duplicate Candidate (max 15)
   * 5. Geospatial Proximity & Clustering (max 10)
   * 6. Implementing Agency Risk (max 10)
   * 
   * TOTAL: strictly bounded to <= 100, exactly equal to sum of 6 components.
   */
  public static evaluateProject(
    project: Project,
    features: EngineeredFeatures,
    allProjects: Project[],
    featuresMap?: Map<string, EngineeredFeatures>,
    agencyProfiles?: Map<string, AgencyMetrics>,
    mlResult?: MLAnomalyResult,
    mlDuplicateCandidates?: DuplicateMatch[]
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
        id: `ev-fin-crit-${project.project_id}`,
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
        id: `ev-fin-high-${project.project_id}`,
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
        id: `ev-fin-over-${project.project_id}`,
        anomaly_type: 'Financial Anomaly',
        severity: 'MODERATE',
        metric: 'Expenditure vs Technical Estimate Overrun',
        observed_value: `₹${(project.actual_expenditure / 100000).toFixed(2)} Lakh`,
        baseline_value: `₹${(project.estimated_cost / 100000).toFixed(2)} Lakh`,
        comparison_group: 'Initial Sanctioned Estimate',
        deviation: `+${Math.round(features.cost_overrun_ratio * 100)}%`,
        explanation: `Disbursed expenditure exceeds original technical estimate by ${Math.round(features.cost_overrun_ratio * 100)}%.`,
        recommended_action: 'Review revised administrative sanction and excess expenditure approval records.'
      });
    }

    // Incorporate ML Anomaly Signal into Financial/Execution Evidence
    if (mlResult && mlResult.is_ml_anomaly) {
      if (financialScore < 20) {
        financialScore = Math.min(25, financialScore + 5);
      }
      evidences.push({
        id: `ev-ml-${project.project_id}`,
        anomaly_type: 'ML Anomaly Signal',
        severity: mlResult.anomaly_score >= 80 ? 'CRITICAL' : 'HIGH',
        metric: 'Multivariate Isolation Forest Anomaly',
        observed_value: `${mlResult.anomaly_percentile}th percentile`,
        baseline_value: '< 88th percentile',
        comparison_group: 'Isolation Forest (16 peer-relative features)',
        deviation: `Score: ${mlResult.anomaly_score}/100`,
        explanation: 'This project exhibits an unusual combination of financial, execution and progress characteristics relative to the analyzed dataset.',
        recommended_action: 'Conduct comprehensive multidimensional audit and review historical project vouchers.'
      });
    }
    financialScore = Math.min(25, financialScore);

    // 2. DELAY & TEMPORAL RISK COMPONENT (Max 20 pts)
    let delayScore = 0;
    const delayDays = features.delay_days;
    const delayThreshold = thresholds.delay_days_threshold || 60;

    if (project.status === 'Stalled' || (features.is_stalled && delayDays > 180)) {
      delayScore = 20;
      evidences.push({
        id: `ev-delay-stall-${project.project_id}`,
        anomaly_type: 'Delay Anomaly',
        severity: 'CRITICAL',
        metric: 'Stalled Project Execution',
        observed_value: `${Math.round(delayDays)} days past deadline (${project.physical_progress_percentage}% done)`,
        baseline_value: 'Continuous progress schedule',
        comparison_group: 'MPLADS Completion Guidelines (Max 12 Months)',
        deviation: `${Math.round(delayDays)} days delay`,
        explanation: `Project has stalled with only ${project.physical_progress_percentage}% physical progress despite exceeding planned deadline by ${Math.round(delayDays)} days.`,
        recommended_action: 'Issue immediate formal showcause notice to executing agency and inspect construction site.'
      });
    } else if (delayDays > delayThreshold * 2) {
      delayScore = 15;
      evidences.push({
        id: `ev-delay-high-${project.project_id}`,
        anomaly_type: 'Delay Anomaly',
        severity: 'HIGH',
        metric: 'Severe Execution Timeline Slippage',
        observed_value: `${Math.round(delayDays)} days overdue`,
        baseline_value: `<= ${delayThreshold} days grace buffer`,
        comparison_group: `${benchmark.peer_group_definition}`,
        deviation: `+${benchmark.duration_deviation_pct}% vs peer duration`,
        explanation: `Project completion target elapsed ${Math.round(delayDays)} days ago with execution duration exceeding peer median by +${benchmark.duration_deviation_pct}%.`,
        recommended_action: 'Summon nodal project engineer for milestone recovery and revised critical-path timeline.'
      });
    } else if (delayDays > delayThreshold) {
      delayScore = 8;
      evidences.push({
        id: `ev-delay-mod-${project.project_id}`,
        anomaly_type: 'Delay Anomaly',
        severity: 'MODERATE',
        metric: 'Moderate Execution Delay',
        observed_value: `${Math.round(delayDays)} days overdue`,
        baseline_value: `<= ${delayThreshold} days`,
        comparison_group: 'Approved Contract Period',
        deviation: `Overdue by ${Math.round(delayDays)} days`,
        explanation: `Work execution has surpassed the contractual completion date by ${Math.round(delayDays)} days.`,
        recommended_action: 'Issue fortnightly milestone reporting mandate to executing agency.'
      });
    }
    delayScore = Math.min(20, delayScore);

    // 3. PROGRESS / DISBURSEMENT MISMATCH RISK (Max 20 pts)
    let progressScore = 0;
    const progressGap = features.expenditure_progress_gap;
    const gapThreshold = thresholds.expenditure_progress_gap_threshold || 25;

    if (progressGap > gapThreshold * 1.8) {
      progressScore = 20;
      evidences.push({
        id: `ev-prog-crit-${project.project_id}`,
        anomaly_type: 'Progress Mismatch',
        severity: 'CRITICAL',
        metric: 'Severe Financial-Physical Asymmetry',
        observed_value: `${Math.round(features.expenditure_ratio * 100)}% disbursed vs ${project.physical_progress_percentage}% completed`,
        baseline_value: 'Balanced expenditure-to-physical ratio (gap <= 15%)',
        comparison_group: 'MPLADS Physical Inspection Protocols',
        deviation: `+${Math.round(progressGap)} percentage points divergence`,
        explanation: `Disbursement rate of ${Math.round(features.expenditure_ratio * 100)}% vastly outpaces verified on-ground completion (${project.physical_progress_percentage}%), showing a critical divergence gap of +${Math.round(progressGap)} pp.`,
        recommended_action: 'Immediately halt subsequent fund tranches and order physical measurement book (MB) audit.'
      });
    } else if (progressGap > gapThreshold) {
      progressScore = 12;
      evidences.push({
        id: `ev-prog-high-${project.project_id}`,
        anomaly_type: 'Progress Mismatch',
        severity: 'HIGH',
        metric: 'Premature Financial Disbursement',
        observed_value: `${Math.round(features.expenditure_ratio * 100)}% disbursed vs ${project.physical_progress_percentage}% completed`,
        baseline_value: 'Fund release aligned with certified milestone stages',
        comparison_group: 'Standard Stage-wise Release Norms',
        deviation: `+${Math.round(progressGap)} pp disparity`,
        explanation: `Significant disparity between funds disbursed (${Math.round(features.expenditure_ratio * 100)}%) and certified physical milestone completion (${project.physical_progress_percentage}%).`,
        recommended_action: 'Require physical completion verification certificate from District Collectorate prior to next release.'
      });
    }
    progressScore = Math.min(20, progressScore);

    // 4. DUPLICATE CANDIDATE / SEMANTIC OVERLAP RISK (Max 15 pts)
    let duplicateScore = 0;
    const duplicateMatches: DuplicateMatch[] = mlDuplicateCandidates && mlDuplicateCandidates.length > 0
      ? mlDuplicateCandidates
      : NlpSimilarityService.findDuplicateMatches(project, allProjects);

    if (duplicateMatches.length > 0) {
      const topMatch = duplicateMatches[0];
      if (topMatch.semantic_similarity >= 75 && topMatch.distance_km <= 3.0) {
        duplicateScore = 15;
        evidences.push({
          id: `ev-dup-crit-${project.project_id}`,
          anomaly_type: 'Duplicate Candidate',
          severity: 'CRITICAL',
          metric: 'Potential Duplicate Work Proposal',
          observed_value: `"${topMatch.matched_work_name}" (${topMatch.matched_project_id})`,
          baseline_value: 'Unique work scope required',
          comparison_group: `Nearby projects within ${topMatch.distance_km} km`,
          deviation: `${topMatch.semantic_similarity}% NLP match, ${topMatch.distance_km} km`,
          explanation: `Identified potential duplicate or overlapping scope with work ${topMatch.matched_project_id} located ${topMatch.distance_km} km away, sharing ${topMatch.semantic_similarity}% textual and technical similarity.`,
          recommended_action: 'Execute on-site cross-verification to ensure funds are not being sanctioned for pre-existing or co-located infrastructure.'
        });
      } else if (topMatch.semantic_similarity >= 60 && topMatch.distance_km <= 10.0) {
        duplicateScore = 10;
        evidences.push({
          id: `ev-dup-high-${project.project_id}`,
          anomaly_type: 'Duplicate Candidate',
          severity: 'HIGH',
          metric: 'Overlapping Scope Candidate',
          observed_value: `"${topMatch.matched_work_name}" (${topMatch.matched_project_id})`,
          baseline_value: 'Distinct geo-spatial boundary',
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

    // 5. GEOSPATIAL PROXIMITY & CLUSTERING RISK (Max 10 pts)
    let geoScore = 0;
    const lat1 = project.latitude;
    const lon1 = project.longitude;

    if (lat1 !== 0 && lon1 !== 0) {
      let nearbyWorksWithin2Km = 0;
      let nearbyWorksWithin5Km = 0;
      let minDistanceToSimilar = 999.0;

      for (const other of allProjects) {
        if (other.project_id === project.project_id) continue;
        if (other.latitude === 0 || other.longitude === 0) continue;

        const sameWorkType = String(other.work_type).toLowerCase() === String(project.work_type).toLowerCase() ||
          String(other.sector).toLowerCase() === String(project.sector).toLowerCase();

        if (sameWorkType) {
          const dist = GeoSpatialService.calculateHaversineDistance(lat1, lon1, other.latitude, other.longitude);
          if (dist < minDistanceToSimilar) {
            minDistanceToSimilar = dist;
          }
          if (dist <= 2.0) nearbyWorksWithin2Km++;
          if (dist <= 5.0) nearbyWorksWithin5Km++;
        }
      }

      if (nearbyWorksWithin2Km >= 3 && minDistanceToSimilar <= 1.0) {
        geoScore = 10;
        evidences.push({
          id: `ev-geo-high-${project.project_id}`,
          anomaly_type: 'Geospatial Anomaly',
          severity: 'HIGH',
          metric: 'Dense Co-Location of Identical Works',
          observed_value: `${nearbyWorksWithin2Km} similar works within 2 km (nearest: ${minDistanceToSimilar.toFixed(2)} km)`,
          baseline_value: 'Equitable geographic dispersion (> 2.5 km separation)',
          comparison_group: `${project.district} (${project.sector})`,
          deviation: `${minDistanceToSimilar.toFixed(2)} km proximity`,
          explanation: `Identified ${nearbyWorksWithin2Km} projects of same work type within 2 km radius, with nearest project just ${minDistanceToSimilar.toFixed(2)} km away.`,
          recommended_action: 'Perform GIS coordinate audit to ensure no redundant asset duplication on the same site.'
        });
      } else if (nearbyWorksWithin5Km >= 4) {
        geoScore = 5;
      }
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
          id: `ev-agn-high-${project.project_id}`,
          anomaly_type: 'Agency Behavioral Pattern',
          severity: 'HIGH',
          metric: 'Executing Agency Chronic Underperformance',
          observed_value: `${delayRate}% portfolio delayed, +${Math.round(agency.avg_cost_overrun_pct)}% cost overrun`,
          baseline_value: 'Agency benchmark (delay <= 20%, overrun <= 5%)',
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

    const totalScore = Math.min(
      100,
      riskBreakdown.financial_risk +
      riskBreakdown.delay_risk +
      riskBreakdown.progress_mismatch_risk +
      riskBreakdown.duplicate_risk +
      riskBreakdown.geospatial_risk +
      riskBreakdown.agency_risk
    );

    let riskLevel: RiskLevel = 'LOW';
    if (totalScore >= 75) riskLevel = 'CRITICAL';
    else if (totalScore >= 50) riskLevel = 'HIGH';
    else if (totalScore >= 25) riskLevel = 'MODERATE';

    // Derive primary non-accusatory reason
    let primaryReason = 'Standard monitoring parameters within permissible thresholds.';
    if (evidences.length > 0) {
      const topEvidence = evidences.reduce((prev, curr) => {
        const rank = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
        return rank[curr.severity] > rank[prev.severity] ? curr : prev;
      }, evidences[0]);
      primaryReason = topEvidence.metric + ': ' + topEvidence.deviation;
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
      features: features as unknown as Record<string, number | string>,
      analyzed_at: new Date().toISOString(),
      // ML properties
      ml_anomaly_score: mlResult?.anomaly_score,
      ml_anomaly_percentile: mlResult?.anomaly_percentile,
      is_ml_anomaly: mlResult?.is_ml_anomaly,
      ml_unusual_characteristics: mlResult?.unusual_characteristics,
      ml_status: mlResult ? mlResult.model_status : 'FALLBACK'
    };
  }
}
