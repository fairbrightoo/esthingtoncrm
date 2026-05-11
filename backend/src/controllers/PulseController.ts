import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const PulseController = {
    // Get the Daily Pulse for a specific marketer
    async getDailyPulse(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }; // Target Marketer ID
            
            // Get today's bounds
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const dateFilter = { gte: startOfDay, lte: endOfDay };

            // 1. Leads Generated Today
            const leadsGeneratedToday = await prisma.lead.count({
                where: { assignedToUserId: id, createdAt: dateFilter }
            });

            // 2. Follow-ups Completed Today (Tasks completed)
            const followUpsCompletedToday = await prisma.task.count({
                where: { 
                    assignedToUserId: id, 
                    isCompleted: true, 
                    updatedAt: dateFilter // Assuming it was marked complete today
                }
            });

            // 3. Site Inspections Today
            // Since we don't have an explicit Inspection model, we look for Tasks that have 'Inspection' in the title or description that were completed today.
            const inspectionsToday = await prisma.task.count({
                where: {
                    assignedToUserId: id,
                    isCompleted: true,
                    updatedAt: dateFilter,
                    OR: [
                        { title: { contains: 'Inspection', mode: 'insensitive' } },
                        { description: { contains: 'Inspection', mode: 'insensitive' } }
                    ]
                }
            });

            // 4. Pipeline Health (Cold Leads)
            // Leads that are not clients and haven't had any activity in the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const allActiveLeads = await prisma.lead.count({
                where: { assignedToUserId: id, status: { not: 'CLIENT' } }
            });

            const coldLeads = await prisma.lead.count({
                where: { 
                    assignedToUserId: id, 
                    status: { not: 'CLIENT' },
                    updatedAt: { lt: sevenDaysAgo }
                }
            });

            const pipelineHealthScore = allActiveLeads > 0 
                ? Math.round(((allActiveLeads - coldLeads) / allActiveLeads) * 100) 
                : 100;

            res.json({
                userId: id,
                date: startOfDay.toISOString().split('T')[0],
                metrics: {
                    leadsGeneratedToday,
                    followUpsCompletedToday,
                    inspectionsToday,
                },
                health: {
                    activeLeads: allActiveLeads,
                    coldLeads,
                    pipelineHealthScore
                }
            });
        } catch (error) {
            console.error("Failed to fetch daily pulse", error);
            res.status(500).json({ error: 'Failed to fetch daily pulse' });
        }
    }
};
