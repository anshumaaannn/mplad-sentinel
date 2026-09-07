import { StorageService } from './storage.service.js';
import { EnrichedProject } from '../types/project.js';

export interface AssistantResponse {
  query: string;
  answer: string;
  highlighted_projects?: Array<{
    project_id: string;
    work_name: string;
    district: string;
    risk_score: number;
    risk_level: string;
    primary_reason: string;
  }>;
  suggested_queries?: string[];
  metrics_summary?: Record<string, string | number>;
}

export class AssistantService {
  public static processQuery(rawQuery: string): AssistantResponse {
    const query = rawQuery.trim().toLowerCase();
    const allProjects = StorageService.getAllProjects();
    const agencies = StorageService.getAgencyProfiles();
    const summary = StorageService.getDashboardSummary();

    // 1. Specific Project Deep-Dive / "Why is [ID] flagged?"
    const idMatch = rawQuery.match(/(DEMO-\d{3}|MPL-[A-Z0-9-]+)/i);
    if (idMatch || query.includes('why is') || query.includes('explain')) {
      const targetId = idMatch ? idMatch[0].toUpperCase() : null;
      let project: EnrichedProject | undefined;
      
      if (targetId) {
        project = StorageService.getProjectById(targetId);
      } else {
        // Find top high risk project
        project = allProjects.filter(p => p.risk_level === 'CRITICAL')[0] || allProjects[0];
      }

      if (project) {
        const evidenceBulletPoints = project.evidences.length > 0
          ? project.evidences.map((e, idx) => `${idx + 1}. **${e.anomaly_type}** (${e.severity}): ${e.explanation} *(${e.deviation})*`).join('\n')
          : 'All execution, financial, and temporal indicators are currently within normal baseline parameters.';

        return {
          query: rawQuery,
          answer: `**Analysis for Project ${project.project_id}**\n\n**Work:** ${project.work_name}\n**Location:** ${project.district}, ${project.state}\n**Risk Score:** ${project.risk_score}/100 (${project.risk_level})\n**Sanctioned Amount:** ₹${project.sanctioned_amount.toLocaleString('en-IN')}\n**Actual Expenditure:** ₹${project.actual_expenditure.toLocaleString('en-IN')} (${Math.round((project.actual_expenditure / project.sanctioned_amount) * 100)}%)\n**Physical Progress:** ${project.physical_progress_percentage}%\n\n**Key Risk Indicators Detected:**\n${evidenceBulletPoints}\n\n**Recommended Officer Action:**\n${project.evidences[0]?.recommended_action || 'Proceed with standard periodic progress monitoring.'}`,
          highlighted_projects: [{
            project_id: project.project_id,
            work_name: project.work_name,
            district: project.district,
            risk_score: project.risk_score,
            risk_level: project.risk_level,
            primary_reason: project.primary_reason
          }],
          metrics_summary: {
            'Risk Score': `${project.risk_score}/100`,
            'Risk Level': project.risk_level,
            'Peer Cost Deviation': `${project.peer_benchmark.cost_deviation_pct}%`,
            'Delay Days': project.evidences.find(e => e.anomaly_type === 'Delay Anomaly')?.deviation || '0 days'
          },
          suggested_queries: [
            'Show potential duplicate works',
            'Which agencies have the highest delay rate?',
            'Show projects with expenditure progress mismatch'
          ]
        };
      }
    }

    // 2. High Risk / Critical Projects query
    if (query.includes('high risk') || query.includes('critical') || query.includes('flagged')) {
      const highRisk = allProjects
        .filter(p => p.risk_level === 'CRITICAL' || p.risk_level === 'HIGH')
        .sort((a, b) => b.risk_score - a.risk_score);

      const topProjects = highRisk.slice(0, 5);

      return {
        query: rawQuery,
        answer: `I have identified **${highRisk.length} projects** categorized as High or Critical Risk requiring prioritized administrative verification.\n\nHere are the top flagged works:\n` +
          topProjects.map((p, i) => `${i + 1}. **[${p.project_id}]** ${p.work_name} (${p.district}, ${p.state}) — **Risk: ${p.risk_score}/100**\n   *Reason: ${p.primary_reason}*`).join('\n\n'),
        highlighted_projects: topProjects.map(p => ({
          project_id: p.project_id,
          work_name: p.work_name,
          district: p.district,
          risk_score: p.risk_score,
          risk_level: p.risk_level,
          primary_reason: p.primary_reason
        })),
        metrics_summary: {
          'Total High/Critical': highRisk.length,
          'Critical Projects': allProjects.filter(p => p.risk_level === 'CRITICAL').length,
          'Average Risk Score': `${summary.avg_risk_score}/100`
        },
        suggested_queries: [
          'Why is DEMO-001 high risk?',
          'Why is DEMO-003 high risk?',
          'Show duplicate candidates in Ghaziabad'
        ]
      };
    }

    // 3. Expenditure vs Progress Mismatch
    if (query.includes('mismatch') || query.includes('progress') || query.includes('expenditure')) {
      const mismatched = allProjects
        .filter(p => p.risk_breakdown.progress_mismatch_risk >= 10)
        .sort((a, b) => b.risk_breakdown.progress_mismatch_risk - a.risk_breakdown.progress_mismatch_risk);

      return {
        query: rawQuery,
        answer: `Identified **${mismatched.length} projects** exhibiting substantial divergence between disbursed public funds and verified physical progress on the ground.\n\nNotable cases include **DEMO-003** in Patna where 96% of sanctioned funds (₹46.2 Lakh) have been disbursed against only 30% physical progress.`,
        highlighted_projects: mismatched.slice(0, 5).map(p => ({
          project_id: p.project_id,
          work_name: p.work_name,
          district: p.district,
          risk_score: p.risk_score,
          risk_level: p.risk_level,
          primary_reason: p.primary_reason
        })),
        suggested_queries: [
          'Why is DEMO-003 high risk?',
          'Show agencies with high delay rates',
          'Show overview of all projects'
        ]
      };
    }

    // 4. Duplicate / Overlapping works
    if (query.includes('duplicate') || query.includes('overlap') || query.includes('similar')) {
      const dupPairs = StorageService.getAllDuplicatePairs();

      return {
        query: rawQuery,
        answer: `Detected **${dupPairs.length} candidate pairs** of potential duplicate or overlapping works based on multi-dimensional lexical NLP embeddings and geospatial proximity.\n\nTop alert: **DEMO-004** and **DEMO-005** in Ghaziabad have **93% semantic similarity** and are located only **320 meters apart** with independent financial sanctions totaling ₹69.0 Lakh.`,
        highlighted_projects: dupPairs.slice(0, 4).map(d => ({
          project_id: d.projectA.project_id,
          work_name: `${d.projectA.work_name} (Matches ${d.projectB.project_id})`,
          district: d.projectA.district,
          risk_score: d.projectA.risk_score,
          risk_level: d.risk_level,
          primary_reason: `${d.similarity}% Semantic Match | ${d.distance_km} km away`
        })),
        suggested_queries: [
          'Show potential duplicate works in Ghaziabad',
          'Why is DEMO-004 high risk?',
          'Which agencies have the highest delay rate?'
        ]
      };
    }

    // 5. Agency Delays and Performance
    if (query.includes('agency') || query.includes('agencies') || query.includes('delay')) {
      const topDelayedAgencies = [...agencies]
        .sort((a, b) => b.delay_rate_pct - a.delay_rate_pct)
        .slice(0, 4);

      return {
        query: rawQuery,
        answer: `Agency performance analysis across ${agencies.length} registered implementing agencies:\n\n` +
          topDelayedAgencies.map(a => `• **${a.agency_name}**: ${a.delay_rate_pct}% delay rate across ${a.total_projects} projects (Avg delay: ${a.avg_delay_days} days, Cost Overrun: +${a.avg_cost_overrun_pct}%)`).join('\n') +
          `\n\n*Note: Anomaly metrics indicate execution delays and do not constitute administrative misconduct without formal ground inquiry.*`,
        suggested_queries: [
          'Show projects handled by District Rural Infrastructure Corp',
          'Show high-risk projects in Uttar Pradesh',
          'Show duplicate candidates'
        ]
      };
    }

    // 6. State or District filter query (e.g. "Uttar Pradesh", "Patna", "Ghaziabad")
    const stateMatch = allProjects.find(p => query.includes(p.state.toLowerCase()));
    const districtMatch = allProjects.find(p => query.includes(p.district.toLowerCase()));

    if (stateMatch || districtMatch) {
      const regionName = districtMatch ? districtMatch.district : stateMatch!.state;
      const regionalProjects = allProjects.filter(p => 
        districtMatch ? p.district.toLowerCase() === regionName.toLowerCase() : p.state.toLowerCase() === regionName.toLowerCase()
      );
      const regionalHigh = regionalProjects.filter(p => p.risk_level === 'CRITICAL' || p.risk_level === 'HIGH');

      return {
        query: rawQuery,
        answer: `**Region Overview: ${regionName}**\n\n• Total MPLADS Projects: **${regionalProjects.length}**\n• High/Critical Risk Projects: **${regionalHigh.length}**\n• Total Sanctioned Value: **₹${regionalProjects.reduce((s, p) => s + p.sanctioned_amount, 0).toLocaleString('en-IN')}**\n• Average Completion Rate: **${Math.round((regionalProjects.filter(p => p.status === 'Completed').length / regionalProjects.length) * 100)}%**`,
        highlighted_projects: regionalHigh.slice(0, 5).map(p => ({
          project_id: p.project_id,
          work_name: p.work_name,
          district: p.district,
          risk_score: p.risk_score,
          risk_level: p.risk_level,
          primary_reason: p.primary_reason
        })),
        suggested_queries: [
          `Show duplicate works in ${regionName}`,
          'Show overall dashboard summary',
          'Why is DEMO-001 high risk?'
        ]
      };
    }

    // Default Intelligence Summary response
    return {
      query: rawQuery,
      answer: `MPLAD Sentinel AI Intelligence Engine is monitoring **${summary.total_projects} projects** across India with an aggregate sanctioned value of **₹${(summary.total_sanctioned_amount / 10000000).toFixed(2)} Crore**.\n\nCurrently, **${summary.high_critical_count} works** exhibit multi-signal risk indicators (Financial, Timeline Delay, Progress Mismatch, Duplicate Scope) requiring administrative verification.`,
      highlighted_projects: allProjects.filter(p => p.risk_level === 'CRITICAL').slice(0, 3).map(p => ({
        project_id: p.project_id,
        work_name: p.work_name,
        district: p.district,
        risk_score: p.risk_score,
        risk_level: p.risk_level,
        primary_reason: p.primary_reason
      })),
      suggested_queries: [
        'Show me high-risk projects',
        'Why is DEMO-001 high risk?',
        'Show potential duplicate works in Ghaziabad',
        'Which agencies have the highest delay rate?'
      ]
    };
  }
}
