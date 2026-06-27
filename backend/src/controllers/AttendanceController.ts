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
            let endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
            
            // If it's the current month, cap endDate to today or yesterday depending on time
            const now = new Date();
            if (targetYear === now.getFullYear() && targetMonth === now.getMonth() + 1) {
                if (now.getHours() >= 17) {
                    // Past 5 PM, include today
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                } else {
                    // Before 5 PM, only calculate up to yesterday
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                }
            }

            // 1. Fetch all applicable staff
            const staff = await prisma.user.findMany({
                where: {
                    companyId,
                    branchId,
                    isActive: true,
                    role: { not: 'MANAGING_DIRECTOR' }
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

            // Group attendance by user AND date
            const attendanceByUserAndDate = attendanceRecords.reduce((acc: any, record: any) => {
                if (!acc[record.userId]) acc[record.userId] = {};
                const dateStr = record.date.toISOString().split('T')[0];
                acc[record.userId][dateStr] = record;
                return acc;
            }, {});

            // Fetch Approved Leaves
            const approvedLeaves = await prisma.leaveRequest.findMany({
                where: {
                    companyId,
                    branchId,
                    status: 'APPROVED',
                    startDate: { lte: endDate },
                    endDate: { gte: startDate }
                }
            });

            // Fetch Holidays
            const holidays = await prisma.holiday.findMany({
                where: {
                    companyId,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            const holidayDateStrings = holidays.map(h => h.date.toISOString().split('T')[0]);

            // 3. Calculate Payroll
            const payrollReport = staff.map((user: any) => {
                const monthlySalary = user.monthlySalary || 0;
                const absentPenaltyRate = monthlySalary / 22; // Assume 22 working days
                const latePenaltyRate = monthlySalary / 44; // Half of a day's pay

                let daysPresent = 0;
                let daysAbsent = 0;
                let daysLate = 0;
                let daysLeave = 0;

                const userLeaves = approvedLeaves.filter(l => l.userId === user.id);

                // Loop through every working day in the range
                let currentDate = new Date(startDate);
                currentDate.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(0, 0, 0, 0);

                while (currentDate <= end) {
                    const dayOfWeek = currentDate.getDay();
                    // Skip weekends (0 = Sunday, 6 = Saturday)
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        currentDate.setDate(currentDate.getDate() + 1);
                        continue;
                    }

                    const dateStr = currentDate.toISOString().split('T')[0];

                    // Skip Public Holidays
                    if (holidayDateStrings.includes(dateStr)) {
                        currentDate.setDate(currentDate.getDate() + 1);
                        continue;
                    }

                    const userAtt = attendanceByUserAndDate[user.id]?.[dateStr];

                    if (userAtt) {
                        if (userAtt.status === 'PRESENT') daysPresent++;
                        else if (userAtt.status === 'ABSENT') daysAbsent++;
                        else if (userAtt.status === 'LATE') daysLate++;
                        else if (userAtt.status === 'APPROVED_LEAVE') daysLeave++;
                    } else {
                        // Check if on approved leave
                        const isOnLeave = userLeaves.some(l => {
                            const lStart = new Date(l.startDate);
                            lStart.setHours(0, 0, 0, 0);
                            const lEnd = new Date(l.endDate);
                            lEnd.setHours(23, 59, 59, 999);
                            return currentDate >= lStart && currentDate <= lEnd;
                        });

                        if (isOnLeave) {
                            daysLeave++;
                        } else {
                            // Unrecorded absence!
                            daysAbsent++;
                        }
                    }

                    currentDate.setDate(currentDate.getDate() + 1);
                }

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
