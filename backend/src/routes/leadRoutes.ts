
import express from 'express';
import { LeadController } from '../controllers/LeadController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public Endpoints
router.post('/widget', LeadController.receiveWidgetLead);

// Apply Auth Middleware to all subsequent routes
router.use(authenticateToken);

router.get('/', LeadController.getLeads);
router.get('/:id', LeadController.getLeadById); // New Route
router.post('/bulk', upload.single('file'), LeadController.bulkCreate);
router.post('/', LeadController.createLead);
router.patch('/:id/assign', LeadController.assignLead);
router.put('/:id', upload.fields([{ name: 'profilePicture', maxCount: 1 }, { name: 'govtId', maxCount: 1 }]), LeadController.updateLead);
router.delete('/:id', LeadController.deleteLead);
import { ActivityController } from '../controllers/ActivityController.js';

router.patch('/:id/verify', LeadController.toggleVerification);

// Activity Routes (Nested)
router.get('/:leadId/activities', ActivityController.getActivities);
router.post('/:leadId/activities', ActivityController.createActivity);
router.delete('/:leadId/activities/:activityId', ActivityController.deleteActivity);

export default router;
