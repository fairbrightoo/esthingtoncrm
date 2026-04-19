import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();

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
        const { subject, message, recipientId } = req.body;

        try {
            // Validate Recipient exists in company
            const recipient = await prisma.user.findFirst({
                where: { id: recipientId, companyId: companyId! }
            });

            if (!recipient) {
                return res.status(404).json({ error: 'Recipient not found in your company' });
            }

            const memo = await prisma.executiveMemo.create({
                data: {
                    companyId: companyId!,
                    branchId: branchId || null,
                    senderId: userId,
                    recipientId: recipientId,
                    subject,
                    message,
                    status: 'PENDING'
                },
                include: {
                    sender: { select: { id: true, fullName: true, role: true } },
                    recipient: { select: { id: true, fullName: true, role: true } },
                    branch: { select: { name: true } }
                }
            });

            res.json(memo);
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
            const memo = await prisma.executiveMemo.findUnique({ where: { id } });
            
            if (!memo || memo.recipientId !== userId) {
                return res.status(403).json({ error: 'Unauthorized to respond to this memo' });
            }

            const updated = await prisma.executiveMemo.update({
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
     * Get GMDs/MDs Directory for dropdown to target a memo
     */
    async getMemoContacts(req: Request, res: Response) {
        const { companyId, userId } = (req as AuthRequest).user!;
        
        try {
            const users = await prisma.user.findMany({
                where: {
                    companyId: companyId!,
                    role: { in: ['GROUP_MANAGING_DIRECTOR', 'MANAGING_DIRECTOR'] },
                    id: { not: userId } // Don't message yourself
                },
                select: {
                    id: true,
                    fullName: true,
                    role: true,
                    branch: { select: { name: true } }
                }
            });
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch contacts' });
        }
    }
};
