import express from 'express';
import { SelfServiceAttendanceController } from '../controllers/SelfServiceAttendanceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Kiosk Routes (Public/Proxy)
router.get('/kiosk/proxy-image', SelfServiceAttendanceController.proxyImage);

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Employee Self-Service Routes
router.get('/my-records', SelfServiceAttendanceController.getMyRecords);
router.post('/clock-in', SelfServiceAttendanceController.clockIn);
router.post('/clock-out', SelfServiceAttendanceController.clockOut);

// Kiosk Routes

router.post('/kiosk/verify-id', authenticateToken, SelfServiceAttendanceController.verifyKioskId);
router.post('/kiosk/clock-in', authenticateToken, SelfServiceAttendanceController.kioskClockIn);
router.post('/kiosk/clock-out', authenticateToken, SelfServiceAttendanceController.kioskClockOut);

export default router;
