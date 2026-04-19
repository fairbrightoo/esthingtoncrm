import express from 'express';
import { AnnouncementController } from '../controllers/AnnouncementController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', AnnouncementController.getAnnouncements);
router.post('/', AnnouncementController.createAnnouncement);
router.delete('/:id', AnnouncementController.deleteAnnouncement);

export default router;
