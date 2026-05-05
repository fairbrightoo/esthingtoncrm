import { Request, Response } from 'express';
import prisma from '../config/prisma.js';


export const AnnouncementController = {
    async getAnnouncements(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = user.companyId;

            // 1. Fetch Standard Company Announcements
            let announcements: any[] = [];
            if (companyId) {
                announcements = await prisma.announcement.findMany({
                    where: { companyId },
                    include: {
                        author: {
                            select: { id: true, fullName: true, role: true }
                        }
                    }
                });
            }

            // 2. Fetch Dashboard Broadcasts from Global Chairman
            const dbBroadcasts = await prisma.dashboardBroadcast.findMany({
                include: {
                    author: {
                        select: { id: true, fullName: true, role: true }
                    }
                }
            });

            // 3. Filter Broadcasts depending on audience
            const applicableBroadcasts = dbBroadcasts.filter(b => {
                if (b.audienceType === 'ALL_STAFF') return true;
                if (b.audienceType === 'ALL_MDS' && user.role === 'MANAGING_DIRECTOR') return true;
                if (b.audienceType === 'COMPANY' && b.targetId === user.companyId) return true;
                if (b.audienceType === 'BRANCH' && b.targetId === user.branchId) return true;
                return false;
            });

            // 4. Map to match Announcement Interface
            const formattedBroadcasts = applicableBroadcasts.map(b => ({
                id: b.id,
                title: b.title,
                content: b.content,
                priority: b.priority,
                createdAt: b.createdAt,
                author: b.author,
                isGlobalBroadcast: true // UI flag
            }));

            // 5. Combine and sort
            const combined = [...announcements, ...formattedBroadcasts].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            res.json(combined);
        } catch (error) {
            console.error('Get Announcements Error:', error);
            res.status(500).json({ error: 'Failed to fetch announcements' });
        }
    },

    async createAnnouncement(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = user.companyId;
            const { title, content, priority } = req.body;

            // Only HR or Admin can create
            if (user.role !== 'BRANCH_HR' && user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_ADMIN') {
                return res.status(403).json({ error: 'You do not have permission to create announcements' });
            }

            const announcement = await prisma.announcement.create({
                data: {
                    title,
                    content,
                    priority: priority || 'NORMAL',
                    companyId: companyId,
                    authorId: user.userId
                },
                include: {
                    author: {
                        select: { id: true, fullName: true, role: true }
                    }
                }
            });

            res.json(announcement);
        } catch (error) {
            console.error('Create Announcement Error:', error);
            res.status(500).json({ error: 'Failed to create announcement' });
        }
    },

    async deleteAnnouncement(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { id } = req.params as { id: string };

            const announcement = await prisma.announcement.findUnique({
                where: { id }
            });

            if (!announcement) {
                return res.status(404).json({ error: 'Announcement not found' });
            }

            // Only author or admin can delete
            if (announcement.authorId !== user.userId && user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_ADMIN') {
                return res.status(403).json({ error: 'You do not have permission to delete this announcement' });
            }

            await prisma.announcement.delete({
                where: { id }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Delete Announcement Error:', error);
            res.status(500).json({ error: 'Failed to delete announcement' });
        }
    }
};
