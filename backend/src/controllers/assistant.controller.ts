import { Request, Response } from 'express';
import { AssistantService } from '../services/assistant.service.js';

export class AssistantController {
  public static query(req: Request, res: Response): void {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, message: 'Query string is required in request body' });
      return;
    }

    try {
      const result = AssistantService.processQuery(query);
      res.json({
        success: true,
        data: result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Assistant error: ${err.message}` });
    }
  }
}
