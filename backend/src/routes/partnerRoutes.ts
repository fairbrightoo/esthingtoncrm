import express from 'express';
import { PartnerApplicationController } from '../controllers/PartnerApplicationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// PUBLIC
router.post('/submit', PartnerApplicationController.submitApplication);

// PROTECTED
router.get('/applications', authenticateToken, PartnerApplicationController.getApplications);
router.put('/applications/:id/vet', authenticateToken, PartnerApplicationController.vetApplication);
router.put('/applications/:id/approve', authenticateToken, PartnerApplicationController.approveApplication);
router.put('/applications/:id/reject', authenticateToken, PartnerApplicationController.rejectApplication);

export default router;
