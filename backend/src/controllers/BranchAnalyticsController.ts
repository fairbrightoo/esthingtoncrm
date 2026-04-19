import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const BranchAnalyticsController = {
    async getBranchStats(req: Request, res: Response) {
        try {
            const { branchId } = req.params;

            // @ts-ignore
            const user = req.user;

            // Security Check: Ensure user belongs to this branch (unless Super Admin)
            if (user.role !== 'SUPER_ADMIN' && user.branchId !== branchId) {
                return res.status(403).json({ error: 'Access denied to this branch stats' });
            }

            // 1. Leads by Status
            const statusCounts = await prisma.lead.groupBy({
                by: ['status'],
                where: { branchId: String(branchId) },
                _count: { id: true }
            });

            // 2. Leads by Marketer (Top 5)
            const leadsByMarketer = await prisma.lead.groupBy({
                by: ['assignedToUserId'],
                where: { branchId: String(branchId) },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            });

            // Resolve Marketer Names
            const marketerIds = leadsByMarketer.map(item => item.assignedToUserId).filter(id => id !== null) as string[];
            const marketers = await prisma.user.findMany({
                where: { id: { in: marketerIds } },
                select: { id: true, fullName: true }
            });

            const marketerStats = leadsByMarketer.map(item => {
                const mk = marketers.find(m => m.id === item.assignedToUserId);
                return {
                    name: mk ? mk.fullName : 'Unassigned',
                    value: item._count.id
                };
            });

            // 3. Recent Activity in Branch
            const recentActivity = await prisma.activity.findMany({
                where: {
                    lead: { branchId: String(branchId) }
                },
                take: 10,
                orderBy: { timestamp: 'desc' },
                include: {
                    lead: { select: { fullName: true } },
                    createdByUser: { select: { fullName: true } }
                }
            });

            // 4. Total Leads Count
            const totalLeads = await prisma.lead.count({ where: { branchId: String(branchId) } });

            // 5. Total Verified Leads
            const verifiedLeads = await prisma.lead.count({
                where: {
                    branchId: String(branchId),
                    isVerified: true
                }
            });

            res.json({
                counts: {
                    total: totalLeads,
                    verified: verifiedLeads
                },
                charts: {
                    byStatus: statusCounts.map(s => ({ name: s.status, value: s._count.id })),
                    byMarketer: marketerStats
                },
                recentActivity: recentActivity.map(a => ({
                    id: a.id,
                    type: a.type,
                    description: a.notes,
                    leadName: a.lead?.fullName || 'Unknown',
                    byUser: a.createdByUser?.fullName || 'System',
                    timestamp: a.timestamp
                }))
            });

        } catch (error) {
            console.error('Branch Analytics Error:', error);
            res.status(500).json({ error: 'Failed to fetch branch stats' });
        }
    }
};
