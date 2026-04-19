import express from 'express';
import { HRSettingsController } from '../controllers/HRSettingsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', HRSettingsController.getSettings);
router.put('/', HRSettingsController.updateSettings);

export default router;
