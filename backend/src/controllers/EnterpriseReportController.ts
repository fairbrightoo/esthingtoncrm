import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const EnterpriseReportController = {
    getFinancialAudit: async (req: Request, res: Response) => {
        try {
            const { startDate, endDate, companyId, branchId, status } = req.query;

            // Optional Date Filtering
            let dateFilter: any = {};
            if (startDate && endDate) {
                dateFilter = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            // Build dynamic Where Clause
            const whereClause: any = {};
            if (dateFilter.gte) whereClause.date = dateFilter;
            if (status && status !== 'ALL') whereClause.status = status;
            
            if (companyId && companyId !== 'ALL') {
                whereClause.sale = { marketer: { companyId } };
            }
            if (branchId && branchId !== 'ALL') {
                whereClause.sale = { ...whereClause.sale, marketer: { ...whereClause.sale?.marketer, branchId } };
            }

            const payments = await prisma.payment.findMany({
                where: whereClause,
                orderBy: { date: 'desc' },
                include: {
                    recordedByUser: {
                        select: { fullName: true }
                    },
                    sale: {
                        include: {
                            plot: {
                                include: { estate: true }
                            },
                            lead: {
                                include: {
                                    company: true,
                                    branch: true
                                }
                            },
                            marketer: {
                                select: { fullName: true }
                            }
                        }
                    }
                }
            });

            // Flatten data for frontend Excel/CSV export
            const flattenedData = payments.filter((p: any) => p.sale && p.sale.lead && p.sale.plot && p.sale.plot.estate).map(p => ({
                id: p.id,
                date: p.date,
                amount: p.amount,
                method: p.method,
                reference: p.reference || 'N/A',
                status: p.status,
                recordedBy: p.recordedByUser.fullName,
                customerName: p.sale.lead.fullName,
                customerPhone: p.sale.lead.phone,
                estateName: p.sale.plot.estate.name,
                plotNumber: p.sale.plot.plotNumber,
                companyName: p.sale.lead.company?.name || 'N/A',
                branchName: p.sale.lead.branch?.name || 'N/A',
                marketerName: p.sale.marketer?.fullName || 'N/A',
            }));

            res.json({ success: true, data: flattenedData });
        } catch (error) {
            console.error('Financial Audit Error:', error);
            res.status(500).json({ error: 'Failed to fetch financial audit' });
        }
    },

    getMarketerKPI: async (req: Request, res: Response) => {
        try {
            const { startDate, endDate, companyId } = req.query;

            let dateFilter: any = {};
            if (startDate && endDate) {
                dateFilter = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            // Fetch Marketers and their Leads
            const marketers = await prisma.user.findMany({
                where: {
                    role: 'MARKETER',
                    ...(companyId && companyId !== 'ALL' ? { companyId: companyId as string } : {})
                },
                include: {
                    company: { select: { name: true } },
                    branch: { select: { name: true } },
                    leads: {
                        where: dateFilter.gte ? { createdAt: dateFilter } : {},
                        include: {
                            sales: {
                                include: {
                                    payments: {
                                        where: { status: 'APPROVED' }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const kpiData = marketers.map(m => {
                const totalLeads = m.leads.length;
                let convertedLeads = 0;
                let totalRevenue = 0;

                m.leads.forEach(lead => {
                    if (lead.sales.length > 0) {
                        convertedLeads += 1;
                        lead.sales.forEach(sale => {
                            sale.payments.forEach(p => {
                                totalRevenue += p.amount;
                            });
                        });
                    }
                });

                return {
                    id: m.id,
                    name: m.fullName,
                    company: m.company?.name || 'N/A',
                    branch: m.branch?.name || 'N/A',
                    totalLeads,
                    convertedLeads,
                    conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0,
                    totalRevenue
                };
            });

            // Sort by Revenue descending
            kpiData.sort((a, b) => b.totalRevenue - a.totalRevenue);

            res.json({ success: true, data: kpiData });
        } catch (error) {
            console.error('Marketer KPI Error:', error);
            res.status(500).json({ error: 'Failed to fetch marketer KPI' });
        }
    },

    getHRPayroll: async (req: Request, res: Response) => {
        try {
            const { startDate, endDate, companyId, branchId } = req.query;

            let dateFilter: any = {};
            if (startDate && endDate) {
                dateFilter = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                };
            }

            const whereClause: any = {};
            if (companyId && companyId !== 'ALL') whereClause.companyId = companyId;
            if (branchId && branchId !== 'ALL') whereClause.branchId = branchId;

            // Fetch Staff
            const staff = await prisma.user.findMany({
                where: whereClause,
                include: {
                    company: { select: { name: true } },
                    branch: { select: { name: true } },
                    attendances: {
                        where: dateFilter.gte ? { date: dateFilter } : {}
                    }
                }
            });

            const hrData = staff.map(s => {
                const totalDays = s.attendances.length;
                const presentDays = s.attendances.filter(a => a.status === 'PRESENT' || a.status === 'APPROVED_LEAVE').length;
                const absentDays = s.attendances.filter(a => a.status === 'ABSENT').length;
                const lateDays = s.attendances.filter(a => a.status === 'LATE').length;
                
                // Extremely simple payroll calc just for reporting showcase (assuming 20 working days logic)
                const baseSalary = s.monthlySalary || 0;
                const dailyRate = baseSalary / 20; 
                const penalty = absentDays * dailyRate;
                const netPayable = Math.max(0, baseSalary - penalty);

                return {
                    id: s.id,
                    name: s.fullName,
                    role: s.role,
                    company: s.company?.name || 'N/A',
                    branch: s.branch?.name || 'N/A',
                    baseSalary,
                    totalDaysLogged: totalDays,
                    presentDays,
                    absentDays,
                    lateDays,
                    netPayable
                };
            });

            res.json({ success: true, data: hrData });
        } catch (error) {
            console.error('HR Payroll Error:', error);
            res.status(500).json({ error: 'Failed to fetch HR payroll' });
        }
    }
};
