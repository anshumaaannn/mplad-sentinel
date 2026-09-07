import { Request, Response } from 'express';
import { StorageService } from '../services/storage.service.js';

export class AgencyController {
  public static getAgencies(req: Request, res: Response): void {
    const agencies = StorageService.getAgencyProfiles();
    
    // Sort by risk profile severity and high risk rate
    const sorted = [...agencies].sort((a, b) => {
      const riskOrder: Record<string, number> = { HIGH: 4, ELEVATED: 3, MODERATE: 2, LOW: 1 };
      const diff = (riskOrder[b.risk_profile] || 0) - (riskOrder[a.risk_profile] || 0);
      if (diff !== 0) return diff;
      return b.high_risk_rate_pct - a.high_risk_rate_pct;
    });

    res.json({
      success: true,
      total_agencies: sorted.length,
      data: sorted
    });
  }

  public static getAgencyByName(req: Request, res: Response): void {
    const { name } = req.params;
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
