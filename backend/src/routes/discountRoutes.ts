import express from 'express';
import { DiscountController } from '../controllers/DiscountController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', DiscountController.generateDiscount);
router.get('/', DiscountController.getBranchDiscounts);
router.patch('/:id/toggle', DiscountController.toggleDiscountStatus);

export default router;
