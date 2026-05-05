import express from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { GlobalAnalyticsController } from '../controllers/GlobalAnalyticsController.js';
import { EnterpriseReportController } from '../controllers/EnterpriseReportController.js';
import { MDReportController } from '../controllers/MDReportController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Consolidated Endpoint
router.get('/stats', DashboardController.getDashboardStats);
router.get('/global', requireRole(['SUPER_ADMIN', 'GLOBAL_CHAIRMAN']), GlobalAnalyticsController.getGlobalStats);

// Enterprise Reporting Endpoints
router.get('/enterprise/financial', requireRole(['SUPER_ADMIN', 'GLOBAL_CHAIRMAN']), EnterpriseReportController.getFinancialAudit);
router.get('/enterprise/marketer-kpi', requireRole(['SUPER_ADMIN', 'GLOBAL_CHAIRMAN']), EnterpriseReportController.getMarketerKPI);

// Managing Director Intelligence API
router.get('/reports/md', MDReportController.getMDAnalytics);

export default router;
