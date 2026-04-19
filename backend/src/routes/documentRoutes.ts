import { Router } from 'express';
import { DocumentTemplateController } from '../controllers/DocumentTemplateController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/templates', DocumentTemplateController.getTemplates);
router.post('/templates', DocumentTemplateController.saveTemplate);

export default router;
