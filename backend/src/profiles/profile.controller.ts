import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ProfileService } from './profile.service';

export class ProfileController {
  /**
   * GET /api/profile (Protected)
   */
  static async getMyProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const profile = await ProfileService.getProfile(req.user.id);
      res.status(200).json({ success: true, data: { profile } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/profile (Protected)
   */
  static async updateMyProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { name, bio, location, occupation, avatar_url } = req.body;
      const updatedProfile = await ProfileService.updateProfile(req.user.id, {
        name,
        bio,
        location,
        occupation,
        avatar_url,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile: updatedProfile },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/profile/:userId (Protected or Public)
   */
  static async getPublicProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const targetUserId = parseInt(rawId, 10);
      if (isNaN(targetUserId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const profile = await ProfileService.getPublicProfile(targetUserId);
      res.status(200).json({ success: true, data: { profile } });
    } catch (error) {
      next(error);
    }
  }
}
