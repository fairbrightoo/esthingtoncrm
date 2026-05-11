import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const TeamCommsController = {
    // 1. Get messages for a specific team
    async getTeamMessages(req: Request, res: Response) {
        try {
            const { teamId } = req.params as { teamId: string };
            
            const messages = await prisma.teamMessage.findMany({
                where: { teamId },
                include: {
                    sender: { select: { id: true, fullName: true, role: true, passportUrl: true } }
                },
                orderBy: { createdAt: 'asc' }
            });

            res.json(messages);
        } catch (error) {
            console.error("Failed to fetch team messages", error);
            res.status(500).json({ error: 'Failed to fetch team messages' });
        }
    },

    // 2. Send a message to a team
    async sendMessage(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { userId } = req.user;
            const { teamId } = req.params as { teamId: string };
            const { content } = req.body;

            if (!content) return res.status(400).json({ error: 'Message content is required' });

            const message = await prisma.teamMessage.create({
                data: {
                    content,
                    teamId,
                    senderId: userId
                },
                include: {
                    sender: { select: { id: true, fullName: true, role: true, passportUrl: true } }
                }
            });

            res.status(201).json(message);
        } catch (error) {
            console.error("Failed to send team message", error);
            res.status(500).json({ error: 'Failed to send team message' });
        }
    }
};
