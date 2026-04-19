import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export const AnnouncementController = {
    async getAnnouncements(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = user.companyId;

            const announcements = await prisma.announcement.findMany({
                where: { companyId },
                include: {
                    author: {
                        select: { id: true, fullName: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(announcements);
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
