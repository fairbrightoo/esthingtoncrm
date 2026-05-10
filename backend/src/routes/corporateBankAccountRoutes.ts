import express from 'express';
import { CorporateBankAccountController } from '../controllers/CorporateBankAccountController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Global accounts for dropdown
router.get('/global', CorporateBankAccountController.getGlobalActiveAccounts);

// Branch specific routes for Accountant
router.get('/', CorporateBankAccountController.getBranchAccounts);
router.post('/', CorporateBankAccountController.createAccount);
router.put('/:id', CorporateBankAccountController.updateAccount);
router.delete('/:id', CorporateBankAccountController.deleteAccount);

export default router;
