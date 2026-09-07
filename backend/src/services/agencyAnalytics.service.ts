import { Project } from '../types/project.js';
import { EngineeredFeatures } from './featureEngineering.service.js';

export interface AgencyMetrics {
  agency_name: string;
  total_projects: number;
  total_sanctioned_amount: number;
  total_actual_expenditure: number;
  completed_projects: number;
  in_progress_projects: number;
  stalled_projects: number;
  delayed_projects: number;
  delay_rate_pct: number;
  avg_delay_days: number;
  avg_cost_overrun_pct: number;
  high_risk_projects: number;
  high_risk_rate_pct: number;
  completion_rate_pct: number;
  risk_profile: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  key_observations: string[];
}

export class AgencyAnalyticsService {
  public static computeAgencyProfiles(
    projects: Project[],
    featuresMap: Map<string, EngineeredFeatures>,
    highRiskProjectIds = new Set<string>()
  ): Map<string, AgencyMetrics> {
    const rawMap = new Map<string, {
      projects: Project[];
      delays: number[];
      overruns: number[];
      highRiskCount: number;
    }>();

    for (const p of projects) {
      const agency = p.implementing_agency;
      if (!rawMap.has(agency)) {
        rawMap.set(agency, { projects: [], delays: [], overruns: [], highRiskCount: 0 });
      }
      const entry = rawMap.get(agency)!;
      entry.projects.push(p);

      const feat = featuresMap.get(p.project_id);
      if (feat) {
        entry.delays.push(feat.delay_days);
        entry.overruns.push(feat.cost_overrun_ratio * 100);
      }
      if (highRiskProjectIds.has(p.project_id)) {
        entry.highRiskCount++;
      }
    }

    const result = new Map<string, AgencyMetrics>();

    for (const [agency, data] of rawMap.entries()) {
      const total = data.projects.length;
      const completed = data.projects.filter(p => p.status === 'Completed').length;
      const stalled = data.projects.filter(p => p.status === 'Stalled').length;
      const inProgress = data.projects.filter(p => p.status === 'In Progress').length;
      const delayed = data.delays.filter(d => d > 30).length;

      const totalSanctioned = data.projects.reduce((sum, p) => sum + p.sanctioned_amount, 0);
      const totalExp = data.projects.reduce((sum, p) => sum + p.actual_expenditure, 0);

      const avgDelay = data.delays.length > 0
        ? Math.round(data.delays.reduce((a, b) => a + b, 0) / data.delays.length)
        : 0;

      const avgOverrun = data.overruns.length > 0
        ? Number((data.overruns.reduce((a, b) => a + b, 0) / data.overruns.length).toFixed(1))
        : 0;

      const delayRate = Math.round((delayed / total) * 100);
      const completionRate = Math.round((completed / total) * 100);
      const highRiskRate = Math.round((data.highRiskCount / total) * 100);

      let riskProfile: AgencyMetrics['risk_profile'] = 'LOW';
      const keyObservations: string[] = [];

      if (delayRate > 50 || avgOverrun > 15 || highRiskRate > 30) {
        riskProfile = 'HIGH';
        if (delayRate > 50) keyObservations.push(`High delay incidence: ${delayRate}% of managed works exceed planned timeline.`);
        if (avgOverrun > 15) keyObservations.push(`Elevated cost escalation rate averaging +${avgOverrun}%.`);
      } else if (delayRate > 30 || avgOverrun > 8 || highRiskRate > 15) {
        riskProfile = 'ELEVATED';
        if (delayRate > 30) keyObservations.push(`Moderate delay trend with ${delayRate}% projects experiencing extension.`);
      } else if (delayRate > 15) {
        riskProfile = 'MODERATE';
      } else {
        keyObservations.push('Consistently adheres to planned project milestones and budget ceilings.');
      }

      result.set(agency, {
        agency_name: agency,
        total_projects: total,
        total_sanctioned_amount: totalSanctioned,
        total_actual_expenditure: totalExp,
        completed_projects: completed,
        in_progress_projects: inProgress,
        stalled_projects: stalled,
        delayed_projects: delayed,
        delay_rate_pct: delayRate,
        avg_delay_days: avgDelay,
        avg_cost_overrun_pct: avgOverrun,
        high_risk_projects: data.highRiskCount,
        high_risk_rate_pct: highRiskRate,
        completion_rate_pct: completionRate,
        risk_profile: riskProfile,
        key_observations: keyObservations
      });
    }

    return result;
  }
}
