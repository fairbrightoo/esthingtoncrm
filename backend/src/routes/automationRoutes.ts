import express from 'express';
import { AutomationController } from '../controllers/AutomationController.js';

const router = express.Router();

// Outbound from logic (not exposed here usually, but here are inbound)

import { authenticateToken } from '../middleware/authMiddleware.js';

// Inbound from n8n
router.get('/stale-leads', AutomationController.getStaleLeads);
router.post('/webhooks/inbound-activity', AutomationController.handleInboundActivity);

// AI Outreach
router.get('/daily-outreach/history', authenticateToken, AutomationController.getDailyOutreachHistory);
router.post('/daily-outreach/trigger-test', authenticateToken, AutomationController.triggerDailyOutreachTest);

export default router;
