import express from 'express';
import { EventController } from '../controllers/EventController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', EventController.getUpcomingEvents);
router.get('/clients', EventController.getClientBirthdays);
router.post('/holidays', EventController.createHoliday);
router.delete('/holidays/:id', EventController.deleteHoliday);

export default router;
