import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AICoachController } from '../controllers/AICoachController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'temp_ai');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    }
});
const upload = multer({ storage });

router.use(authenticateToken);

// Marketer Endpoints
router.post('/chat/message', AICoachController.chatWithCoach);
router.post('/chat/reset', AICoachController.resetThread);

// Super Admin / Managing Director Endpoint
router.post('/knowledge/upload', upload.array('documents', 10), AICoachController.uploadKnowledgeDocument);
router.get('/knowledge/files', AICoachController.listKnowledgeFiles);
router.delete('/knowledge/files/:fileId', AICoachController.deleteKnowledgeFile);

export default router;
