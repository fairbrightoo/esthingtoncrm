import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const AttendanceController = {
    /**
     * Mark Attendance for a User
     */
    async markAttendance(req: Request, res: Response) {
        const { companyId, branchId } = req.params as any;
        const { userId, date, status, checkIn, checkOut, notes } = req.body;

        try {
            const attendanceDate = new Date(date);
            // reset time to midnight for exact date match unique constraint
            attendanceDate.setHours(0, 0, 0, 0);

            let attendance = await prisma.attendance.findUnique({
                where: {
                    userId_date: {
                        userId,
                        date: attendanceDate
                    }
                }
            });

            if (attendance) {
                // Update existing
                attendance = await prisma.attendance.update({
                    where: { id: attendance.id },
                    data: {
                        status: status || attendance.status,
                        checkIn: checkIn ? new Date(checkIn) : attendance.checkIn,
                        checkOut: checkOut ? new Date(checkOut) : attendance.checkOut,
                        notes: notes !== undefined ? notes : attendance.notes
                    }
                });
            } else {
                // Create new
                attendance = await prisma.attendance.create({
                    data: {
                        userId,
                        branchId,
                        companyId,
                        date: attendanceDate,
                        status: status || 'PRESENT',
                        checkIn: checkIn ? new Date(checkIn) : null,
                        checkOut: checkOut ? new Date(checkOut) : null,
                        notes
                    }
                });
            }

            res.json(attendance);
        } catch (error) {
            console.error('Error marking attendance:', error);
            res.status(500).json({ error: 'Failed to mark attendance' });
        }
    },

    /**
     * Get Branch Attendance for a specific date or date range
     */
    async getBranchAttendance(req: Request, res: Response) {
        const { companyId, branchId } = req.params as any;
        const { date, startDate, endDate } = req.query as any;

        try {
            let dateFilter: any = {};

            if (startDate && endDate) {
                dateFilter = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            } else if (date) {
                const specificDate = new Date(date);
                specificDate.setHours(0, 0, 0, 0);

                const nextDay = new Date(specificDate);
                nextDay.setDate(nextDay.getDate() + 1);

                dateFilter = {
                    gte: specificDate,
                    lt: nextDay
                };
            }

            const attendanceRecords = await prisma.attendance.findMany({
                where: {
                    companyId,
                    branchId,
                    date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            role: true,
                            passportUrl: true
                        }
                    }
                },
                orderBy: { date: 'desc' }
            });

            res.json(attendanceRecords);
        } catch (error) {
            console.error('Error fetching branch attendance:', error);
            res.status(500).json({ error: 'Failed to fetch attendance' });
        }
    },

    /**
     * Generate Branch Payroll Report
     */
    async getBranchPayroll(req: Request, res: Response) {
        const { companyId, branchId } = req.params as any;
        const { month, year } = req.query as any;

        try {
            const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
            const targetYear = year ? parseInt(year) : new Date().getFullYear();

            // First day of the month
            const startDate = new Date(targetYear, targetMonth - 1, 1);
            // Last day of the month
            const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

            // 1. Fetch all applicable staff
            const staff = await prisma.user.findMany({
                where: {
                    companyId,
                    branchId,
                    role: { in: ['MARKETER', 'CUSTOMER_CARE'] }
                }
            });

            // 2. Fetch all attendance records for the month
            const attendanceRecords = await prisma.attendance.findMany({
                where: {
                    companyId,
                    branchId,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            // Group attendance by user
            const attendanceByUser = attendanceRecords.reduce((acc: any, record: any) => {
                if (!acc[record.userId]) acc[record.userId] = [];
                acc[record.userId].push(record);
                return acc;
            }, {});

            // 3. Calculate Payroll
            const payrollReport = staff.map((user: any) => {
                const monthlySalary = user.monthlySalary || 0;
                const absentPenaltyRate = monthlySalary / 20;
                const latePenaltyRate = monthlySalary / 40;

                const userAttendance = attendanceByUser[user.id] || [];

                let daysPresent = 0;
                let daysAbsent = 0;
                let daysLate = 0;
                let daysLeave = 0;

                userAttendance.forEach((record: any) => {
                    if (record.status === 'PRESENT') daysPresent++;
                    else if (record.status === 'ABSENT') daysAbsent++;
                    else if (record.status === 'LATE') daysLate++;
                    else if (record.status === 'APPROVED_LEAVE') daysLeave++;
                });

                const totalDeductions = (daysAbsent * absentPenaltyRate) + (daysLate * latePenaltyRate);
                const netSalary = Math.max(0, monthlySalary - totalDeductions); // Ensure salary doesn't go negative

                return {
                    userId: user.id,
                    fullName: user.fullName,
                    role: user.role,
                    baseSalary: monthlySalary,
                    daysPresent,
                    daysAbsent,
                    daysLate,
                    daysLeave,
                    totalDeductions,
                    netSalary
                };
            });

            res.json(payrollReport);
        } catch (error) {
            console.error('Error generating payroll report:', error);
            res.status(500).json({ error: 'Failed to generate payroll report' });
        }
    }
};
