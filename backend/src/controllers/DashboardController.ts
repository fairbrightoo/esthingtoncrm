import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const DashboardController = {
    async getDashboardStats(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { companyId, branchId, role, userId } = req.user;

            const { startDate, endDate, scope } = req.query;

            const whereClause: any = {};
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

            if (scope === 'PERSONAL') {
                saleWhereClause.marketerId = userId;
                delete saleWhereClause.marketer;
                
                leadWhereClause.OR = [
                    { assignedToUserId: userId },
                    { sales: { some: { marketerId: userId } } }
                ];
                delete leadWhereClause.companyId;
                delete leadWhereClause.branchId;
                delete leadWhereClause.assignedToUserId;
            } else {
                if (role !== 'SUPER_ADMIN') {
                    if (['MARKETER', 'TEAM_LEAD', 'BDM', 'HEAD_BDD', 'SITE_EXPERT'].includes(role)) {
                        // Marketers are scoped below
                    } else if (['BRANCH_ADMIN', 'ACCOUNTANT', 'BRANCH_HR', 'CUSTOMER_CARE'].includes(role) && branchId) {
                        saleWhereClause.marketer = { branchId: branchId };
                    } else if (role === 'MANAGING_DIRECTOR' || role === 'GENERAL_MANAGER') {
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
            }

            const paymentWhereClause: any = { sale: saleWhereClause };

            if (Object.keys(dateFilter).length > 0) {
                saleWhereClause.createdAt = dateFilter;
                paymentWhereClause.date = dateFilter;
                leadWhereClause.createdAt = dateFilter;
            }

            const userObj = await prisma.user.findUnique({ where: { id: userId } });
            const commissionRate = userObj?.commissionRate || 0;
            const esthCoinBalance = userObj?.esthCoinBalance || 0;

            const sales = await prisma.sale.findMany({
                where: saleWhereClause,
                select: {
                    totalPaid: true,
                    agreedPrice: true,
                    status: true,
                    createdAt: true
                }
            });

            // 1. Financial Metrics - Cross Company Accounting Refactor
            const totalSalesValue = sales.reduce((sum, sale) => sum + sale.agreedPrice, 0);
            const salesCount = sales.length;
            const completedSales = sales.filter(s => s.status === 'COMPLETED').length;

            let totalSalesGenerated = sales.reduce((sum, sale) => sum + sale.totalPaid, 0);
            let grossCashReceived = 0;
            let directSalesVolume = 0;
            let inboundSalesVolume = 0;
            let outboundSalesVolume = 0;

            if (['MANAGING_DIRECTOR', 'ACCOUNTANT', 'SUPER_ADMIN', 'GENERAL_MANAGER'].includes(role)) {
                // Calculate Gross Cash
                let cashWhere: any = { status: 'APPROVED' };
                if (Object.keys(dateFilter).length > 0) cashWhere.date = dateFilter;

                if (role === 'MANAGING_DIRECTOR' || role === 'GENERAL_MANAGER') {
                    const branchIds = await prisma.branch.findMany({ where: { companyId } }).then(b => b.map(x => x.id));
                    cashWhere.receivingBranchId = { in: branchIds };
                } else if (role === 'ACCOUNTANT') {
                    cashWhere.receivingBranchId = branchId;
                }

                const cashPayments = await prisma.payment.findMany({
                    where: cashWhere,
                    select: { amount: true }
                });
                grossCashReceived = cashPayments.reduce((sum, p) => sum + p.amount, 0);

                // Calculate Sales Type Breakdown Volume
                // We need to fetch all approved payments they have visibility over
                const breakdownWhereClause: any = { status: 'APPROVED' };
                if (Object.keys(dateFilter).length > 0) breakdownWhereClause.date = dateFilter;

                if (role === 'MANAGING_DIRECTOR' || role === 'GENERAL_MANAGER') {
                    breakdownWhereClause.OR = [
                        { sale: { marketer: { companyId } } },
                        { sale: { plot: { estate: { companyId } } } }
                    ];
                } else if (role === 'ACCOUNTANT') {
                    breakdownWhereClause.OR = [
                        { sale: { marketer: { branchId } } },
                        { sale: { plot: { estate: { managingBranchId: branchId } } } }
                    ];
                }

                const breakdownPayments = await prisma.payment.findMany({
                    where: breakdownWhereClause,
                    include: {
                        sale: {
                            include: {
                                marketer: { select: { companyId: true, branchId: true } },
                                plot: { include: { estate: { select: { companyId: true, managingBranchId: true } } } }
                            }
                        }
                    }
                });

                breakdownPayments.forEach(p => {
                    if (!p.sale || !p.sale.plot || !p.sale.plot.estate) return;
                    const isSellingCompany = p.sale.marketer?.companyId === companyId;
                    const isManagingCompany = p.sale.plot.estate.companyId === companyId;
                    
                    if (role === 'ACCOUNTANT') {
                        const isSellingBranch = p.sale.marketer?.branchId === branchId;
                        const isManagingBranch = p.sale.plot.estate.managingBranchId === branchId;
                        if (isSellingBranch && isManagingBranch) directSalesVolume += p.amount;
                        else if (isSellingBranch && !isManagingBranch) outboundSalesVolume += p.amount;
                        else if (!isSellingBranch && isManagingBranch) inboundSalesVolume += p.amount;
                    } else if (role === 'MANAGING_DIRECTOR' || role === 'GENERAL_MANAGER') {
                        if (isSellingCompany && isManagingCompany) directSalesVolume += p.amount;
                        else if (isSellingCompany && !isManagingCompany) outboundSalesVolume += p.amount;
                        else if (!isSellingCompany && isManagingCompany) inboundSalesVolume += p.amount;
                    }
                });
            } else {
                // For marketers, their sales are all just "totalSalesGenerated", we can treat grossCashReceived same as generated for simplicity, or 0.
                grossCashReceived = totalSalesGenerated;
            }


            let paidCommissions = 0;
            let pendingCommissions = 0;

            if (['MARKETER', 'CUSTOMER_CARE', 'TEAM_LEAD', 'BDM', 'HEAD_BDD', 'SITE_EXPERT'].includes(role)) {
                const personalPaymentWhereClause: any = { ...paymentWhereClause };
                if (Object.keys(dateFilter).length > 0) personalPaymentWhereClause.date = dateFilter;

                const approvedPayments = await prisma.payment.findMany({
                    where: { ...personalPaymentWhereClause, status: 'APPROVED' },
                    select: { amount: true, isCommissionPaid: true, virtualLoanAmount: true }
                });
                totalSalesGenerated = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

                const actuallyPaidPayments = approvedPayments.filter(p => p.isCommissionPaid === true);
                paidCommissions = actuallyPaidPayments.reduce((sum, p) => sum + ((p.amount * (commissionRate / 100)) - (p.virtualLoanAmount || 0)), 0);

                const personalSaleWhereClause: any = { ...saleWhereClause };
                if (Object.keys(dateFilter).length > 0) personalSaleWhereClause.createdAt = dateFilter;

                const personalSales = await prisma.sale.findMany({
                    where: personalSaleWhereClause,
                    select: { agreedPrice: true, totalPaid: true }
                });

                pendingCommissions = personalSales.reduce((sum, sale) => sum + Math.max(0, sale.agreedPrice - sale.totalPaid), 0) * (commissionRate / 100);
            }

            const totalLeads = await prisma.lead.count({ where: leadWhereClause });
            const clientLeads = await prisma.lead.count({
                where: {
                    ...leadWhereClause,
                    status: 'CLIENT'
                }
            });

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

            const rawPaymentsFilter: any = {
                ...paymentWhereClause,
                date: { gte: sixMonthsAgo }
            };
            const rawPayments = await prisma.payment.findMany({
                where: rawPaymentsFilter,
                select: {
                    amount: true,
                    date: true
                }
            });

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

            const recentSales = await prisma.sale.findMany({
                where: saleWhereClause,
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    lead: { select: { fullName: true } },
                    plot: { select: { prototype: true, estate: { select: { name: true } } } }
                }
            });

            let recentProspects: any[] = [];
            let recentClients: any[] = [];
            let recentPayments: any[] = [];
            let detailedDueCommissions: any[] = [];
            let detailedPaidCommissions: any[] = [];
            let detailedDueReferralCommissions: any[] = [];
            let detailedPaidReferralCommissions: any[] = [];
            let paidReferralCommissions = 0;
            let pendingReferralCommissions = 0;

            if (['MARKETER', 'CUSTOMER_CARE', 'TEAM_LEAD', 'BDM', 'HEAD_BDD', 'SITE_EXPERT'].includes(role)) {
                recentProspects = (await prisma.lead.findMany({
                    where: { ...leadWhereClause, status: { not: 'CLIENT' } },
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, fullName: true, phone: true, createdAt: true, source: true }
                })).map(l => ({ ...l, date: l.createdAt }));

                recentClients = (await prisma.lead.findMany({
                    where: { ...leadWhereClause, status: 'CLIENT' },
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, fullName: true, phone: true, createdAt: true, source: true }
                })).map(l => ({ ...l, date: l.createdAt }));

                const myPayments = await prisma.payment.findMany({
                    where: { ...paymentWhereClause, status: 'APPROVED' },
                    orderBy: { date: 'desc' },
                    include: { sale: { include: { lead: true, plot: { include: { estate: true } } } } }
                });

                recentPayments = myPayments.slice(0, 20).filter((p: any) => p.sale && p.sale.lead && p.sale.plot && p.sale.plot.estate).map((p: any) => ({
                    id: p.id,
                    amount: p.amount,
                    date: p.date,
                    clientName: p.sale.lead.fullName,
                    product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`
                }));

                const myDueComms = myPayments.filter(p => !p.isCommissionPaid);
                detailedDueCommissions = myDueComms.filter((p: any) => p.sale && p.sale.lead && p.sale.plot && p.sale.plot.estate).map((p: any) => ({
                    id: p.id,
                    amount: p.amount,
                    commission: ((p.amount * commissionRate) / 100) - (p.virtualLoanAmount || 0),
                    date: p.date,
                    clientName: p.sale.lead.fullName,
                    product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`,
                    saleType: "[DIRECT SALE]"
                }));

                const myPaidComms = myPayments.filter(p => p.isCommissionPaid);
                detailedPaidCommissions = myPaidComms.filter((p: any) => p.sale && p.sale.lead && p.sale.plot && p.sale.plot.estate).map((p: any) => ({
                    id: p.id,
                    amount: p.amount,
                    commission: ((p.amount * commissionRate) / 100) - (p.virtualLoanAmount || 0),
                    date: p.commissionDisbursedAt || p.date,
                    clientName: p.sale.lead.fullName,
                    product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`,
                    saleType: "[DIRECT SALE]"
                }));
            }
            
            // Actually I need to inject `saleType` into the commission payloads for Accountants.
            // Let's adjust the where clauses for Accountant/MD Due Commissions.
            if (['ACCOUNTANT', 'MANAGING_DIRECTOR'].includes(role)) {
                const accDueCommsMatch = await prisma.payment.findMany({
                    where: { ...paymentWhereClause, status: 'APPROVED', isCommissionPaid: false },
                    orderBy: { date: 'desc' },
                    include: { sale: { include: { lead: true, marketer: true, plot: { include: { estate: true } } } } }
                });
                
                detailedDueCommissions = accDueCommsMatch.filter((p: any) => p.sale && p.sale.lead && p.sale.plot && p.sale.plot.estate).map((p: any) => {
                    const commRate = p.sale.marketerCommissionRate || p.sale.marketer?.commissionRate || 5;
                    let tag = "[DIRECT SALE]";
                    const isSellingCompany = p.sale.marketer?.companyId === companyId;
                    const isManagingCompany = p.sale.plot.estate.companyId === companyId;
                    const isSellingBranch = p.sale.marketer?.branchId === branchId;
                    const isManagingBranch = p.sale.plot.estate.managingBranchId === branchId;

                    if (role === 'ACCOUNTANT') {
                        if (isSellingBranch && isManagingBranch) tag = "[DIRECT SALE]";
                        else if (isSellingBranch && !isManagingBranch) tag = "[OUTBOUND CROSS-SALE]";
                        else if (!isSellingBranch && isManagingBranch) tag = "[INBOUND CROSS-SALE]";
                    } else {
                        if (isSellingCompany && isManagingCompany) tag = "[DIRECT SALE]";
                        else if (isSellingCompany && !isManagingCompany) tag = "[OUTBOUND CROSS-SALE]";
                        else if (!isSellingCompany && isManagingCompany) tag = "[INBOUND CROSS-SALE]";
                    }

                    return {
                        id: p.id,
                        amount: p.amount,
                        commission: ((p.amount * commRate) / 100) - (p.virtualLoanAmount || 0),
                        date: p.date,
                        clientName: p.sale.lead.fullName,
                        product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`,
                        saleType: tag
                    };
                });

                const accPaidCommsMatch = await prisma.payment.findMany({
                    where: { ...paymentWhereClause, status: 'APPROVED', isCommissionPaid: true },
                    orderBy: { date: 'desc' },
                    include: { sale: { include: { lead: true, marketer: true, plot: { include: { estate: true } } } } }
                });

                detailedPaidCommissions = accPaidCommsMatch.filter((p: any) => p.sale && p.sale.lead && p.sale.plot && p.sale.plot.estate).map((p: any) => {
                    const commRate = p.sale.marketerCommissionRate || p.sale.marketer?.commissionRate || 5;
                    let tag = "[DIRECT SALE]";
                    const isSellingCompany = p.sale.marketer?.companyId === companyId;
                    const isManagingCompany = p.sale.plot.estate.companyId === companyId;
                    const isSellingBranch = p.sale.marketer?.branchId === branchId;
                    const isManagingBranch = p.sale.plot.estate.managingBranchId === branchId;

                    if (role === 'ACCOUNTANT') {
                        if (isSellingBranch && isManagingBranch) tag = "[DIRECT SALE]";
                        else if (isSellingBranch && !isManagingBranch) tag = "[OUTBOUND CROSS-SALE]";
                        else if (!isSellingBranch && isManagingBranch) tag = "[INBOUND CROSS-SALE]";
                    } else {
                        if (isSellingCompany && isManagingCompany) tag = "[DIRECT SALE]";
                        else if (isSellingCompany && !isManagingCompany) tag = "[OUTBOUND CROSS-SALE]";
                        else if (!isSellingCompany && isManagingCompany) tag = "[INBOUND CROSS-SALE]";
                    }
                    
                    return {
                        id: p.id,
                        amount: p.amount,
                        commission: ((p.amount * commRate) / 100) - (p.virtualLoanAmount || 0),
                        date: p.commissionDisbursedAt || p.date,
                        clientName: p.sale.lead.fullName,
                        product: `${p.sale.plot.prototype} - ${p.sale.plot.estate.name}`,
                        saleType: tag
                    };
                });
            }

            res.json({
                financial: {
                    totalRevenue: totalSalesGenerated, // Legacy prop name for UI safety
                    salesCount,
                    totalSalesValue,
                    totalLeads,
                    clientLeads,
                    conversionRate: totalLeads > 0 ? ((clientLeads / totalLeads) * 100).toFixed(1) : 0,
                    paidCommissions,
                    pendingCommissions,
                    totalSalesGenerated,
                    grossCashReceived,
                    directSalesVolume,
                    inboundSalesVolume,
                    outboundSalesVolume,
                    commissionRate,
                    paidReferralCommissions,
                    pendingReferralCommissions,
                    esthCoinBalance
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
