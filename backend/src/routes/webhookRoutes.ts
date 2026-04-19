import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController.js';

const router = Router();

// Facebook Meta Webhook Verification
router.get('/whatsapp', WebhookController.verifyWhatsAppWebhook);

// Facebook Meta Webhook Events (Inbound messages, delivery receipts)
router.post('/whatsapp', WebhookController.handleWhatsAppWebhook);

// Meta Lead Ads Webhook
router.get('/meta-ads', WebhookController.verifyMetaAdsWebhook);
router.post('/meta-ads/:companyId', WebhookController.handleMetaLeadAdWebhook);

export default router;
