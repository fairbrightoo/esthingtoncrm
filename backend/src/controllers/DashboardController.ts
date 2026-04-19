import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DashboardController = {
    async getDashboardStats(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { companyId, branchId, role, userId } = req.user;

            const { startDate, endDate } = req.query;

            // Define Scope Filters
            const whereClause: any = {};

            // If Super Admin, allow query params to override (optional)
            // If Company/Branch Admin, enforce scope
            if (role !== 'SUPER_ADMIN') {
                if (companyId) whereClause.companyId = companyId;
                if (branchId) whereClause.branchId = branchId;
            }

            if (role === 'MARKETER') {
                whereClause.assignedToUserId = userId;
            }

            const dateFilter: any = {};
            if (startDate && typeof startDate === 'string') {
                dateFilter.gte = new Date(startDate);
            }
            if (endDate && typeof endDate === 'string') {
                dateFilter.lte = new Date(endDate);
            }

            const saleWhereClause: any = { lead: whereClause };
            const paymentWhereClause: any = { sale: { lead: whereClause } };
            const leadWhereClause: any = { ...whereClause };

            if (Object.keys(dateFilter).length > 0) {
                saleWhereClause.createdAt = dateFilter;
                paymentWhereClause.date = dateFilter;
                leadWhereClause.createdAt = dateFilter;
            }

            console.log('Analytics Scope:', whereClause, 'Date Filter:', dateFilter);

            // Fetch user commission rate if marketer
            let commissionRate = 0;
            if (role === 'MARKETER' || role === 'CUSTOMER_CARE') {
                const userObj = await prisma.user.findUnique({ where: { id: userId } });
                commissionRate = userObj?.commissionRate || 0;
            }

            // 1. Financial Metrics
            const sales = await prisma.sale.findMany({
                where: saleWhereClause,
                select: {
                    totalPaid: true,
                    agreedPrice: true,
                    status: true,
                    createdAt: true
                }
            });

            const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPaid, 0);
            const totalSalesValue = sales.reduce((sum, sale) => sum + sale.agreedPrice, 0);
            const salesCount = sales.length;
            const completedSales = sales.filter(s => s.status === 'COMPLETED').length;

            let paidCommissions = 0;
            let pendingCommissions = 0;
            let totalSalesGenerated = 0;

            if (role === 'MARKETER' || role === 'CUSTOMER_CARE') {
                const personalPaymentWhereClause: any = { sale: { lead: { ...whereClause, assignedToUserId: userId } } };
                if (Object.keys(dateFilter).length > 0) personalPaymentWhereClause.date = dateFilter;

                // Calculate total confirmed sales for Marketer
                const approvedPayments = await prisma.payment.findMany({
                    where: { ...personalPaymentWhereClause, status: 'APPROVED' },
                    select: { amount: true, isCommissionPaid: true }
                });
                totalSalesGenerated = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

                // Paid Commissions should only be derived from payments explicitly marked paid by Accountant
                const actuallyPaidPayments = approvedPayments.filter(p => p.isCommissionPaid === true);
                const sumOfActuallyPaid = actuallyPaidPayments.reduce((sum, p) => sum + p.amount, 0);
                paidCommissions = sumOfActuallyPaid * (commissionRate / 100);

                const personalSaleWhereClause: any = { lead: { ...whereClause, assignedToUserId: userId } };
                if (Object.keys(dateFilter).length > 0) personalSaleWhereClause.createdAt = dateFilter;

                const personalSales = await prisma.sale.findMany({
                    where: personalSaleWhereClause,
                    select: { agreedPrice: true, totalPaid: true }
                });

                // Pending Comms (Client balances still owed)
                pendingCommissions = personalSales.reduce((sum, sale) => sum + Math.max(0, sale.agreedPrice - sale.totalPaid), 0) * (commissionRate / 100);
            }

            // 2. Lead Metrics
            const totalLeads = await prisma.lead.count({ where: leadWhereClause });
            const clientLeads = await prisma.lead.count({
                where: {
                    ...leadWhereClause,
                    status: 'CLIENT'
                }
            });

            // 3. Sales Chart Data (Last 6 Months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

            const rawPaymentsFilter: any = {
                ...paymentWhereClause,
                date: { gte: sixMonthsAgo }
            };
            // If date filter was applied broadly, we still want the last 6 months for the chart, so let's override logic
            // Actually, if a specific date range is set, maybe the chart should update. Let's leave chart to always grab 6 months for now.
            const rawPayments = await prisma.payment.findMany({
                where: rawPaymentsFilter,
                select: {
                    amount: true,
                    date: true
                }
            });

            // Group by Month
            const monthlyRevenue = new Array(6).fill(0).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                return {
                    name: d.toLocaleString('default', { month: 'short' }),
                    value: 0,
                    year: d.getFullYear(),
                    month: d.getMonth()
                };
            }).reverse();

            rawPayments.forEach(p => {
                const pDate = new Date(p.date);
                const monthEntry = monthlyRevenue.find(m => m.year === pDate.getFullYear() && m.month === pDate.getMonth());
                if (monthEntry) {
                    monthEntry.value += p.amount;
                }
            });

            // 4. Recent Sales Table
            const recentSales = await prisma.sale.findMany({
                where: saleWhereClause,
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    lead: { select: { fullName: true } },
                    plot: { select: { prototype: true, estate: { select: { name: true } } } }
                }
            });

            // 5. Marketer Specific Data
            let recentProspects: any[] = [];
            let recentClients: any[] = [];
            let recentPayments: any[] = [];
            let detailedDueCommissions: any[] = [];
            let detailedPaidCommissions: any[] = [];

            if (role === 'MARKETER' || role === 'CUSTOMER_CARE') {
                const prospects = await prisma.lead.findMany({
                    where: { ...leadWhereClause, status: 'PROSPECT' },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                });
                recentProspects = prospects.map(l => ({
                    id: l.id,
                    fullName: l.fullName,
                    phone: l.phone,
                    date: l.createdAt
                }));

                const clients = await prisma.lead.findMany({
                    where: { ...leadWhereClause, status: 'CLIENT' },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                });
                recentClients = clients.map(l => ({
                    id: l.id,
                    fullName: l.fullName,
                    phone: l.phone,
                    date: l.createdAt
                }));

                const paymentsMatch = await prisma.payment.findMany({
                    where: paymentWhereClause,
                    take: 10,
                    orderBy: { date: 'desc' },
                    include: { sale: { include: { lead: true, plot: true } } }
                });
                recentPayments = paymentsMatch.map((p: any) => ({
                    id: p.id,
                    amount: p.amount,
                    date: p.date,
                    clientName: p.sale.lead.fullName,
                    product: p.sale.plot.prototype
                }));

                const dueCommsMatch = await prisma.payment.findMany({
                    where: { ...paymentWhereClause, status: 'APPROVED', isCommissionPaid: false },
                    orderBy: { date: 'desc' },
                    include: { sale: { include: { lead: true, plot: { include: { estate: true } } } } }
                });
                detailedDueCommissions = dueCommsMatch.map((p: any) => ({
                    id: p.id,
                    amount: p.amount,
                    commission: (p.amount * commissionRate) / 100,
                    date: p.date,
                    clientName: p.sale.lead.fullName,
                    product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`
                }));

                const paidCommsMatch = await prisma.payment.findMany({
                    where: { ...paymentWhereClause, status: 'APPROVED', isCommissionPaid: true },
                    orderBy: { date: 'desc' },
                    include: { sale: { include: { lead: true, plot: { include: { estate: true } } } } }
                });
                detailedPaidCommissions = paidCommsMatch.map((p: any) => ({
                    id: p.id,
                    amount: p.amount,
                    commission: (p.amount * commissionRate) / 100,
                    date: p.commissionDisbursedAt || p.date,
                    clientName: p.sale.lead.fullName,
                    product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`
                }));
            }

            res.json({
                financial: {
                    totalRevenue,
                    salesCount,
                    totalSalesValue,
                    totalLeads,
                    clientLeads,
                    conversionRate: totalLeads > 0 ? ((clientLeads / totalLeads) * 100).toFixed(1) : 0,
                    paidCommissions,
                    pendingCommissions,
                    totalSalesGenerated,
                    commissionRate
                },
                charts: {
                    revenue: monthlyRevenue.map(({ name, value }) => ({ name, value }))
                },
                recentSales: recentSales.map((s: any) => ({
                    id: s.id,
                    leadName: s.lead?.fullName || 'Unknown',
                    product: `${s.plot.prototype} (${s.plot.estate.name})`,
                    amount: s.totalPaid,
                    status: s.status,
                    date: s.createdAt
                })),
                marketerData: {
                    recentProspects,
                    recentClients,
                    recentPayments,
                    detailedDueCommissions,
                    detailedPaidCommissions
                }
            });

        } catch (error) {
            console.error('Dashboard Stats Error:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    }
};
