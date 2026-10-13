import express from 'express';
import { BulkMessagingController } from '../controllers/BulkMessagingController.js';
import { BroadcastContactController } from '../controllers/BroadcastContactController.js';
import { BroadcastCampaignController } from '../controllers/BroadcastCampaignController.js';

const router = express.Router();

// Drafting & Processing
router.post('/draft', BulkMessagingController.draftMessage);
router.post('/send-batch', BulkMessagingController.processBatch);

// Phonebook & Contact Management
router.get('/contacts', BroadcastContactController.getContacts);
router.get('/contacts/audience', BroadcastContactController.getAudienceContacts);
router.get('/contacts/filters', BroadcastContactController.getFiltersMeta);
router.post('/contacts', BroadcastContactController.createContact);
router.put('/contacts/:id', BroadcastContactController.updateContact);
router.delete('/contacts/:id', BroadcastContactController.deleteContact);
router.post('/contacts/sync', BroadcastContactController.syncContacts);

// Campaign History & Logs
router.post('/campaigns', BroadcastCampaignController.recordCampaign);
router.get('/campaigns', BroadcastCampaignController.getCampaigns);
router.get('/campaigns/:id/logs', BroadcastCampaignController.getCampaignLogs);
router.get('/campaigns/:id/failed', BroadcastCampaignController.getFailedRecipients);

export default router;

