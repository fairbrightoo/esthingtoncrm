import express from 'express';
import { HRAnalyticsController } from '../controllers/HRAnalyticsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/', HRAnalyticsController.getAnalytics);

export default router;
