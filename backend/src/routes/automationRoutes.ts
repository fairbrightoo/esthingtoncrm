import express from 'express';
import { AutomationController } from '../controllers/AutomationController.js';

const router = express.Router();

// Outbound from logic (not exposed here usually, but here are inbound)

// Inbound from n8n
router.get('/stale-leads', AutomationController.getStaleLeads);
router.post('/webhooks/inbound-activity', AutomationController.handleInboundActivity);

export default router;
