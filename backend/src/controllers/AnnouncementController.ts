import { Request, Response } from 'express';
import prisma from '../config/prisma.js';


export const AnnouncementController = {
    async getAnnouncements(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = user.companyId;

            // 1. Fetch Read Receipts for the current user
            const readReceipts = await prisma.noticeReadReceipt.findMany({
                where: { userId: user.userId || user.id }
            });
            const readAnnouncementIds = new Set(readReceipts.map(r => r.announcementId).filter(id => id));
            const readBroadcastIds = new Set(readReceipts.map(r => r.broadcastId).filter(id => id));

            // 2. Fetch Standard Company Announcements
            let announcements: any[] = [];
            if (companyId) {
                const rawAnnouncements = await prisma.announcement.findMany({
                    where: { 
                        companyId,
                        OR: [
                            { branchId: user.branchId },
                            { branchId: null }
                        ]
                    },
                    include: {
                        author: {
                            select: { id: true, fullName: true, role: true }
                        }
                    }
                });
                announcements = rawAnnouncements.filter(a => !readAnnouncementIds.has(a.id));
            }

            // 3. Fetch Dashboard Broadcasts from Global Chairman
            const dbBroadcasts = await prisma.dashboardBroadcast.findMany({
                include: {
                    author: {
                        select: { id: true, fullName: true, role: true }
                    }
                }
            });

            // 4. Filter Broadcasts depending on audience and read status
            const applicableBroadcasts = dbBroadcasts.filter(b => {
                if (readBroadcastIds.has(b.id)) return false; // Exclude read broadcasts

                if (b.audienceType === 'ALL_STAFF') return true;
                if (b.audienceType === 'ALL_MDS' && user.role === 'MANAGING_DIRECTOR') return true;
                if (b.audienceType === 'COMPANY' && b.targetId === user.companyId) return true;
                if (b.audienceType === 'BRANCH' && b.targetId === user.branchId) return true;
                return false;
            });

            // 5. Map to match Announcement Interface
            const formattedBroadcasts = applicableBroadcasts.map(b => ({
                id: b.id,
                title: b.title,
                content: b.content,
                priority: b.priority,
                createdAt: b.createdAt,
                author: b.author,
                isGlobalBroadcast: true // UI flag
            }));

            // 6. Combine and sort
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

            // Only HR, Admin, or Site Expert can create
            if (user.role !== 'BRANCH_HR' && user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_ADMIN' && user.role !== 'SITE_EXPERT') {
                return res.status(403).json({ error: 'You do not have permission to create announcements' });
            }

            const announcement = await prisma.announcement.create({
                data: {
                    title,
                    content,
                    priority: priority || 'NORMAL',
                    companyId: companyId,
                    branchId: (user.role === 'SUPER_ADMIN' || user.role === 'GLOBAL_CHAIRMAN') ? null : user.branchId,
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
    },

    async markAsRead(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { id, isGlobalBroadcast } = req.body;

            await prisma.noticeReadReceipt.create({
                data: {
                    userId: user.userId || user.id,
                    announcementId: isGlobalBroadcast ? null : id,
                    broadcastId: isGlobalBroadcast ? id : null
                }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Mark as Read Error:', error);
            res.status(500).json({ error: 'Failed to mark as read' });
        }
    },

    async getArchive(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            
            // Fetch all read receipts for this user
            const readReceipts = await prisma.noticeReadReceipt.findMany({
                where: { userId: user.userId || user.id },
                include: {
                    announcement: {
                        include: { author: { select: { id: true, fullName: true, role: true } } }
                    },
                    broadcast: {
                        include: { author: { select: { id: true, fullName: true, role: true } } }
                    }
                },
                orderBy: { readAt: 'desc' }
            });

            const archive = readReceipts.map(r => {
                if (r.broadcast) {
                    return {
                        id: r.broadcast.id,
                        title: r.broadcast.title,
                        content: r.broadcast.content,
                        priority: r.broadcast.priority,
                        createdAt: r.broadcast.createdAt,
                        readAt: r.readAt,
                        author: r.broadcast.author,
                        isGlobalBroadcast: true
                    };
                } else if (r.announcement) {
                    return {
                        id: r.announcement.id,
                        title: r.announcement.title,
                        content: r.announcement.content,
                        priority: r.announcement.priority,
                        createdAt: r.announcement.createdAt,
                        readAt: r.readAt,
                        author: r.announcement.author,
                        isGlobalBroadcast: false
                    };
                }
                return null;
            }).filter(Boolean);

            res.json(archive);
        } catch (error) {
            console.error('Get Archive Error:', error);
            res.status(500).json({ error: 'Failed to fetch notice archive' });
        }
    }
};
