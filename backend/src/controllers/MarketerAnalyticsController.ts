import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const MarketerAnalyticsController = {
    async getMarketerReports(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { userId, role } = req.user;

            // Optional: Support date filters like in MD dashboard
            const { startDate, endDate } = req.query;
            const dateFilter: any = {};
            if (startDate && typeof startDate === 'string') dateFilter.gte = new Date(startDate);
            if (endDate && typeof endDate === 'string') dateFilter.lte = new Date(endDate);

            // Fetch User Details
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { commissionRate: true, fullName: true, role: true }
            });

            // 1. Sales & Commissions Log
            const paymentsFilter: any = { recordedByUserId: userId, status: 'APPROVED' };
            if (Object.keys(dateFilter).length > 0) paymentsFilter.date = dateFilter;
            
            const payments = await prisma.payment.findMany({
                where: paymentsFilter,
                include: {
                    sale: {
                        include: {
                            lead: { select: { fullName: true } },
                            plot: { include: { estate: { select: { name: true } } } }
                        }
                    }
                },
                orderBy: { date: 'desc' }
            });

            // Calculate exact accrued commission for these payments
            const commissionRate = user?.commissionRate || 0;
            const paymentsWithCommission = payments.map(p => ({
                ...p,
                commissionAccrued: ((p.amount * commissionRate) / 100) - (p.virtualLoanAmount || 0)
            }));

            // 2. Lead Funnel
            const leadsFilter: any = { assignedToUserId: userId };
            if (Object.keys(dateFilter).length > 0) leadsFilter.createdAt = dateFilter;

            const allLeads = await prisma.lead.findMany({
                where: leadsFilter,
                select: { id: true, status: true, createdAt: true, source: true }
            });

            const leadStatusCounts = allLeads.reduce((acc: any, lead) => {
                acc[lead.status] = (acc[lead.status] || 0) + 1;
                return acc;
            }, {});

            const totalLeads = allLeads.length;
            const totalClients = leadStatusCounts['CLIENT'] || 0;
            const conversionRate = totalLeads > 0 ? ((totalClients / totalLeads) * 100).toFixed(1) : 0;

            // 3. Attendance Log
            const attendanceFilter: any = { userId: userId };
            if (Object.keys(dateFilter).length > 0) attendanceFilter.date = dateFilter;

            const attendanceLog = await prisma.attendance.findMany({
                where: attendanceFilter,
                orderBy: { date: 'desc' },
                take: 30 // Last 30 records
            });

            // 4. Estate & Product Distribution
            const estateSales = payments.reduce((acc: any, payment) => {
                const estateName = payment.sale?.plot?.estate?.name || 'Unknown';
                acc[estateName] = (acc[estateName] || 0) + payment.amount;
                return acc;
            }, {});

            const productSales = payments.reduce((acc: any, payment) => {
                const plotName = payment.sale?.plot?.prototype || 'Unknown Plot';
                acc[plotName] = (acc[plotName] || 0) + payment.amount;
                return acc;
            }, {});

            // 5. Task & Follow-up Analytics
            const taskFilter: any = { assignedToUserId: userId };
            if (Object.keys(dateFilter).length > 0) taskFilter.createdAt = dateFilter;

            const tasks = await prisma.task.findMany({
                where: taskFilter,
                select: { isCompleted: true, createdAt: true }
            });

            const completedTasks = tasks.filter(t => t.isCompleted === true);
            const taskCompletionRate = tasks.length > 0 ? ((completedTasks.length / tasks.length) * 100).toFixed(1) : 0;

            // Average Time to Close
            // Find leads that became clients
            const closedLeads = await prisma.lead.findMany({
                where: { assignedToUserId: userId, status: 'CLIENT' },
                select: { createdAt: true, updatedAt: true } // Assuming updatedAt is roughly when they became a client
            });

            let avgTimeToCloseDays = 0;
            if (closedLeads.length > 0) {
                const totalDays = closedLeads.reduce((sum, lead) => {
                    const diffTime = Math.abs(lead.updatedAt.getTime() - lead.createdAt.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return sum + diffDays;
                }, 0);
                avgTimeToCloseDays = Math.round(totalDays / closedLeads.length);
            }

            res.json({
                user: { fullName: user?.fullName, role: user?.role },
                kpis: {
                    totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
                    commissionAccrued: paymentsWithCommission.reduce((sum, p) => sum + p.commissionAccrued, 0),
                    totalLeads,
                    totalClients,
                    conversionRate,
                    taskCompletionRate,
                    avgTimeToCloseDays
                },
                payments: paymentsWithCommission,
                leads: {
                    statusCounts: leadStatusCounts,
                    recent: allLeads.slice(0, 50)
                },
                attendance: attendanceLog,
                charts: {
                    estateDistribution: Object.entries(estateSales).map(([name, value]) => ({ name, value })),
                    productDistribution: Object.entries(productSales).map(([name, value]) => ({ name, value }))
                }
            });

        } catch (error) {
            console.error("Failed to fetch marketer analytics", error);
            res.status(500).json({ error: 'Failed to fetch marketer analytics' });
        }
    }
};
