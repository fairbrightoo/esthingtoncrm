import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const HRRecommendationController = {
    async createRecommendation(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, role, companyId, branchId } = req.user!;
            if (role !== "GENERAL_MANAGER" && role !== "SUPER_ADMIN") {
                res.status(403).json({ error: "Only GMs can issue HR recommendations." });
                return;
            }

            const { targetUserId, type, reason } = req.body;

            if (!targetUserId || !type || !reason) {
                res.status(400).json({ error: "Target user, type, and reason are required." });
                return;
            }

            const recommendation = await prisma.hRRecommendation.create({
                data: {
                    targetUserId,
                    type,
                    reason,
                    authorId: userId,
                    branchId: branchId || "",
                    companyId: companyId || ""
                }
            });

            res.status(201).json({ message: "HR Recommendation dispatched successfully", recommendation });
        } catch (error) {
            console.error("Error creating HR recommendation:", error);
            res.status(500).json({ error: "Failed to dispatch recommendation." });
        }
    },

    async getRecommendations(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { branchId, role } = req.user!;
            
            // Allow GMs to see their own branch recommendations, HR to see them as well
            if (role !== "GENERAL_MANAGER" && role !== "BRANCH_HR" && role !== "SUPER_ADMIN" && role !== "MANAGING_DIRECTOR") {
                res.status(403).json({ error: "Unauthorized access." });
                return;
            }
            
            const recommendations = await prisma.hRRecommendation.findMany({
                where: { branchId: branchId || "" },
                include: {
                    author: { select: { fullName: true, role: true } },
                    targetUser: { select: { fullName: true, role: true, email: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.status(200).json(recommendations);
        } catch (error) {
            console.error("Error fetching HR recommendations:", error);
            res.status(500).json({ error: "Failed to fetch recommendations." });
        }
    }
};
