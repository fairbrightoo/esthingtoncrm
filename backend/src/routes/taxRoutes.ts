import express from 'express';
import { TaxController } from '../controllers/TaxController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['ACCOUNTANT', 'SUPER_ADMIN', 'MANAGING_DIRECTOR'])); // Restricted financial action

router.get('/estimates', TaxController.getComplianceEstimates);
router.post('/remittance', TaxController.logRemittance);

export default router;
