import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const HRAnalyticsController = {
    getAnalytics: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (!user.branchId || (user.role !== 'BRANCH_HR' && user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_ADMIN')) {
                return res.status(403).json({ error: 'Unauthorized route. HR clearance required.' });
            }

            const branchId = user.branchId;

            // 1. Headcount
            const totalStaff = await prisma.user.count({ where: { branchId, isActive: true } });
            
            // Role Distribution
            const rolesCount = await prisma.user.groupBy({
                by: ['role'],
                where: { branchId, isActive: true },
                _count: { role: true }
            });

            // 2. Fetch last 30 days attendance trends
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const attendanceRecords = await prisma.attendance.findMany({
                where: {
                    branchId,
                    date: { gte: thirtyDaysAgo }
                },
                select: {
                    date: true,
                    status: true
                }
            });

            // Group attendance by date natively in node
            const trendsMap = new Map<string, { present: number, late: number, absent: number }>();
            
            attendanceRecords.forEach(att => {
                const dayString = att.date.toISOString().split('T')[0] || '';
                if (!trendsMap.has(dayString)) {
                    trendsMap.set(dayString, { present: 0, late: 0, absent: 0 });
                }
                const data = trendsMap.get(dayString)!;
                if (att.status === 'PRESENT') data.present++;
                if (att.status === 'LATE') data.late++;
                if (att.status === 'ABSENT') data.absent++;
            });

            const attendanceTrends = Array.from(trendsMap.entries()).map(([dateStr, metrics]) => ({
                date: dateStr,
                ...metrics
            })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


            // 3. Lateness Penalty Economics
            const hrSettings = await prisma.hRSettings.findUnique({ where: { branchId } });
            const penaltyFee = hrSettings?.lateDeductionFee || 0;

            const totalLateThisMonth = await prisma.attendance.count({
                where: {
                    branchId,
                    status: 'LATE',
                    date: { gte: thirtyDaysAgo } // Approx month representation for demo
                }
            });

            const totalProjectedPenalties = totalLateThisMonth * penaltyFee;

            // 4. Top Sales Staff (Approved Payments this month)
            const { month } = req.query; // Expecting YYYY-MM
            let currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            let currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
            
            if (month && typeof month === 'string') {
                const [yyyy, mm] = month.split('-');
                if (yyyy && mm) {
                    currentMonthStart = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
                    currentMonthEnd = new Date(parseInt(yyyy), parseInt(mm), 1);
                }
            }

            const approvedPayments = await prisma.payment.findMany({
                where: {
                    status: 'APPROVED',
                    date: { gte: currentMonthStart, lt: currentMonthEnd },
                    sale: { marketer: { branchId } }
                },
                select: {
                    amount: true,
                    sale: {
                        select: {
                            lead: {
                                select: {
                                    assignedToUser: {
                                        select: { id: true, fullName: true, passportUrl: true, role: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const staffSales = new Map<string, { id: string, name: string, role: string, avatar: string | null, totalSales: number }>();
            
            approvedPayments.forEach(p => {
                const staff = p.sale.lead.assignedToUser;
                if(staff) {
                    const existing = staffSales.get(staff.id) || { id: staff.id, name: staff.fullName, role: staff.role, avatar: staff.passportUrl, totalSales: 0 };
                    existing.totalSales += p.amount;
                    staffSales.set(staff.id, existing);
                }
            });

            const topSalesStaff = Array.from(staffSales.values())
                .sort((a, b) => b.totalSales - a.totalSales)
                .slice(0, 3);

            res.json({
                success: true,
                data: {
                    headcount: totalStaff,
                    roleDistribution: rolesCount.map(r => ({ name: r.role.replace('_', ' '), value: r._count.role })),
                    attendanceTrends,
                    penalties: {
                        totalLateOccurrences: totalLateThisMonth,
                        feePerOccurrence: penaltyFee,
                        projectedTotalDeductions: totalProjectedPenalties
                    },
                    topSalesStaff
                }
            });

        } catch (error) {
            console.error('Failed to fetch HR Analytics:', error);
            res.status(500).json({ error: 'System architecture failure parsing analytics.' });
        }
    }
};
