import express from 'express';
import { GlobalUserController } from '../controllers/GlobalUserController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Global User Management (Super Admin only usually, but handled by UI hiding for now)
router.get('/global', GlobalUserController.getAllUsers);
router.put('/global/:id', GlobalUserController.updateUser);

// Personal Security
router.post('/change-password', GlobalUserController.changePassword);

// Impersonation (Super Admin only)
router.post('/global/:id/impersonate', GlobalUserController.impersonateUser);

export default router;
