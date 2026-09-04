import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, ProfileController.getMyProfile);
router.put('/', authenticateToken, ProfileController.updateMyProfile);
router.get('/:userId', authenticateToken, ProfileController.getPublicProfile);

export default router;
