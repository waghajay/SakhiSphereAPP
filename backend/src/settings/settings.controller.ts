import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SettingsService } from './settings.service';

export class SettingsController {
  /**
   * GET /api/settings (Protected)
   */
  static async getSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const settings = await SettingsService.getSettings(req.user.id);
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/settings/notifications (Protected)
   */
  static async updateNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const updated = await SettingsService.updateNotifications(req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Notification settings updated',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/settings/privacy (Protected)
   */
  static async updatePrivacy(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const updated = await SettingsService.updatePrivacy(req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Privacy settings updated',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/settings/password (Protected)
   */
  static async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password (min 6 characters) are required',
        });
        return;
      }

      const result = await SettingsService.changePassword(req.user.id, currentPassword, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
