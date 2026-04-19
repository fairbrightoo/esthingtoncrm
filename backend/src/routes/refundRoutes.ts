import express from 'express';
import { RefundController } from '../controllers/RefundController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authenticateToken, RefundController.createRefundRequest);
router.get('/', authenticateToken, RefundController.getRefunds);
router.put('/:id/status', authenticateToken, RefundController.updateRefundStatus);

export default router;
