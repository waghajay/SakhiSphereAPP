import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { VerificationService } from './verification.service';

export class VerificationController {
  /**
   * GET /api/verification/status (Protected)
   */
  static async getStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const status = await VerificationService.getStatus(req.user.id);
      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/verification/request (Protected)
   */
  static async submitRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { verification_type, document_note, document_url, autoApprove } = req.body;

      if (!verification_type) {
        res.status(400).json({ success: false, message: 'verification_type is required' });
        return;
      }

      const result = await VerificationService.submitRequest(req.user.id, {
        verification_type,
        document_note,
        document_url,
        autoApprove: autoApprove !== undefined ? Boolean(autoApprove) : true, // default to autoApprove for college project demo
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
