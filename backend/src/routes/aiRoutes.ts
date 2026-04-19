import express from 'express';
import multer from 'multer';
import { AICoachController } from '../controllers/AICoachController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
// Use disk storage temporarily for multer so fs.createReadStream can pipe it to OpenAI
const upload = multer({ dest: 'uploads/temp_ai/' });

router.use(authenticateToken);

// Marketer Endpoints
router.post('/chat/message', AICoachController.chatWithCoach);
router.post('/chat/reset', AICoachController.resetThread);

// Super Admin / Managing Director Endpoint
router.post('/knowledge/upload', upload.array('documents', 10), AICoachController.uploadKnowledgeDocument);

export default router;
