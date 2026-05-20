import express from 'express';
import { ReferralController } from '../controllers/ReferralController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/generate', ReferralController.generateCode);
router.get('/my-codes', ReferralController.getMyCodes);
router.get('/my-network', ReferralController.getMyNetwork);
router.get('/validate/:code', ReferralController.validateCode);

export default router;
