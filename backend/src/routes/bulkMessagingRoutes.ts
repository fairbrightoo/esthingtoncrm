import express from 'express';
import { BulkMessagingController } from '../controllers/BulkMessagingController.js';

const router = express.Router();

router.post('/draft', BulkMessagingController.draftMessage);
router.post('/send-batch', BulkMessagingController.processBatch);

export default router;
