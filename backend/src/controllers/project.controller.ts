import { Request, Response } from 'express';
import { StorageService } from '../services/storage.service.js';
import { Project, RiskLevel } from '../types/project.js';
import { parse } from 'csv-parse/sync';

export class ProjectController {
  public static getProjects(req: Request, res: Response): void {
    const {
      state,
      district,
      sector,
      work_type,
      risk_level,
      status,
      search,
      sort_by = 'risk_score',
      sort_order = 'desc',
      page = '1',
      limit = '50'
    } = req.query;

    let projects = StorageService.getAllProjects();

    // Filters
    if (state && typeof state === 'string') {
      projects = projects.filter(p => p.state.toLowerCase() === state.toLowerCase());
    }
    if (district && typeof district === 'string') {
      projects = projects.filter(p => p.district.toLowerCase() === district.toLowerCase());
    }
    if (sector && typeof sector === 'string') {
      projects = projects.filter(p => p.sector.toLowerCase() === sector.toLowerCase());
    }
    if (work_type && typeof work_type === 'string') {
      projects = projects.filter(p => p.work_type.toLowerCase() === work_type.toLowerCase());
    }
    if (risk_level && typeof risk_level === 'string') {
      const levels = risk_level.toUpperCase().split(',');
      projects = projects.filter(p => levels.includes(p.risk_level));
    }
    if (status && typeof status === 'string') {
      projects = projects.filter(p => p.status.toLowerCase() === status.toLowerCase());
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      projects = projects.filter(p =>
        p.project_id.toLowerCase().includes(q) ||
        p.work_name.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.implementing_agency.toLowerCase().includes(q) ||
        p.mp_name.toLowerCase().includes(q)
      );
    }

    // Sorting
    projects.sort((a, b) => {
      let valA: any = (a as any)[sort_by as string];
      let valB: any = (b as any)[sort_by as string];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return sort_order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sort_order === 'asc' ? valA - valB : valB - valA;
    });

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 50);
    const total = projects.length;
    const paginated = projects.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
      data: paginated
    });
  }

  public static getProjectById(req: Request, res: Response): void {
    const { id } = req.params;
    const project = StorageService.getProjectById(id);

    if (!project) {
      res.status(404).json({ success: false, message: `Project ${id} not found` });
      return;
    }

    res.json({ success: true, data: project });
  }

  public static getProjectRisk(req: Request, res: Response): void {
    const { id } = req.params;
    const analysis = StorageService.getRiskAnalysisById(id);

    if (!analysis) {
      res.status(404).json({ success: false, message: `Risk analysis for ${id} not found` });
      return;
    }

    res.json({ success: true, data: analysis });
  }

  public static getProjectExplanation(req: Request, res: Response): void {
    const { id } = req.params;
    const project = StorageService.getProjectById(id);

    if (!project) {
      res.status(404).json({ success: false, message: `Project ${id} not found` });
      return;
    }

    res.json({
      success: true,
      data: {
        project_id: project.project_id,
        work_name: project.work_name,
        risk_score: project.risk_score,
        risk_level: project.risk_level,
        primary_reason: project.primary_reason,
        evidences: project.evidences,
        peer_benchmark: project.peer_benchmark,
        disclaimer: 'Risk indicators represent algorithmic statistical deviations and require administrative ground verification. They do not constitute determination of irregularity.'
      }
    });
  }

  public static getProjectSimilar(req: Request, res: Response): void {
    const { id } = req.params;
    const project = StorageService.getProjectById(id);

    if (!project) {
      res.status(404).json({ success: false, message: `Project ${id} not found` });
      return;
    }

    res.json({
      success: true,
      project_id: id,
      duplicate_candidates: project.duplicate_candidates
    });
  }

  public static getAllDuplicates(req: Request, res: Response): void {
    const pairs = StorageService.getAllDuplicatePairs();
    res.json({
      success: true,
      total_pairs: pairs.length,
      data: pairs
    });
  }

  public static uploadCSV(req: Request, res: Response): void {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No CSV file uploaded' });
      return;
    }

    try {
      const csvContent = req.file.buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const validProjects: Project[] = [];
      const validationErrors: Array<{ row: number; project_id?: string; error: string }> = [];

      records.forEach((row: any, idx: number) => {
        const rowNum = idx + 2; // account for header
        if (!row.project_id || !row.work_name) {
          validationErrors.push({ row: rowNum, error: 'Missing required field: project_id or work_name' });
          return;
        }

        const sanctioned = parseFloat(row.sanctioned_amount);
        if (isNaN(sanctioned) || sanctioned < 0) {
          validationErrors.push({ row: rowNum, project_id: row.project_id, error: 'Invalid sanctioned_amount numeric value' });
          return;
        }

        const estimated = parseFloat(row.estimated_cost) || sanctioned;
        const actual = parseFloat(row.actual_expenditure) || 0;
        const progress = parseFloat(row.physical_progress_percentage) || 0;
        const lat = parseFloat(row.latitude) || 20.5937;
        const lng = parseFloat(row.longitude) || 78.9629;
        const qty = parseFloat(row.quantity) || 1;
        const beneficiaries = parseInt(row.beneficiary_count) || 1000;

        validProjects.push({
          project_id: row.project_id.trim(),
          work_name: row.work_name.trim(),
          state: row.state?.trim() || 'General',
          district: row.district?.trim() || 'General',
          constituency: row.constituency?.trim() || `${row.district || 'General'} Constituency`,
          mp_name: row.mp_name?.trim() || 'Hon. MP',
          sector: row.sector?.trim() || 'Infrastructure',
          work_type: row.work_type?.trim() || 'Road Construction',
          sanctioned_amount: sanctioned,
          estimated_cost: estimated,
          actual_expenditure: actual,
          sanction_date: row.sanction_date?.trim() || '2024-01-01',
          start_date: row.start_date?.trim() || '2024-02-01',
          expected_completion_date: row.expected_completion_date?.trim() || '2024-12-31',
          completion_date: row.completion_date?.trim() || null,
          status: (row.status?.trim() as any) || 'In Progress',
          physical_progress_percentage: Math.min(100, Math.max(0, progress)),
          implementing_agency: row.implementing_agency?.trim() || 'District Engineering Cell',
          latitude: lat,
          longitude: lng,
          beneficiary_count: beneficiaries,
          unit: row.unit?.trim() || 'unit',
          quantity: qty,
          created_at: new Date().toISOString()
        });
      });

      if (validProjects.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid records could be processed from the CSV file.',
          errors: validationErrors
        });
        return;
      }

      // Replace or append
      const append = req.body.mode === 'append';
      StorageService.addProjects(validProjects, append);

      res.json({
        success: true,
        message: `Successfully ingested and analyzed ${validProjects.length} projects.`,
        total_ingested: validProjects.length,
        errors_count: validationErrors.length,
        validation_errors: validationErrors
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `CSV parsing failed: ${err.message}` });
    }
  }

  public static reAnalyze(req: Request, res: Response): void {
    try {
      StorageService.runFullAnalysis();
      const summary = StorageService.getDashboardSummary();
      res.json({
        success: true,
        message: 'Complete multi-signal risk intelligence re-analysis executed successfully.',
        data: summary
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Analysis failed: ${err.message}` });
    }
  }

  public static resetDemo(req: Request, res: Response): void {
    StorageService.resetToDemo();
    const summary = StorageService.getDashboardSummary();
    res.json({
      success: true,
      message: 'Restored standard synthetic demo dataset (250 projects with benchmark anomalies).',
      data: summary
    });
  }
}
