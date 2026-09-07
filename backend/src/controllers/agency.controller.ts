import { Request, Response } from 'express';
import { StorageService } from '../services/storage.service.js';

export class AgencyController {
  public static getAgencies(req: Request, res: Response): void {
    const agencies = StorageService.getAgencyProfiles();
    const { risk_profile, sort_by = 'delayed_projects', order = 'desc' } = req.query;

    let filtered = [...agencies];
    if (risk_profile && typeof risk_profile === 'string') {
      filtered = filtered.filter(a => a.risk_profile === risk_profile);
    }

    const sorted = filtered.sort((a, b) => {
      const fieldA = (a as any)[sort_by as string] ?? 0;
      const fieldB = (b as any)[sort_by as string] ?? 0;
      return order === 'desc' ? fieldB - fieldA : fieldA - fieldB;
    });

    res.json({
      success: true,
      total_agencies: sorted.length,
      data: sorted
    });
  }

  // Alias
  public static getAllAgencies(req: Request, res: Response): void {
    return AgencyController.getAgencies(req, res);
  }

  public static getAgencyByName(req: Request, res: Response): void {
    const name = String(req.params.name);
    const agencies = StorageService.getAgencyProfiles();
    const agency = agencies.find(a => a.agency_name.toLowerCase() === decodeURIComponent(name).toLowerCase());

    if (!agency) {
      res.status(404).json({ success: false, message: `Agency '${name}' not found` });
      return;
    }

    // Projects managed by this agency
    const projects = StorageService.getAllProjects().filter(p => p.implementing_agency.toLowerCase() === agency.agency_name.toLowerCase());

    res.json({
      success: true,
      data: {
        ...agency,
        projects
      }
    });
  }
}
