import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { RequisitionController } from '../controllers/RequisitionController.js';

const router = express.Router();

router.post('/create', authenticateToken, RequisitionController.createRequisition);
router.get('/', authenticateToken, RequisitionController.getRequisitions);
router.put('/md-approve/:id', authenticateToken, RequisitionController.processApproval);
router.put('/accountant-disburse/:id', authenticateToken, RequisitionController.disburseFunds);
router.get('/pending-commissions', authenticateToken, RequisitionController.getPendingCommissions);
router.put('/pay-commission/:paymentId', authenticateToken, RequisitionController.payCommission);

export default router;
