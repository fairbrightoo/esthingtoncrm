import express from 'express';
import { WalletController } from '../controllers/WalletController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All wallet routes require valid token
router.use(authenticateToken);

// Staff user endpoints
router.get('/my-wallet', WalletController.getMyWallet);
router.get('/tariff', WalletController.getTariff);
router.post('/estimate-cost', WalletController.estimateCost);
router.post('/verify-topup', WalletController.verifyTopup);

// Super Admin exclusive endpoints
router.get('/admin/tariff', requireRole(['SUPER_ADMIN']), WalletController.getAdminTariff);
router.put('/admin/tariff', requireRole(['SUPER_ADMIN']), WalletController.updateAdminTariff);
router.post('/admin/gift', requireRole(['SUPER_ADMIN']), WalletController.giftStaffBalance);
router.get('/admin/staff-wallets', requireRole(['SUPER_ADMIN']), WalletController.getAllStaffWallets);

export default router;
