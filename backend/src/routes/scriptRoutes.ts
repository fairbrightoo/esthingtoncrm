import express from 'express';
import { CallScriptController } from '../controllers/CallScriptController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', CallScriptController.getScripts);
router.post('/', CallScriptController.createScript);
router.put('/:id', CallScriptController.updateScript);
router.delete('/:id', CallScriptController.deleteScript);

export default router;
