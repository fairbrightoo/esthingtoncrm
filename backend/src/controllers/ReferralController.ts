import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const ReferralController = {
    // Generate a new code (Root Staff Only)
    generateCode: async (req: Request, res: Response) => {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const { percentage } = req.body;

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return res.status(404).json({ error: "User not found" });

            if (user.referralCodeId) {
                return res.status(403).json({ error: "External marketers cannot generate referral codes." });
            }

            if (percentage >= (user.commissionRate || 10)) {
                return res.status(400).json({ error: `Percentage must be strictly less than your base commission rate (${user.commissionRate}%).` });
            }

            const code = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            const referralCode = await prisma.referralCode.create({
                data: {
                    code,
                    creatorId: user.id,
                    percentage: Number(percentage)
                }
            });

            res.status(201).json(referralCode);
        } catch (error) {
            console.error("Generate Code Error:", error);
            res.status(500).json({ error: "Failed to generate referral code." });
        }
    },

    // Get user's active codes
    getMyCodes: async (req: Request, res: Response) => {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const codes = await prisma.referralCode.findMany({
                where: { creatorId: userId, isActive: true },
                include: { _count: { select: { users: true } } },
                orderBy: { createdAt: 'desc' }
            });
            res.json(codes);
        } catch (error) {
            console.error("Fetch Codes Error:", error);
            res.status(500).json({ error: "Failed to fetch codes." });
        }
    },

    // Get My Network
    getMyNetwork: async (req: Request, res: Response) => {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const referrals = await prisma.user.findMany({
                where: { referredById: userId },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    commissionRate: true,
                    createdAt: true
                }
            });

            // Calculate total earnings from referrals (referrerCommissionPaid or just from approved payments)
            const payments = await prisma.payment.findMany({
                where: {
                    status: 'APPROVED',
                    sale: { referrerId: userId }
                },
                include: { sale: true }
            });

            let totalReferralEarnings = 0;
            payments.forEach(p => {
                if (p.sale && p.sale.referrerCommissionRate) {
                    totalReferralEarnings += p.amount * (p.sale.referrerCommissionRate / 100);
                }
            });

            res.json({ referrals, totalReferralEarnings, payments });
        } catch (error) {
            console.error("Network Fetch Error:", error);
            res.status(500).json({ error: "Failed to fetch network." });
        }
    },

    // Validate code (Used by HR during registration)
    validateCode: async (req: Request, res: Response) => {
        try {
            const code = req.params.code as string;
            const referralCode = await prisma.referralCode.findUnique({
                where: { code: code.trim().toUpperCase() },
                include: { creator: { select: { fullName: true, commissionRate: true } } }
            });

            if (!referralCode || !referralCode.isActive) {
                return res.status(404).json({ error: "Invalid or inactive referral code." });
            }

            res.json({
                percentage: referralCode.percentage,
                referrerName: referralCode.creator.fullName
            });
        } catch (error) {
            console.error("Validate Code Error:", error);
            res.status(500).json({ error: "Failed to validate code." });
        }
    }
};
