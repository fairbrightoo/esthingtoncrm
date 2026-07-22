import { Router } from 'express';
import { GlobalTreasuryController } from '../controllers/GlobalTreasuryController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all treasury routes to Super Admin and Global Chairman
router.use(authenticateToken);
router.use(requireRole(['SUPER_ADMIN', 'GLOBAL_CHAIRMAN']));

// Get combined pending approvals (Payments and Requisitions)
router.get('/pending-approvals', GlobalTreasuryController.getPendingApprovals);
router.get('/approval-history', GlobalTreasuryController.getApprovalHistory);

// Overrides
router.post('/payments/:paymentId/approve', GlobalTreasuryController.approvePaymentOverride);
router.post('/requisitions/:requisitionId/approve', GlobalTreasuryController.approveRequisitionOverride);

// Commissions
router.get('/commissions', GlobalTreasuryController.getPendingCommissions);
router.post('/commissions/bulk-mark-paid', GlobalTreasuryController.markCommissionsPaid);

export default router;
