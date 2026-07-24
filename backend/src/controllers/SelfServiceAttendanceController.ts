import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { uploadFile } from '../services/StorageService.js';

export const SelfServiceAttendanceController = {
    /**
     * Get staff's own attendance records
     */
    async getMyRecords(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            
            // Get current month's records
            const date = new Date();
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

            const records = await prisma.attendance.findMany({
                where: {
                    userId: user.userId,
                    date: {
                        gte: firstDay,
                        lte: lastDay
                    }
                },
                orderBy: { date: 'desc' }
            });

            // Map it for frontend (using method='SOFTWARE' just as an indicator for new ones, or from db if we add it)
            const mappedRecords = records.map(r => ({
                id: r.id,
                date: r.date,
                clockIn: r.checkIn,
                clockOut: r.checkOut,
                status: r.status,
                method: r.clockInLat ? 'SOFTWARE' : 'MANUAL'
            }));

            res.json(mappedRecords);
        } catch (error) {
            console.error('Error fetching attendance records:', error);
            res.status(500).json({ error: 'Failed to fetch attendance records' });
        }
    },

    /**
     * Handle Clock-In from Software/Webcam
     */
    async clockIn(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { method, gpsLatitude, gpsLongitude, photoBase64 } = req.body;

            // Get user's current branch configuration
            const dbUser = await prisma.user.findUnique({
                where: { id: user.userId },
                include: { branch: true }
            });

            if (!dbUser || !dbUser.branchId || !dbUser.companyId) {
                return res.status(400).json({ error: 'User is not assigned to a branch' });
            }

            // Optional: Process base64 photo and upload to storage (R2/S3)
            let clockInPhotoUrl = undefined;
            if (photoBase64) {
                // Convert base64 to buffer
                const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                clockInPhotoUrl = await uploadFile(buffer, `clockin_${user.userId}_${Date.now()}.jpg`, 'attendance');
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Fetch HR Settings for late threshold
            const hrSettings = await prisma.hRSettings.findUnique({
                where: { branchId: dbUser.branchId }
            });

            let status = 'PRESENT';
            if (hrSettings) {
                const [hr, min] = hrSettings.defaultCheckInTime.split(':').map(Number);
                const expectedTime = new Date();
                expectedTime.setHours(hr, min + hrSettings.lateToleranceMinutes, 0, 0);
                
                if (new Date() > expectedTime) {
                    status = 'LATE';
                }
            }

            let attendance = await prisma.attendance.findUnique({
                where: {
                    userId_date: {
                        userId: user.userId,
                        date: today
                    }
                }
            });

            if (attendance) {
                // Update existing if not already clocked in
                if (!attendance.checkIn) {
                    attendance = await prisma.attendance.update({
                        where: { id: attendance.id },
                        data: {
                            checkIn: new Date(),
                            status: status,
                            clockInLat: gpsLatitude,
                            clockInLng: gpsLongitude,
                            clockInPhotoUrl
                        }
                    });
                }
            } else {
                // Create new
                attendance = await prisma.attendance.create({
                    data: {
                        userId: user.userId,
                        branchId: dbUser.branchId,
                        companyId: dbUser.companyId,
                        date: today,
                        status: status,
                        checkIn: new Date(),
                        clockInLat: gpsLatitude,
                        clockInLng: gpsLongitude,
                        clockInPhotoUrl
                    }
                });
            }

            res.json({ success: true, attendance });
        } catch (error) {
            console.error('Error during clock in:', error);
            res.status(500).json({ error: 'Failed to clock in' });
        }
    },

    /**
     * Handle Clock-Out from Software/Webcam
     */
    async clockOut(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { method, gpsLatitude, gpsLongitude, photoBase64 } = req.body;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let clockOutPhotoUrl = undefined;
            if (photoBase64) {
                const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                clockOutPhotoUrl = await uploadFile(buffer, `clockout_${user.userId}_${Date.now()}.jpg`, 'attendance');
            }

            let attendance = await prisma.attendance.findUnique({
                where: {
                    userId_date: {
                        userId: user.userId,
                        date: today
                    }
                }
            });

            if (!attendance) {
                return res.status(400).json({ error: 'You have not clocked in today' });
            }

            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    checkOut: new Date(),
                    clockOutPhotoUrl
                }
            });

            res.json({ success: true, attendance });
        } catch (error) {
            console.error('Error during clock out:', error);
            res.status(500).json({ error: 'Failed to clock out' });
        }
    },

    /**
     * Handle Kiosk Clock-In (Using PIN & Photo)
     */
    async kioskClockIn(req: Request, res: Response) {
        try {
            const { pin, photoBase64 } = req.body;
            
            // The request is authenticated by the admin/tablet session, but we identify user by PIN
            const kioskUser = (req as any).user;
            
            const staff = await prisma.user.findFirst({
                where: { 
                    attendancePin: pin, 
                    isActive: true,
                    companyId: kioskUser.companyId,
                    branchId: kioskUser.branchId
                },
                include: { branch: true }
            });

            if (!staff || !staff.branchId || !staff.companyId) {
                return res.status(400).json({ error: 'Invalid PIN or unassigned staff' });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let clockInPhotoUrl = undefined;
            if (photoBase64) {
                const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                clockInPhotoUrl = await uploadFile(buffer, `kiosk_in_${staff.id}_${Date.now()}.jpg`, 'attendance');
            }

            const hrSettings = await prisma.hRSettings.findUnique({
                where: { branchId: staff.branchId }
            });

            let status = 'PRESENT';
            if (hrSettings) {
                const [hr, min] = hrSettings.defaultCheckInTime.split(':').map(Number);
                const expectedTime = new Date();
                expectedTime.setHours(hr, min + hrSettings.lateToleranceMinutes, 0, 0);
                
                if (new Date() > expectedTime) {
                    status = 'LATE';
                }
            }

            let attendance = await prisma.attendance.findUnique({
                where: { userId_date: { userId: staff.id, date: today } }
            });

            if (attendance) {
                if (!attendance.checkIn) {
                    attendance = await prisma.attendance.update({
                        where: { id: attendance.id },
                        data: {
                            checkIn: new Date(),
                            status,
                            clockInPhotoUrl,
                            notes: 'KIOSK PUNCH'
                        }
                    });
                }
            } else {
                attendance = await prisma.attendance.create({
                    data: {
                        userId: staff.id,
                        branchId: staff.branchId,
                        companyId: staff.companyId,
                        date: today,
                        status,
                        checkIn: new Date(),
                        clockInPhotoUrl,
                        notes: 'KIOSK PUNCH'
                    }
                });
            }

            res.json({ success: true, attendance });
        } catch (error) {
            console.error('Kiosk In Error:', error);
            res.status(500).json({ error: 'Kiosk clock in failed' });
        }
    },

    /**
     * Handle Kiosk Clock-Out
     */
    async kioskClockOut(req: Request, res: Response) {
        try {
            const { pin, photoBase64 } = req.body;

            const kioskUser = (req as any).user;

            const staff = await prisma.user.findFirst({
                where: { 
                    attendancePin: pin, 
                    isActive: true,
                    companyId: kioskUser.companyId,
                    branchId: kioskUser.branchId
                }
            });

            if (!staff) {
                return res.status(400).json({ error: 'Invalid PIN' });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let clockOutPhotoUrl = undefined;
            if (photoBase64) {
                const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                clockOutPhotoUrl = await uploadFile(buffer, `kiosk_out_${staff.id}_${Date.now()}.jpg`, 'attendance');
            }

            let attendance = await prisma.attendance.findUnique({
                where: { userId_date: { userId: staff.id, date: today } }
            });

            if (!attendance) {
                return res.status(400).json({ error: 'You have not clocked in today' });
            }

            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    checkOut: new Date(),
                    clockOutPhotoUrl
                }
            });

            res.json({ success: true, attendance });
        } catch (error) {
            console.error('Kiosk Out Error:', error);
            res.status(500).json({ error: 'Kiosk clock out failed' });
        }
    }
};
