import express from 'express';
import { ExecutiveMemoController } from '../controllers/ExecutiveMemoController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', ExecutiveMemoController.getMemos);
router.post('/', ExecutiveMemoController.sendMemo);
router.put('/:id/respond', ExecutiveMemoController.respondToMemo);
router.get('/contacts', ExecutiveMemoController.getMemoContacts);

export default router;
