import { Router } from 'express';
import { VerificationController } from './verification.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/status', authenticateToken, VerificationController.getStatus);
router.post('/request', authenticateToken, VerificationController.submitRequest);

export default router;
