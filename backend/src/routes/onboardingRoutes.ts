import express from 'express';
import { OnboardingController } from '../controllers/OnboardingController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected route
router.post('/bulk', authenticateToken, upload.single('file'), OnboardingController.bulkUpload);

export default router;
