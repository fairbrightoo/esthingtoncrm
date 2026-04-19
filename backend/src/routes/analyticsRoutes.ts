import express from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { GlobalAnalyticsController } from '../controllers/GlobalAnalyticsController.js';
import { EnterpriseReportController } from '../controllers/EnterpriseReportController.js';
import { MDReportController } from '../controllers/MDReportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Consolidated Endpoint
router.get('/stats', DashboardController.getDashboardStats);
router.get('/global', GlobalAnalyticsController.getGlobalStats);

// Enterprise Reporting Endpoints
router.get('/enterprise/financial', EnterpriseReportController.getFinancialAudit);
router.get('/enterprise/marketer-kpi', EnterpriseReportController.getMarketerKPI);

// Managing Director Intelligence API
router.get('/reports/md', MDReportController.getMDAnalytics);

export default router;
