import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const BranchBroadcastController = {
    async createBroadcast(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, role, companyId, branchId } = req.user!;
            if (role !== "GENERAL_MANAGER" && role !== "MANAGING_DIRECTOR" && role !== "SUPER_ADMIN") {
                res.status(403).json({ error: "Insufficient permissions to broadcast." });
                return;
            }

            const { title, content, targetTeamId } = req.body;

            if (!title || !content) {
                res.status(400).json({ error: "Title and content are required." });
                return;
            }

            const broadcast = await prisma.branchBroadcast.create({
                data: {
                    title,
                    content,
                    targetTeamId: targetTeamId || null,
                    authorId: userId,
                    branchId: branchId || "",
                    companyId: companyId || ""
                }
            });

            res.status(201).json({ message: "Broadcast dispatched successfully", broadcast });
        } catch (error) {
            console.error("Error creating broadcast:", error);
            res.status(500).json({ error: "Failed to create broadcast." });
        }
    },

    async getBroadcasts(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { branchId } = req.user!;
            
            const broadcasts = await prisma.branchBroadcast.findMany({
                where: { branchId: branchId || "" },
                include: {
                    author: { select: { fullName: true, role: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.status(200).json(broadcasts);
        } catch (error) {
            console.error("Error fetching broadcasts:", error);
            res.status(500).json({ error: "Failed to fetch broadcasts." });
        }
    }
};
