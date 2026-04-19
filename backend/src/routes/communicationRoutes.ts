
import express from 'express';
import { CommunicationController } from '../controllers/CommunicationController.js';
import { CampaignController } from '../controllers/CampaignController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'media');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `media-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

router.use(authenticateToken);

router.post('/send', CommunicationController.sendMessage);
router.post('/upload-media', upload.single('media'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/media/${req.file.filename}`;
    res.json({ url: fileUrl });
});
router.post('/meta-upload', upload.single('media'), CommunicationController.uploadMetaMedia);
router.get('/logs', CommunicationController.getAllLogs);
router.get('/logs/:leadId', CommunicationController.getLeadLogs);
router.post('/templates', CommunicationController.createTemplate);
router.get('/templates', CommunicationController.getTemplates);
router.get('/whatsapp-templates', CommunicationController.getWhatsAppTemplates);

// Campaign Routes
router.post('/campaigns', CampaignController.createCampaign); // Create Draft
router.get('/campaigns', CampaignController.getCampaigns);   // List All
router.post('/campaigns/:id/send', CampaignController.sendCampaign); // Execute
router.get('/campaigns/:id/logs', CampaignController.getCampaignLogs);
router.post('/campaigns/:id/resend-failed', CampaignController.resendFailed);

export default router;
