import { Request, Response } from 'express';
import { getSystemConfig, updateSystemConfig, resetSystemConfig } from '../config/thresholds.js';
import { StorageService } from '../services/storage.service.js';

export class ConfigController {
  public static getConfig(req: Request, res: Response): void {
    res.json({
      success: true,
      data: getSystemConfig()
    });
  }

  public static updateConfig(req: Request, res: Response): void {
    const updated = updateSystemConfig(req.body);
    // Automatically re-run risk analysis with updated weights/thresholds
    StorageService.runFullAnalysis();
    res.json({
      success: true,
      message: 'System risk weights and thresholds updated. Re-analyzed entire project catalog.',
      data: updated
    });
  }

  public static resetConfig(req: Request, res: Response): void {
    const reset = resetSystemConfig();
    StorageService.runFullAnalysis();
    res.json({
      success: true,
      message: 'Configuration restored to standard default weights and thresholds.',
      data: reset
    });
  }
}
