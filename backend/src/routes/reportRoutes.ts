import express from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/sales', ReportController.getSalesReport);

export default router;
