import express from 'express';
import { SelfServiceAttendanceController } from '../controllers/SelfServiceAttendanceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Employee Self-Service Routes
router.get('/my-records', SelfServiceAttendanceController.getMyRecords);
router.post('/clock-in', SelfServiceAttendanceController.clockIn);
router.post('/clock-out', SelfServiceAttendanceController.clockOut);

// Kiosk Routes
router.post('/kiosk/clock-in', SelfServiceAttendanceController.kioskClockIn);
router.post('/kiosk/clock-out', SelfServiceAttendanceController.kioskClockOut);

export default router;
