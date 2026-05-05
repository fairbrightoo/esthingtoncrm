import express from 'express';
import { GlobalUserController } from '../controllers/GlobalUserController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Global User Management
router.get('/global', requireRole(['SUPER_ADMIN', 'GLOBAL_CHAIRMAN']), GlobalUserController.getAllUsers);
router.put('/global/:id', requireRole(['SUPER_ADMIN']), GlobalUserController.updateUser);

// Personal Security
router.post('/change-password', GlobalUserController.changePassword);

// Impersonation (Super Admin only)
router.post('/global/:id/impersonate', requireRole(['SUPER_ADMIN']), GlobalUserController.impersonateUser);

export default router;
