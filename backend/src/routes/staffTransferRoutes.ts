import express from 'express';
import { StaffTransferController } from '../controllers/StaffTransferController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // Protect all transfer routes

// 1. Initiate transfer (HR / Management)
router.post('/initiate', StaffTransferController.initiateTransfer);

// 2. Get list of transfers (scoped by role: outbound, inbound, all, or personal)
router.get('/', StaffTransferController.getTransfers);

// 3. Get single transfer details
router.get('/:transferId', StaffTransferController.getTransferDetails);

// 4. Releasing Branch MD Sign-off (Approve Release or Reject)
router.put('/:transferId/releasing-signoff', StaffTransferController.releasingMdSignoff);

// 5. Receiving Branch MD Sign-off (Accept Intake or Decline)
router.put('/:transferId/receiving-signoff', StaffTransferController.receivingMdSignoff);

// 6. Cancel Transfer (HR / Releasing MD)
router.put('/:transferId/cancel', StaffTransferController.cancelTransfer);

export default router;
