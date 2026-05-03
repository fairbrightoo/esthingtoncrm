import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';


export const GMDAnalyticsController = {
    /**
     * Get aggregated global metrics across all branches for the GMD's company
     */
    async getGlobalMetrics(req: Request, res: Response) {
        const { companyId } = (req as AuthRequest).user!;
        const { startDate, endDate } = req.query;

        let dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string + 'T23:59:59.999Z')
                }
            };
        }

        try {
            // Aggregate all active leads from this company created within period
            const totalLeads = await prisma.lead.count({
                where: { 
                    companyId: companyId!,
                    ...(startDate && endDate ? { createdAt: dateFilter.createdAt } : {}) 
                }
            });

            // Aggregate total sales volume (by clients converted in period or sales created in period depending on metric)
            // Let's filter sales directly
            const totalSalesData = await prisma.sale.findMany({
                where: { 
                    lead: { companyId: companyId! },
                    ...dateFilter
                }
            });
            const totalSales = totalSalesData.length;

            // Mocked financial metrics or computed if Wallet exists. Let's send structured data.
            const branches = await prisma.branch.findMany({
                where: { companyId: companyId! },
                include: {
                    _count: {
                        select: { leads: true, users: true }
                    },
                    leads: {
                        where: (startDate && endDate ? { createdAt: dateFilter.createdAt } : {}),
                        include: {
                            sales: {
                                where: dateFilter
                            }
                        }
                    }
                }
            });

            const branchPerformance = branches.map(b => {
                // Calculate estimated revenue by summing up agreed price of all sales 
                // associated with leads from this branch.
                let branchRevenue = 0;
                b.leads.forEach(lead => {
                    lead.sales.forEach(sale => {
                        branchRevenue += sale.agreedPrice;
                    });
                });

                return {
                    id: b.id,
                    name: b.name,
                    totalLeads: b._count.leads,
                    staffCount: b._count.users,
                    revenue: branchRevenue
                };
            });

            res.json({
                totalBranches: branches.length,
                totalLeads,
                totalSales,
                globalRevenue: branchPerformance.reduce((acc, curr) => acc + curr.revenue, 0),
                branchPerformance
            });
        } catch (error) {
            console.error('Error fetching GMD metrics:', error);
            res.status(500).json({ error: 'Failed to fetch global metrics' });
        }
    }
};
