import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const DashboardController = {
    async getDashboardStats(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { companyId, branchId, role, userId } = req.user;

            const { startDate, endDate, scope } = req.query;

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
            } else if (role === 'TEAM_LEAD') {
                if (scope === 'TEAM') {
                    whereClause.assignedToUser = { team: { teamLeadId: userId } };
                } else {
                    whereClause.assignedToUserId = userId;
                }
            } else if (role === 'BDM') {
                if (scope === 'TEAM') {
                    whereClause.assignedToUser = { team: { bdmId: userId } };
                } else {
                    whereClause.assignedToUserId = userId;
                }
            } else if (role === 'HEAD_BDD') {
                if (scope === 'DEPARTMENT') {
                    // Entire department logic - all marketers in this branch
                    whereClause.assignedToUser = { role: { in: ['MARKETER', 'TEAM_LEAD', 'BDM'] } };
                } else {
                    whereClause.assignedToUserId = userId;
                }
            }

            const dateFilter: any = {};
            if (startDate && typeof startDate === 'string') {
                dateFilter.gte = new Date(startDate);
            }
            if (endDate && typeof endDate === 'string') {
                dateFilter.lte = new Date(endDate);
            }

            const saleWhereClause: any = {};
            const leadWhereClause: any = { ...whereClause };

            if (role !== 'SUPER_ADMIN') {
                if (['MARKETER', 'TEAM_LEAD', 'BDM', 'HEAD_BDD'].includes(role)) {
                    // Marketers are scoped below
                } else if (['BRANCH_ADMIN', 'ACCOUNTANT', 'BRANCH_HR', 'CUSTOMER_CARE'].includes(role) && branchId) {
                    saleWhereClause.marketer = { branchId: branchId };
                } else if (role === 'MANAGING_DIRECTOR') {
                    saleWhereClause.marketer = { companyId: companyId };
                }
            }

            if (role === 'MARKETER') {
                saleWhereClause.marketerId = userId;
                leadWhereClause.OR = [
                    { assignedToUserId: userId },
                    { sales: { some: { marketerId: userId } } }
                ];
                delete leadWhereClause.companyId;
                delete leadWhereClause.branchId;
                delete leadWhereClause.assignedToUserId;
            } else if (role === 'TEAM_LEAD') {
                if (scope === 'TEAM') {
                    saleWhereClause.marketer = { team: { teamLeadId: userId } };
                } else {
                    saleWhereClause.marketerId = userId;
                }
                leadWhereClause.OR = [
                    { assignedToUserId: userId },
                    { sales: { some: { marketerId: userId } } }
                ];
                delete leadWhereClause.companyId;
                delete leadWhereClause.branchId;
            } else if (role === 'BDM') {
                if (scope === 'TEAM') {
                    saleWhereClause.marketer = { team: { bdmId: userId } };
                } else {
                    saleWhereClause.marketerId = userId;
                }
                leadWhereClause.OR = [
                    { assignedToUserId: userId },
                    { sales: { some: { marketerId: userId } } }
                ];
                delete leadWhereClause.companyId;
                delete leadWhereClause.branchId;
            } else if (role === 'HEAD_BDD') {
                if (scope === 'DEPARTMENT') {
                    saleWhereClause.marketer = { role: { in: ['MARKETER', 'TEAM_LEAD', 'BDM'] } };
                } else {
                    saleWhereClause.marketerId = userId;
                }
                leadWhereClause.OR = [
                    { assignedToUserId: userId },
                    { sales: { some: { marketerId: userId } } }
                ];
                delete leadWhereClause.companyId;
                delete leadWhereClause.branchId;
            }

            const paymentWhereClause: any = { sale: saleWhereClause };

            if (Object.keys(dateFilter).length > 0) {
                saleWhereClause.createdAt = dateFilter;
                paymentWhereClause.date = dateFilter;
                leadWhereClause.createdAt = dateFilter;
            }

            console.log('Analytics Scope:', whereClause, 'Date Filter:', dateFilter);

            // Fetch user commission rate if marketer or manager
            let commissionRate = 0;
            if (['MARKETER', 'CUSTOMER_CARE', 'TEAM_LEAD', 'BDM', 'HEAD_BDD'].includes(role)) {
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

            if (['MARKETER', 'CUSTOMER_CARE', 'TEAM_LEAD', 'BDM', 'HEAD_BDD'].includes(role)) {
                const personalPaymentWhereClause: any = { ...paymentWhereClause };
                if (Object.keys(dateFilter).length > 0) personalPaymentWhereClause.date = dateFilter;

                // Calculate total confirmed sales for Scope
                const approvedPayments = await prisma.payment.findMany({
                    where: { ...personalPaymentWhereClause, status: 'APPROVED' },
                    select: { amount: true, isCommissionPaid: true, virtualLoanAmount: true }
                });
                totalSalesGenerated = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

                // Paid Commissions should only be derived from payments explicitly marked paid by Accountant
                const actuallyPaidPayments = approvedPayments.filter(p => p.isCommissionPaid === true);
                paidCommissions = actuallyPaidPayments.reduce((sum, p) => sum + ((p.amount * (commissionRate / 100)) - (p.virtualLoanAmount || 0)), 0);

                const personalSaleWhereClause: any = { ...saleWhereClause };
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
            let detailedDueReferralCommissions: any[] = [];
            let detailedPaidReferralCommissions: any[] = [];
            let paidReferralCommissions = 0;
            let pendingReferralCommissions = 0;

            if (['MARKETER', 'CUSTOMER_CARE', 'TEAM_LEAD', 'BDM', 'HEAD_BDD'].includes(role)) {
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
                    commission: ((p.amount * commissionRate) / 100) - (p.virtualLoanAmount || 0),
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
                    commission: ((p.amount * commissionRate) / 100) - (p.virtualLoanAmount || 0),
                    date: p.commissionDisbursedAt || p.date,
                    clientName: p.sale.lead.fullName,
                    product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`
                }));

                // Referral Commissions Tracking
                const referralPaymentWhereClause: any = { 
                    sale: { referrerId: userId },
                    status: 'APPROVED'
                };
                if (Object.keys(dateFilter).length > 0) referralPaymentWhereClause.date = dateFilter;

                const dueReferralCommsMatch = await prisma.payment.findMany({
                    where: { ...referralPaymentWhereClause, isReferralCommissionPaid: false },
                    orderBy: { date: 'desc' },
                    include: { sale: { include: { lead: true, plot: { include: { estate: true } }, marketer: true } } }
                });

                detailedDueReferralCommissions = dueReferralCommsMatch.map((p: any) => {
                    const refComm = (p.amount * (p.sale.referrerCommissionRate || 0)) / 100;
                    pendingReferralCommissions += refComm;
                    return {
                        id: p.id,
                        amount: p.amount,
                        commission: refComm,
                        date: p.date,
                        clientName: p.sale.lead.fullName,
                        marketerName: p.sale.marketer?.fullName || 'Unknown',
                        product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`
                    };
                });

                const paidReferralCommsMatch = await prisma.payment.findMany({
                    where: { ...referralPaymentWhereClause, isReferralCommissionPaid: true },
                    orderBy: { date: 'desc' },
                    include: { sale: { include: { lead: true, plot: { include: { estate: true } }, marketer: true } } }
                });

                detailedPaidReferralCommissions = paidReferralCommsMatch.map((p: any) => {
                    const refComm = (p.amount * (p.sale.referrerCommissionRate || 0)) / 100;
                    paidReferralCommissions += refComm;
                    return {
                        id: p.id,
                        amount: p.amount,
                        commission: refComm,
                        date: p.referralCommissionDisbursedAt || p.date,
                        clientName: p.sale.lead.fullName,
                        marketerName: p.sale.marketer?.fullName || 'Unknown',
                        product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`
                    };
                });
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
                    commissionRate,
                    paidReferralCommissions,
                    pendingReferralCommissions
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
                    detailedPaidCommissions,
                    detailedDueReferralCommissions,
                    detailedPaidReferralCommissions
                }
            });

        } catch (error) {
            console.error('Dashboard Stats Error:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    }
};
