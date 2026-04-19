import { Router } from 'express';
import { BudgetController } from '../controllers/BudgetController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/create', authenticateToken, BudgetController.createBudget);
router.get('/', authenticateToken, BudgetController.getBudgets);
router.put('/md-approve/:id', authenticateToken, BudgetController.processApproval);

export default router;
