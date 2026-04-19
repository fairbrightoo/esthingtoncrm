import express from 'express';
import { PayrollController } from '../controllers/PayrollController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
// Only Accountant, Branch Admin, Super Admin, MD can view/run payroll
router.use(requireRole(['ACCOUNTANT', 'BRANCH_ADMIN', 'SUPER_ADMIN', 'MANAGING_DIRECTOR']));

router.get('/', PayrollController.getBranchPayroll);
router.post('/disburse/:id', PayrollController.disbursePayroll);
router.post('/disburse-mass', PayrollController.disburseAllPending);

export default router;
