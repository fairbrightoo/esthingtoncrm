import express from 'express';
import { GlobalUserController } from '../controllers/GlobalUserController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Global User Management
router.get('/global', requireRole(['SUPER_ADMIN', 'GLOBAL_CHAIRMAN']), GlobalUserController.getAllUsers);
router.put('/global/:id', requireRole(['SUPER_ADMIN']), GlobalUserController.updateUser);

// Global Chairman Management
router.get('/global/chairman', requireRole(['SUPER_ADMIN']), GlobalUserController.getGlobalChairman);
router.post('/global/chairman', requireRole(['SUPER_ADMIN']), GlobalUserController.saveGlobalChairman);
router.delete('/global/chairman', requireRole(['SUPER_ADMIN']), GlobalUserController.deleteGlobalChairman);

// Personal Profile & Security
router.get('/profile/:id', GlobalUserController.getProfile);
router.put('/profile/:id', upload.any(), GlobalUserController.updateProfile);
router.post('/change-password', GlobalUserController.changePassword);

// Impersonation (Super Admin only)
router.post('/global/:id/impersonate', requireRole(['SUPER_ADMIN']), GlobalUserController.impersonateUser);

export default router;
