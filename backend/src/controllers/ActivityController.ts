
import { Request, Response } from 'express';
import prisma from '../config/prisma.js';


export const ActivityController = {
    // Get Activities for a Lead with Role-Based Visibility
    async getActivities(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { leadId } = req.params;

            // Marketers see:
            // 1. All activities by Customer Care (Role = CUSTOMER_CARE)
            // 2. All activities by Branch Admin (Role = BRANCH_ADMIN)
            // 3. Their OWN activities (Creator = Me)
            // 4. BUT NOT private activities of other marketers (if that ever happens) - User said "privy to themselves"

            // Customer Care sees:
            // 1. Their own logs.
            // 2. Admin logs.
            // 3. BUT NOT Marketer private logs? - User said Marketer logs are "not for customer care".

            // Let's implement this logic:
            let whereClause: any = {
                leadId: leadId
            };

            if (user.role === 'MARKETER') {
                whereClause.OR = [
                    { createdByUser: { role: 'CUSTOMER_CARE' } },
                    { createdByUser: { role: 'BRANCH_ADMIN' } },
                    { createdByUserId: user.userId }
                ];
            } else if (user.role === 'CUSTOMER_CARE') {
                whereClause.OR = [
                    { createdByUser: { role: 'CUSTOMER_CARE' } },
                    { createdByUser: { role: 'BRANCH_ADMIN' } }
                    // Excludes Marketer logs!
                ];
            }
            // Branch Admin / Super Admin sees everything

            const activities = await prisma.activity.findMany({
                where: whereClause,
                include: {
                    createdByUser: {
                        select: { id: true, fullName: true, role: true }
                    }
                },
                orderBy: { timestamp: 'desc' }
            });

            res.json(activities);
        } catch (error) {
            console.error('Get Activities Error:', error);
            res.status(500).json({ error: 'Failed to fetch activities' });
        }
    },

    // Log Activity
    async createActivity(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { leadId } = req.params;
            const { type, notes, direction } = req.body;

            const activity = await prisma.activity.create({
                data: {
                    leadId: String(leadId),
                    type,
                    direction,
                    notes,
                    createdByUserId: user.userId,
                    timestamp: new Date()
                },
                include: {
                    createdByUser: {
                        select: { fullName: true, role: true }
                    }
                }
            });

            // Update Lead "Last Activity"? (Optional but good UX)
            await prisma.lead.update({
                where: { id: String(leadId) },
                data: { updatedAt: new Date() }
            });

            res.json(activity);
        } catch (error) {
            console.error('Create Activity Error:', error);
            res.status(500).json({ error: 'Failed to log activity' });
        }
    },

    // Delete Activity
    async deleteActivity(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { activityId } = req.params;

            const activity = await prisma.activity.findUnique({
                where: { id: String(activityId) }
            });

            if (!activity) {
                return res.status(404).json({ error: 'Activity not found' });
            }

            if (activity.createdByUserId !== user.userId && user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_ADMIN') {
                return res.status(403).json({ error: 'You do not have permission to delete this activity' });
            }

            await prisma.activity.delete({
                where: { id: String(activityId) }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Delete Activity Error:', error);
            res.status(500).json({ error: 'Failed to delete activity' });
        }
    }
};
