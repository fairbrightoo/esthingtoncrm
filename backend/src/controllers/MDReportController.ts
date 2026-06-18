import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const MDReportController = {
    async getMDAnalytics(req: Request, res: Response) {
        try {
            const { branchId, startDate, endDate } = req.query;

            if (!branchId) {
                res.status(400).json({ error: 'Branch ID is required for MD Analytics' });
                return;
            }

            // Date filtering
            const dateFilter: any = {};
            if (startDate) {
                dateFilter.gte = new Date(startDate as string);
            }
            if (endDate) {
                dateFilter.lte = new Date(endDate as string);
            }

            const user = (req as any).user;
            const companyId = user?.companyId;

            const paymentWhere: any = { status: 'APPROVED' };
            if (startDate || endDate) paymentWhere.date = dateFilter;

            const saleWhere: any = {};
            if (user?.role === 'MANAGING_DIRECTOR' || !branchId) {
                paymentWhere.OR = [
                    { sale: { marketer: { companyId } } },
                    { sale: { plot: { estate: { companyId } } } }
                ];
                saleWhere.OR = [
                    { marketer: { companyId } },
                    { plot: { estate: { companyId } } }
                ];
            } else {
                paymentWhere.OR = [
                    { sale: { marketer: { branchId: branchId as string } } },
                    { sale: { plot: { estate: { managingBranchId: branchId as string } } } }
                ];
                saleWhere.OR = [
                    { marketer: { branchId: branchId as string } },
                    { plot: { estate: { managingBranchId: branchId as string } } }
                ];
            }

            const salesForChartsWhere = { ...saleWhere };
            if (startDate || endDate) salesForChartsWhere.createdAt = dateFilter;

            const payments = await prisma.payment.findMany({
                where: paymentWhere,
                include: {
                    recordedByUser: true,
                    sale: {
                        include: {
                            marketer: { include: { branch: true } },
                            plot: { include: { estate: { include: { branch: true } } } },
                            lead: true
                        }
                    }
                }
            });

            let totalSalesGenerated = 0;
            let directSalesVolume = 0;
            let inboundSalesVolume = 0;
            let outboundSalesVolume = 0;
            const detailedSalesData: any[] = [];

            payments.forEach(p => {
                const s = p.sale;
                const isSellingCompany = s.marketer?.companyId === companyId;
                const isManagingCompany = s.plot?.estate?.companyId === companyId;
                const isSellingBranch = s.marketer?.branchId === branchId;
                const isManagingBranch = s.plot?.estate?.managingBranchId === branchId;
                
                let saleType = 'Direct Sale';
                if (user?.role === 'MANAGING_DIRECTOR' || !branchId) {
                    if (isSellingCompany) totalSalesGenerated += p.amount;
                    if (isSellingCompany && isManagingCompany) directSalesVolume += p.amount;
                    else if (isSellingCompany && !isManagingCompany) { saleType = 'Outbound Cross-Sale'; outboundSalesVolume += p.amount; }
                    else if (!isSellingCompany && isManagingCompany) { saleType = 'Inbound Cross-Sale'; inboundSalesVolume += p.amount; }
                } else {
                    if (isSellingBranch) totalSalesGenerated += p.amount;
                    if (isSellingBranch && isManagingBranch) directSalesVolume += p.amount;
                    else if (isSellingBranch && !isManagingBranch) { saleType = 'Outbound Cross-Sale'; outboundSalesVolume += p.amount; }
                    else if (!isSellingBranch && isManagingBranch) { saleType = 'Inbound Cross-Sale'; inboundSalesVolume += p.amount; }
                }

                detailedSalesData.push({
                    paymentId: p.id,
                    amount: p.amount,
                    date: p.date,
                    clientName: s.lead?.fullName || 'Unknown',
                    marketerName: s.marketer?.fullName || 'Unknown',
                    estateName: s.plot?.estate?.name || 'Unknown',
                    plotNumber: s.plot?.plotNumber || 'Unknown',
                    managingBranchName: s.plot?.estate?.branch?.name || 'Head Office',
                    saleType
                });
            });

            // Calculate Gross Cash Received (Physical deposits in our accounts)
            const cashWhere: any = { status: 'APPROVED', OR: [] };
            if (startDate || endDate) cashWhere.date = dateFilter;
            
            if (user?.role === 'MANAGING_DIRECTOR' || !branchId) {
                const companyBranches = await prisma.branch.findMany({ where: { companyId }, select: { id: true } });
                const branchIds = companyBranches.map(b => b.id);
                cashWhere.OR.push({ receivingBranchId: { in: branchIds } });
                cashWhere.OR.push({ receivingBranchId: null, sale: { plot: { estate: { managingBranchId: { in: branchIds } } } } });
            } else {
                cashWhere.OR.push({ receivingBranchId: branchId });
                cashWhere.OR.push({ receivingBranchId: null, sale: { plot: { estate: { managingBranchId: branchId } } } });
            }

            const cashPayments = await prisma.payment.findMany({
                where: cashWhere,
                select: { amount: true }
            });
            const grossCashReceived = cashPayments.reduce((sum, p) => sum + p.amount, 0);
            const grossRevenue = grossCashReceived;

            // Fetch ALL ongoing sales for Total Debt (ignores date filter because old debt is still debt)
            const allOngoingSales = await prisma.sale.findMany({
                where: { ...saleWhere, status: 'ONGOING' }
            });
            const outstandingDebt = allOngoingSales.reduce((sum, s) => sum + (s.agreedPrice - (s.totalPaid || 0)), 0);

            // 2. Fetch Sales within the Date specific range for Estate Distribution and overall lead counts
            const periodSales = await prisma.sale.findMany({
                where: salesForChartsWhere,
                include: {
                    plot: { include: { estate: true } },
                    lead: { include: { assignedToUser: true } }
                }
            });

            // 3. Calculate Estate Distribution
            const estateMap: Record<string, { name: string, volume: number, count: number }> = {};
            periodSales.forEach(sale => {
                const estateName = sale.plot?.estate?.name || 'Unknown Estate';
                if (!estateMap[estateName]) {
                    estateMap[estateName] = { name: estateName, volume: 0, count: 0 };
                }
                estateMap[estateName].count += 1;
                estateMap[estateName].volume += sale.agreedPrice;
            });
            const estateDistribution = Object.values(estateMap);

            // 4. Calculate Top Performers (Leaderboard) from Approved Payments in this period
            // So marketers get credit when the money lands (approved).
            const marketerMap: Record<string, { id: string, name: string, role: string, collected: number, commissionEstimate: number }> = {};
            
            // Note: We need the Marketer associated with the SALE to calculate commissions,
            // The marketer is the one who closed the sale.
            const paymentsWithMarketer = await prisma.payment.findMany({
                where: paymentWhere,
                include: {
                    sale: { include: { marketer: true } }
                }
            });

            let totalCommissionsCleared = 0;

            paymentsWithMarketer.forEach(p => {
                // The marketer who owns the sale gets the credit & commission
                const marketer = p.sale.marketer;
                const marketerId = marketer?.id || 'unassigned';
                const marketerName = marketer?.fullName || 'Unassigned Marketer';
                const role = marketer?.role || 'N/A';
                
                // Commission calculation (e.g., 5% or 10% based on their rate, assuming standard 5% if not set)
                // If standard CRM model: marketer.commissionRate exists, default 5%
                const commRate = (marketer as any)?.commissionRate || 5; 
                const commissionEarned = (p.amount * (commRate / 100)) - (p.virtualLoanAmount || 0);

                totalCommissionsCleared += commissionEarned;

                if (!marketerMap[marketerId]) {
                    marketerMap[marketerId] = { id: marketerId, name: marketerName, role: role, collected: 0, commissionEstimate: 0 };
                }
                marketerMap[marketerId].collected += p.amount;
                marketerMap[marketerId].commissionEstimate += commissionEarned;
            });

            // --- 5. Additional Expenses & Outflows ---
            const payrollWhere: any = { branchId: branchId as string, status: 'PAID' };
            if (startDate || endDate) payrollWhere.paidAt = dateFilter;
            const payrollRecords = await prisma.payrollRecord.findMany({ where: payrollWhere });
            const totalPayrollOverhead = payrollRecords.reduce((sum, p) => sum + p.netPay, 0);

            const reqWhere: any = { branchId: branchId as string, status: 'DISBURSED' };
            if (startDate || endDate) reqWhere.disbursedAt = dateFilter;
            const requisitions = await prisma.requisition.findMany({ where: reqWhere });
            const totalRequisitionExpenses = requisitions.reduce((sum, r) => sum + (r.amountApproved || 0), 0);

            const taxWhere: any = { branchId: branchId as string };
            if (startDate || endDate) taxWhere.remittedAt = dateFilter;
            const taxes = await prisma.taxRemittance.findMany({ where: taxWhere });
            const totalTaxesRemitted = taxes.reduce((sum, t) => sum + t.amount, 0);

            const netBranchProfit = grossRevenue - totalCommissionsCleared - totalPayrollOverhead - totalRequisitionExpenses - totalTaxesRemitted;

            // --- 6. 6-Month Cashflow Trend ---
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1); // Start of the 6th month ago
            
            const trendPayments = await prisma.payment.findMany({
                where: {
                    status: 'APPROVED',
                    sale: { plot: { estate: { managingBranchId: branchId as string } } },
                    date: { gte: sixMonthsAgo }
                }
            });
            const trendPayroll = await prisma.payrollRecord.findMany({
                where: { branchId: branchId as string, status: 'PAID', paidAt: { gte: sixMonthsAgo } }
            });
            const trendReqs = await prisma.requisition.findMany({
                where: { branchId: branchId as string, status: 'DISBURSED', disbursedAt: { gte: sixMonthsAgo } }
            });
            
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const trendMap = new Map();
            for (let i = 0; i < 6; i++) {
                const d = new Date();
                d.setMonth(d.getMonth() - (5 - i));
                const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
                trendMap.set(key, { name: key, revenue: 0, expenses: 0 });
            }

            trendPayments.forEach(p => {
                if(!p.date) return;
                const key = `${monthNames[p.date.getMonth()]} ${p.date.getFullYear().toString().substring(2)}`;
                if (trendMap.has(key)) {
                     trendMap.get(key).revenue += p.amount;
                     trendMap.get(key).expenses += (p.amount * 0.05); // Approx 5% commission as expense
                }
            });

            trendPayroll.forEach(p => {
                if(!p.paidAt) return;
                const key = `${monthNames[p.paidAt.getMonth()]} ${p.paidAt.getFullYear().toString().substring(2)}`;
                if (trendMap.has(key)) trendMap.get(key).expenses += p.netPay;
            });

            trendReqs.forEach(r => {
                if(!r.disbursedAt) return;
                const key = `${monthNames[r.disbursedAt.getMonth()]} ${r.disbursedAt.getFullYear().toString().substring(2)}`;
                if (trendMap.has(key)) trendMap.get(key).expenses += (r.amountApproved || 0);
            });

            const cashflowTrend = Array.from(trendMap.values());

            const leaderboard = Object.values(marketerMap).sort((a, b) => b.collected - a.collected);

            res.json({
                kpis: {
                    grossRevenue,
                    totalSalesGenerated,
                    grossCashReceived,
                    directSalesVolume,
                    inboundSalesVolume,
                    outboundSalesVolume,
                    outstandingDebt,
                    totalCommissionsCleared,
                    salesCount: periodSales.length,
                    totalPayrollOverhead,
                    totalRequisitionExpenses,
                    totalTaxesRemitted,
                    netBranchProfit
                },
                charts: {
                    estateDistribution,
                    cashflowTrend
                },
                leaderboard,
                detailedSalesData
            });

        } catch (error) {
            console.error('MD Analytics Error:', error);
            res.status(500).json({ error: 'Failed to generate Managing Director reports' });
        }
    }
};
