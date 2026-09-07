import { Request, Response } from 'express';
import { StorageService } from '../services/storage.service.js';

export class DashboardController {
  public static getSummary(req: Request, res: Response): void {
    const summary = StorageService.getDashboardSummary();
    res.json({
      success: true,
      data: summary
    });
  }

  public static getTrends(req: Request, res: Response): void {
    const allProjects = StorageService.getAllProjects();

    // Group by year-quarter or month
    const timelineMap = new Map<string, {
      period: string;
      total_sanctioned: number;
      total_expenditure: number;
      project_count: number;
      high_risk_count: number;
      avg_risk: number;
      risk_sum: number;
    }>();

    for (const p of allProjects) {
      const year = p.sanction_date.substring(0, 4);
      const month = p.sanction_date.substring(5, 7);
      const quarter = Math.ceil(parseInt(month || '1') / 3);
      const periodKey = `${year} Q${quarter}`;

      if (!timelineMap.has(periodKey)) {
        timelineMap.set(periodKey, {
          period: periodKey,
          total_sanctioned: 0,
          total_expenditure: 0,
          project_count: 0,
          high_risk_count: 0,
          avg_risk: 0,
          risk_sum: 0
        });
      }

      const entry = timelineMap.get(periodKey)!;
      entry.total_sanctioned += p.sanctioned_amount;
      entry.total_expenditure += p.actual_expenditure;
      entry.project_count += 1;
      entry.risk_sum += p.risk_score;
      if (p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL') {
        entry.high_risk_count += 1;
      }
    }

    const sortedPeriods = Array.from(timelineMap.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(entry => ({
        period: entry.period,
        total_sanctioned_crore: Number((entry.total_sanctioned / 10000000).toFixed(2)),
        total_expenditure_crore: Number((entry.total_expenditure / 10000000).toFixed(2)),
        project_count: entry.project_count,
        high_risk_count: entry.high_risk_count,
        avg_risk_score: Math.round(entry.risk_sum / entry.project_count)
      }));

    // Sector breakdown
    const sectorMap = new Map<string, { count: number; high_risk: number; total_sanctioned: number }>();
    for (const p of allProjects) {
      if (!sectorMap.has(p.sector)) {
        sectorMap.set(p.sector, { count: 0, high_risk: 0, total_sanctioned: 0 });
      }
      const entry = sectorMap.get(p.sector)!;
      entry.count++;
      entry.total_sanctioned += p.sanctioned_amount;
      if (p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL') {
        entry.high_risk++;
      }
    }

    const sectorBreakdown = Array.from(sectorMap.entries()).map(([sector, data]) => ({
      sector,
      count: data.count,
      high_risk: data.high_risk,
      total_sanctioned_crore: Number((data.total_sanctioned / 10000000).toFixed(2))
    }));

    res.json({
      success: true,
      data: {
        timeline_trends: sortedPeriods,
        sector_breakdown: sectorBreakdown
      }
    });
  }

  public static getGeography(req: Request, res: Response): void {
    const allProjects = StorageService.getAllProjects();

    const stateMap = new Map<string, {
      state: string;
      project_count: number;
      high_risk_count: number;
      critical_count: number;
      total_sanctioned: number;
      avg_risk: number;
      risk_sum: number;
      districts: Set<string>;
    }>();

    for (const p of allProjects) {
      if (!stateMap.has(p.state)) {
        stateMap.set(p.state, {
          state: p.state,
          project_count: 0,
          high_risk_count: 0,
          critical_count: 0,
          total_sanctioned: 0,
          avg_risk: 0,
          risk_sum: 0,
          districts: new Set()
        });
      }

      const st = stateMap.get(p.state)!;
      st.project_count++;
      st.total_sanctioned += p.sanctioned_amount;
      st.risk_sum += p.risk_score;
      st.districts.add(p.district);
      if (p.risk_level === 'HIGH') st.high_risk_count++;
      if (p.risk_level === 'CRITICAL') st.critical_count++;
    }

    const stateSummaries = Array.from(stateMap.values()).map(st => ({
      state: st.state,
      project_count: st.project_count,
      district_count: st.districts.size,
      high_risk_count: st.high_risk_count,
      critical_count: st.critical_count,
      total_sanctioned_crore: Number((st.total_sanctioned / 10000000).toFixed(2)),
      avg_risk_score: Math.round(st.risk_sum / st.project_count)
    })).sort((a, b) => b.critical_count + b.high_risk_count - (a.critical_count + a.high_risk_count));

    // Map markers payload (lightweight for fast rendering)
    const mapMarkers = allProjects.map(p => ({
      project_id: p.project_id,
      work_name: p.work_name,
      state: p.state,
      district: p.district,
      sector: p.sector,
      work_type: p.work_type,
      sanctioned_amount: p.sanctioned_amount,
      actual_expenditure: p.actual_expenditure,
      physical_progress: p.physical_progress_percentage,
      risk_score: p.risk_score,
      risk_level: p.risk_level,
      primary_reason: p.primary_reason,
      latitude: p.latitude,
      longitude: p.longitude
    }));

    res.json({
      success: true,
      data: {
        state_summaries: stateSummaries,
        map_markers: mapMarkers
      }
    });
  }
}
