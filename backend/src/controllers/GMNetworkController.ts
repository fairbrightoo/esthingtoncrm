import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GMNetworkController = {
    async sendMessage(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, role } = req.user!;
            if (role !== "GENERAL_MANAGER" && role !== "SUPER_ADMIN") {
                res.status(403).json({ error: "Only GMs can access the network." });
                return;
            }

            const { recipientId, message } = req.body;

            if (!recipientId || !message) {
                res.status(400).json({ error: "Recipient and message are required." });
                return;
            }

            const directMessage = await prisma.gMDirectMessage.create({
                data: {
                    senderId: userId,
                    recipientId,
                    message
                }
            });

            res.status(201).json({ message: "Message sent", directMessage });
        } catch (error) {
            console.error("Error sending GM message:", error);
            res.status(500).json({ error: "Failed to send message." });
        }
    },

    async getConversations(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, role } = req.user!;
            if (role !== "GENERAL_MANAGER" && role !== "SUPER_ADMIN") {
                res.status(403).json({ error: "Only GMs can access the network." });
                return;
            }

            // Get all messages where user is sender or recipient
            const messages = await prisma.gMDirectMessage.findMany({
                where: {
                    OR: [
                        { senderId: userId },
                        { recipientId: userId }
                    ]
                },
                include: {
                    sender: { select: { id: true, fullName: true, branch: { select: { name: true } }, company: { select: { name: true } } } },
                    recipient: { select: { id: true, fullName: true, branch: { select: { name: true } }, company: { select: { name: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.status(200).json(messages);
        } catch (error) {
            console.error("Error fetching GM messages:", error);
            res.status(500).json({ error: "Failed to fetch messages." });
        }
    },

    // Get list of other GMs across the network
    async getNetworkDirectory(req: AuthRequest, res: Response): Promise<void> {
        try {
            const gms = await prisma.user.findMany({
                where: { role: "GENERAL_MANAGER" },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    branch: { select: { name: true } },
                    company: { select: { name: true } }
                }
            });
            res.status(200).json(gms);
        } catch (error) {
            console.error("Error fetching network directory:", error);
            res.status(500).json({ error: "Failed to fetch network directory." });
        }
    }
};
