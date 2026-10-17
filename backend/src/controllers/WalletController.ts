import { Request, Response } from 'express';
import { WalletService } from '../services/WalletService.js';
import prisma from '../config/prisma.js';

export const WalletController = {
    // 1. Get current logged-in user's wallet, recent transactions, and tariff
    async getMyWallet(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { userId, role } = req.user as any;
            if (!userId) return res.status(401).json({ error: "User unauthorized" });

            const wallet = await WalletService.getOrCreateWallet(userId);
            const tariff = await WalletService.getTariff();

            // Return Paystack Public Key for frontend inline widget
            const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || '';

            res.json({
                wallet: {
                    id: wallet.id,
                    balance: wallet.balance,
                    currency: wallet.currency,
                    updatedAt: wallet.updatedAt
                },
                transactions: wallet.transactions,
                tariff,
                isCustomerCare: role === 'CUSTOMER_CARE',
                paystackPublicKey
            });
        } catch (error: any) {
            console.error("Get My Wallet Error:", error);
            res.status(500).json({ error: "Failed to retrieve wallet information" });
        }
    },

    // 2. Public / Authenticated read of current tariff
    async getTariff(req: Request, res: Response) {
        try {
            const tariff = await WalletService.getTariff();
            const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || '';
            res.json({ tariff, paystackPublicKey });
        } catch (error: any) {
            console.error("Get Tariff Error:", error);
            res.status(500).json({ error: "Failed to retrieve tariff rates" });
        }
    },

    // 3. Estimate cost for a prospective message / campaign
    async estimateCost(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { userId, role } = req.user as any;
            const { type, recipientCount, content } = req.body;

            if (!type || typeof recipientCount !== 'number') {
                return res.status(400).json({ error: "Invalid parameters for cost estimation" });
            }

            if (role === 'CUSTOMER_CARE') {
                return res.json({
                    isSponsored: true,
                    role: 'CUSTOMER_CARE',
                    unitRate: 0,
                    pages: 1,
                    recipientCount,
                    totalCost: 0,
                    hasSufficientBalance: true,
                    currentBalance: 999999,
                    message: "Customer Care outbound messaging is 100% company sponsored."
                });
            }

            const calculation = await WalletService.calculateCost(type, recipientCount, content || '');
            const wallet = await WalletService.getOrCreateWallet(userId);

            res.json({
                isSponsored: false,
                ...calculation,
                currentBalance: wallet.balance,
                hasSufficientBalance: wallet.balance >= calculation.totalCost,
                deficit: Math.max(0, Number((calculation.totalCost - wallet.balance).toFixed(2)))
            });
        } catch (error: any) {
            console.error("Estimate Cost Error:", error);
            res.status(500).json({ error: "Failed to estimate cost" });
        }
    },

    // 4. Verify Paystack top-up and credit wallet
    async verifyTopup(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { userId } = req.user as any;
            const { reference } = req.body;

            if (!reference) {
                return res.status(400).json({ error: "Payment reference is required" });
            }

            const result = await WalletService.verifyPaystackTopup(reference, userId);
            res.json({
                success: true,
                message: `Top-up successful! ₦${result.amount.toFixed(2)} has been credited to your wallet.`,
                ...result
            });
        } catch (error: any) {
            console.error("Verify Topup Error:", error);
            res.status(400).json({ error: error.message || "Failed to verify top-up payment" });
        }
    },

    // --- SUPER ADMIN SOLE ACCESS ENDPOINTS ---

    // 5. Super Admin Tariff & System Overview
    async getAdminTariff(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { role } = req.user as any;
            if (role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: "Access restricted strictly to Super Administrator" });
            }

            const tariff = await WalletService.getTariff();
            const totalWallets = await prisma.userWallet.count();
            const aggregate = await prisma.userWallet.aggregate({
                _sum: { balance: true }
            });

            const topupAgg = await prisma.walletTransaction.aggregate({
                where: { type: 'CREDIT', category: 'TOPUP' },
                _sum: { amount: true }
            });

            const spendAgg = await prisma.walletTransaction.aggregate({
                where: { type: 'DEBIT' },
                _sum: { amount: true }
            });

            res.json({
                tariff,
                stats: {
                    totalWallets,
                    totalSystemBalance: aggregate._sum.balance || 0,
                    totalRecharged: topupAgg._sum.amount || 0,
                    totalSpent: Math.abs(spendAgg._sum.amount || 0)
                }
            });
        } catch (error: any) {
            console.error("Get Admin Tariff Error:", error);
            res.status(500).json({ error: "Failed to fetch admin tariff data" });
        }
    },

    // 6. Super Admin Tariff Updates
    async updateAdminTariff(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { role } = req.user as any;
            if (role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: "Access restricted strictly to Super Administrator" });
            }

            const { smsRatePerPage, emailRatePerMsg, waRatePerMsg, minTopupAmount, defaultWelcomeCredit } = req.body;

            const existing = await WalletService.getTariff();
            const updated = await prisma.messagingTariff.update({
                where: { id: existing.id },
                data: {
                    smsRatePerPage: typeof smsRatePerPage === 'number' ? smsRatePerPage : existing.smsRatePerPage,
                    emailRatePerMsg: typeof emailRatePerMsg === 'number' ? emailRatePerMsg : existing.emailRatePerMsg,
                    waRatePerMsg: typeof waRatePerMsg === 'number' ? waRatePerMsg : existing.waRatePerMsg,
                    minTopupAmount: typeof minTopupAmount === 'number' ? minTopupAmount : existing.minTopupAmount,
                    defaultWelcomeCredit: typeof defaultWelcomeCredit === 'number' ? defaultWelcomeCredit : existing.defaultWelcomeCredit
                }
            });

            res.json({
                success: true,
                message: "Tariff configuration updated successfully",
                tariff: updated
            });
        } catch (error: any) {
            console.error("Update Admin Tariff Error:", error);
            res.status(500).json({ error: "Failed to update tariff configuration" });
        }
    },

    // 7. Super Admin Gift / Manual Credit to Staff Wallet
    async giftStaffBalance(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { role, userId: adminUserId } = req.user as any;
            if (role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: "Access restricted strictly to Super Administrator" });
            }

            const { targetUserId, amount, note } = req.body;

            if (!targetUserId || !amount || amount <= 0) {
                return res.status(400).json({ error: "Target staff user and valid positive amount required" });
            }

            const targetUser = await prisma.user.findUnique({
                where: { id: targetUserId }
            });

            if (!targetUser) {
                return res.status(404).json({ error: "Target staff user not found" });
            }

            const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
            const adminName = adminUser?.fullName || "Super Admin";

            const description = note && note.trim().length > 0 
                ? `Admin Balance Gift: ${note.trim()} (by ${adminName})`
                : `Admin Balance Gift (by ${adminName})`;

            const creditResult = await WalletService.creditWallet({
                userId: targetUserId,
                amount: Number(amount),
                category: 'ADMIN_GIFT',
                description,
                paymentMethod: 'ADMIN_GIFT'
            });

            res.json({
                success: true,
                message: `Successfully gifted ₦${Number(amount).toFixed(2)} to ${targetUser.fullName}. New balance: ₦${creditResult.balanceAfter.toFixed(2)}`,
                wallet: creditResult.wallet
            });
        } catch (error: any) {
            console.error("Gift Staff Balance Error:", error);
            res.status(500).json({ error: error.message || "Failed to gift balance" });
        }
    },

    // 8. Super Admin View All Staff Wallets
    async getAllStaffWallets(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { role } = req.user as any;
            if (role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: "Access restricted strictly to Super Administrator" });
            }

            const users = await prisma.user.findMany({
                where: {
                    isActive: true
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    role: true,
                    company: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true } },
                    wallet: {
                        select: {
                            id: true,
                            balance: true,
                            currency: true,
                            updatedAt: true
                        }
                    },
                    walletTransactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    }
                },
                orderBy: { fullName: 'asc' }
            });

            res.json(users);
        } catch (error: any) {
            console.error("Get All Staff Wallets Error:", error);
            res.status(500).json({ error: "Failed to fetch staff wallets" });
        }
    }
};
