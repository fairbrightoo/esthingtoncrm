import express from 'express';
import { GMDAnalyticsController } from '../controllers/GMDAnalyticsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/metrics', GMDAnalyticsController.getGlobalMetrics);

export default router;
