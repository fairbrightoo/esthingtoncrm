import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';


export const ExecutiveMemoController = {
    /**
     * Get Memos for Current User (Inbox/Outbox)
     */
    async getMemos(req: Request, res: Response) {
        const { userId, role, companyId } = (req as AuthRequest).user!;
        
        try {
            const memos = await prisma.executiveMemo.findMany({
                where: {
                    OR: [
                        { recipientId: userId },
                        { senderId: userId }
                    ],
                    companyId: companyId!
                },
                include: {
                    sender: { select: { id: true, fullName: true, role: true } },
                    recipient: { select: { id: true, fullName: true, role: true } },
                    branch: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(memos);
        } catch (error) {
            console.error('Error fetching memos:', error);
            res.status(500).json({ error: 'Failed to fetch messages.' });
        }
    },

    /**
     * Send Memo
     */
    async sendMemo(req: Request, res: Response) {
        const { userId, companyId, branchId, role } = (req as AuthRequest).user!;
        const { subject, message, recipientIds } = req.body;

        if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
            return res.status(400).json({ error: 'Please select at least one recipient' });
        }

        try {
            const memosToCreate = recipientIds.map(id => ({
                companyId: companyId!,
                branchId: branchId || null,
                senderId: userId,
                recipientId: id,
                subject,
                message,
                status: 'PENDING'
            }));

            await prisma.executiveMemo.createMany({
                data: memosToCreate
            });

            res.json({ success: true, count: recipientIds.length });
        } catch (error) {
            console.error('Error sending memo:', error);
            res.status(500).json({ error: 'Failed to send memo.' });
        }
    },

    /**
     * Respond to Memo (Approve / Decline)
     */
    async respondToMemo(req: Request, res: Response) {
        const { userId } = (req as AuthRequest).user!;
        const { id } = req.params;
        const { status } = req.body; // 'APPROVED' | 'DECLINED'

        if (!['APPROVED', 'DECLINED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        try {
                // @ts-ignore
            const memo = await prisma.executiveMemo.findUnique({ where: { id } });
            
            if (!memo || memo.recipientId !== userId) {
                return res.status(403).json({ error: 'Unauthorized to respond to this memo' });
            }

            const updated = await prisma.executiveMemo.update({
                // @ts-ignore
                where: { id },
                data: { status },
                include: {
                    sender: { select: { id: true, fullName: true, role: true } },
                    recipient: { select: { id: true, fullName: true, role: true } },
                    branch: { select: { name: true } }
                }
            });

            res.json(updated);
        } catch (error) {
            console.error('Error responding config:', error);
            res.status(500).json({ error: 'Failed to update memo status.' });
        }
    },

    /**
     * Get Contacts Directory for dropdown to target a memo
     */
    async getMemoContacts(req: Request, res: Response) {
        const { companyId, branchId, userId, role } = (req as AuthRequest).user!;
        
        try {
            let whereClause: any = {
                companyId: companyId!,
                id: { not: userId },
                isActive: true
            };

            if (role === 'GROUP_MANAGING_DIRECTOR') {
                // GMD can see everyone in the company
            } else if (role === 'MANAGING_DIRECTOR') {
                // MD can see everyone in their branch, PLUS GMDs
                whereClause.OR = [
                    { branchId: branchId },
                    { role: 'GROUP_MANAGING_DIRECTOR' }
                ];
            } else {
                whereClause.OR = [
                    { branchId: branchId },
                    { role: { in: ['GROUP_MANAGING_DIRECTOR', 'MANAGING_DIRECTOR'] } }
                ];
            }

            const users = await prisma.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    fullName: true,
                    role: true,
                    branch: { select: { name: true } }
                },
                orderBy: { fullName: 'asc' }
            });
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch contacts' });
        }
    },

    /**
     * Get unread (PENDING) memo count for the current user
     */
    async getUnreadCount(req: Request, res: Response) {
        const { userId } = (req as AuthRequest).user!;
        try {
            const count = await prisma.executiveMemo.count({
                where: {
                    recipientId: userId,
                    status: 'PENDING'
                }
            });
            res.json({ unreadCount: count });
        } catch (error) {
            console.error('Error fetching unread memo count:', error);
            res.status(500).json({ error: 'Failed to fetch unread memo count.' });
        }
    }
};
