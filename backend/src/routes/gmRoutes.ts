import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { BranchBroadcastController } from '../controllers/BranchBroadcastController.js';
import { GMNetworkController } from '../controllers/GMNetworkController.js';
import { HRRecommendationController } from '../controllers/HRRecommendationController.js';

const router = express.Router();

// Branch Broadcasts
router.post('/broadcasts', authenticateToken, BranchBroadcastController.createBroadcast);
router.get('/broadcasts', authenticateToken, BranchBroadcastController.getBroadcasts);

// GM Network
router.post('/network/messages', authenticateToken, GMNetworkController.sendMessage);
router.get('/network/messages', authenticateToken, GMNetworkController.getConversations);
router.get('/network/directory', authenticateToken, GMNetworkController.getNetworkDirectory);

// HR Recommendations
router.post('/hr/recommendations', authenticateToken, HRRecommendationController.createRecommendation);
router.get('/hr/recommendations', authenticateToken, HRRecommendationController.getRecommendations);

export default router;
