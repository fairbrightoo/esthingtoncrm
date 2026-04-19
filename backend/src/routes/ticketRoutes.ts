import express from 'express';
import { HelpdeskTicketController } from '../controllers/HelpdeskTicketController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', HelpdeskTicketController.create);
router.get('/', HelpdeskTicketController.getAll);
router.put('/:id', HelpdeskTicketController.update);
router.delete('/:id', HelpdeskTicketController.delete);

export default router;
