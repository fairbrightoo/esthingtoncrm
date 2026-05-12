import express from 'express';
import { CallScriptController } from '../controllers/CallScriptController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

const allowedRoles = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'CUSTOMER_CARE', 'MARKETER', 'TEAM_LEAD', 'BDM', 'HEAD_BDD'];

router.get('/', CallScriptController.getScripts);
router.post('/', requireRole(allowedRoles), CallScriptController.createScript);
router.put('/:id', requireRole(allowedRoles), CallScriptController.updateScript);
router.delete('/:id', requireRole(allowedRoles), CallScriptController.deleteScript);

export default router;
