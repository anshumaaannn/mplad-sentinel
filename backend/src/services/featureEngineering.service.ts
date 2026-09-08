import { Project } from '../types/project.js';

export interface EngineeredFeatures {
  project_id: string;
  expenditure_ratio: number;
  cost_overrun_ratio: number;
  expenditure_progress_gap: number;
  planned_duration_days: number;
  actual_execution_days: number;
  delay_days: number;
  is_delayed: boolean;
  unit_cost: number;
  progress_efficiency: number;
  is_completed: boolean;
  is_stalled: boolean;
  project_age_days: number;
}

export class FeatureEngineeringService {
  private static referenceDate = new Date('2025-06-01');

  public static calculateDaysBetween(d1: string | Date, d2: string | Date): number {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    const diffTime = date2.getTime() - date1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  public static extractFeatures(project: Project): EngineeredFeatures {
    const sanctioned = Math.max(1, project.sanctioned_amount);
    const estimated = Math.max(1, project.estimated_cost);
    const expenditure = project.actual_expenditure;
    const progress = project.physical_progress_percentage;

    const expenditure_ratio = expenditure / sanctioned;
    const cost_overrun_ratio = (expenditure - estimated) / estimated;
    
    // Expenditure % vs physical progress % gap
    const expenditure_pct = (expenditure / sanctioned) * 100;
    const expenditure_progress_gap = expenditure_pct - progress;

    const planned_duration_days = Math.max(1, this.calculateDaysBetween(project.start_date, project.expected_completion_date));
    
    const endDate = project.completion_date 
      ? new Date(project.completion_date) 
      : this.referenceDate;
    
    const actual_execution_days = Math.max(1, this.calculateDaysBetween(project.start_date, endDate));
    
    const expectedEndDate = new Date(project.expected_completion_date);
    const delay_days = Math.max(0, Math.round((endDate.getTime() - expectedEndDate.getTime()) / (1000 * 60 * 60 * 24)));
    const is_delayed = delay_days > 30;

    const project_age_days = Math.max(1, this.calculateDaysBetween(project.sanction_date || project.start_date, endDate));

    const qty = Math.max(0.1, project.quantity || 1);
    const unit_cost = expenditure / qty;

    const progress_efficiency = progress / actual_execution_days;

    return {
      project_id: project.project_id,
      expenditure_ratio,
      cost_overrun_ratio,
      expenditure_progress_gap,
      planned_duration_days,
      actual_execution_days,
      delay_days,
      is_delayed,
      unit_cost,
      progress_efficiency,
      is_completed: project.status === 'Completed',
      is_stalled: project.status === 'Stalled' || (project.status === 'In Progress' && delay_days > 180 && progress < 50),
      project_age_days
    };
  }

  public static extractAllFeatures(projects: Project[]): Map<string, EngineeredFeatures> {
    const map = new Map<string, EngineeredFeatures>();
    for (const p of projects) {
      map.set(p.project_id, this.extractFeatures(p));
    }
    return map;
  }
}
