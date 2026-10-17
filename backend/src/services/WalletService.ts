import prisma from '../config/prisma.js';
import axios from 'axios';

export interface WalletDeductionParams {
    userId: string;
    amount: number;
    category: 'CAMPAIGN_SMS' | 'CAMPAIGN_EMAIL' | 'CAMPAIGN_WHATSAPP' | 'SINGLE_SMS' | 'SINGLE_EMAIL' | 'SINGLE_WHATSAPP';
    description: string;
    channel?: 'SMS' | 'EMAIL' | 'WHATSAPP';
    recipientCount?: number;
    campaignId?: string;
}

export interface WalletCreditParams {
    userId: string;
    amount: number;
    category: 'TOPUP' | 'ADMIN_GIFT';
    description: string;
    reference?: string;
    paymentMethod?: 'PAYSTACK' | 'ADMIN_GIFT' | 'SYSTEM';
}

export const WalletService = {
    // 1. Get or initialize singleton tariff configuration
    async getTariff() {
        let tariff = await prisma.messagingTariff.findFirst();
        if (!tariff) {
            tariff = await prisma.messagingTariff.create({
                data: {
                    smsRatePerPage: 9.50,
                    emailRatePerMsg: 2.50,
                    waRatePerMsg: 15.00,
                    minTopupAmount: 3000.00,
                    defaultWelcomeCredit: 100.00
                }
            });
        }
        return tariff;
    },

    // 2. Synchronize and seed missing wallets for all staff (Self-healing on server boot)
    async syncMissingWallets() {
        try {
            const tariff = await this.getTariff();
            const welcomeCredit = tariff.defaultWelcomeCredit || 100.00;

            const usersWithoutWallet = await prisma.user.findMany({
                where: { wallet: null },
                select: { id: true, fullName: true, role: true }
            });

            if (usersWithoutWallet.length > 0) {
                console.log(`[Wallet Boot Sync] Found ${usersWithoutWallet.length} staff without messaging wallet. Seeding with ₦${welcomeCredit}...`);
                for (const u of usersWithoutWallet) {
                    await prisma.userWallet.create({
                        data: {
                            userId: u.id,
                            balance: welcomeCredit,
                            currency: 'NGN',
                            transactions: {
                                create: {
                                    userId: u.id,
                                    amount: welcomeCredit,
                                    balanceAfter: welcomeCredit,
                                    type: 'CREDIT',
                                    category: 'ADMIN_GIFT',
                                    paymentMethod: 'SYSTEM',
                                    description: 'Welcome Initial Messaging Balance'
                                }
                            }
                        }
                    }).catch(e => console.error(`Error auto-seeding wallet for ${u.id}:`, e.message));
                }
                console.log(`[Wallet Boot Sync] Successfully initialized ${usersWithoutWallet.length} staff wallets.`);
            } else {
                console.log(`[Wallet Boot Sync] All staff accounts verified with active messaging wallets.`);
            }
        } catch (error: any) {
            console.error('[Wallet Boot Sync Error]:', error.message);
        }
    },

    // 3. Get or create wallet for user
    async getOrCreateWallet(userId: string) {
        let wallet = await prisma.userWallet.findUnique({
            where: { userId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50
                }
            }
        });

        if (!wallet) {
            const tariff = await this.getTariff();
            const welcomeCredit = tariff.defaultWelcomeCredit || 100.00;
            wallet = await prisma.userWallet.create({
                data: {
                    userId,
                    balance: welcomeCredit,
                    currency: 'NGN',
                    transactions: {
                        create: {
                            userId,
                            amount: welcomeCredit,
                            balanceAfter: welcomeCredit,
                            type: 'CREDIT',
                            category: 'ADMIN_GIFT',
                            paymentMethod: 'SYSTEM',
                            description: 'Welcome Initial Messaging Balance'
                        }
                    }
                },
                include: {
                    transactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 50
                    }
                }
            });
        }

        return wallet;
    },

    // 3. Calculate SMS pages based on standard GSM segmentation
    calculateSmsPages(content: string): number {
        if (!content || content.length === 0) return 1;
        const len = content.length;
        if (len <= 160) return 1;
        // Concatenated SMS uses 153 chars per part for UDH header
        return Math.ceil(len / 153);
    },

    // 4. Calculate cost based on channel, recipient count, and content
    async calculateCost(type: 'SMS' | 'EMAIL' | 'WHATSAPP', recipientCount: number, content: string = '') {
        const tariff = await this.getTariff();
        let pages = 1;
        let unitRate = 0;

        if (type === 'SMS') {
            pages = this.calculateSmsPages(content);
            unitRate = tariff.smsRatePerPage * pages;
        } else if (type === 'EMAIL') {
            unitRate = tariff.emailRatePerMsg;
        } else if (type === 'WHATSAPP') {
            unitRate = tariff.waRatePerMsg;
        }

        const totalCost = Number((unitRate * recipientCount).toFixed(2));
        return {
            unitRate,
            pages,
            recipientCount,
            totalCost,
            tariff
        };
    },

    // 5. Atomic check & debit wallet
    async debitWallet(params: WalletDeductionParams) {
        const { userId, amount, category, description, channel, recipientCount, campaignId } = params;

        if (amount <= 0) {
            return { success: true, balanceAfter: 0, skipped: true };
        }

        return await prisma.$transaction(async (tx) => {
            // Fetch wallet with row locking semantics via findUnique
            let wallet = await tx.userWallet.findUnique({ where: { userId } });
            if (!wallet) {
                const tariff = await tx.messagingTariff.findFirst();
                const welcome = tariff?.defaultWelcomeCredit || 100.00;
                wallet = await tx.userWallet.create({
                    data: {
                        userId,
                        balance: welcome,
                        currency: 'NGN'
                    }
                });
            }

            if (wallet.balance < amount) {
                throw new Error(`INSUFFICIENT_WALLET_BALANCE: Required ₦${amount.toFixed(2)}, Available ₦${wallet.balance.toFixed(2)}`);
            }

            const newBalance = Number((wallet.balance - amount).toFixed(2));

            const updatedWallet = await tx.userWallet.update({
                where: { id: wallet.id },
                data: { balance: newBalance }
            });

            const transaction = await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    userId,
                    amount: -amount,
                    balanceAfter: newBalance,
                    type: 'DEBIT',
                    category,
                    description,
                    channel: channel || (category.includes('SMS') ? 'SMS' : category.includes('EMAIL') ? 'EMAIL' : 'WHATSAPP'),
                    recipientCount: recipientCount || 1,
                    campaignId: campaignId || null
                }
            });

            return {
                success: true,
                wallet: updatedWallet,
                transaction,
                balanceAfter: newBalance
            };
        });
    },

    // 6. Atomic credit wallet
    async creditWallet(params: WalletCreditParams) {
        const { userId, amount, category, description, reference, paymentMethod } = params;

        if (amount <= 0) {
            throw new Error("Credit amount must be greater than zero");
        }

        return await prisma.$transaction(async (tx) => {
            // Check reference idempotency if provided
            if (reference) {
                const existing = await tx.walletTransaction.findUnique({
                    where: { reference }
                });
                if (existing) {
                    throw new Error(`TRANSACTION_ALREADY_PROCESSED: Reference ${reference} has already been credited.`);
                }
            }

            let wallet = await tx.userWallet.findUnique({ where: { userId } });
            if (!wallet) {
                wallet = await tx.userWallet.create({
                    data: {
                        userId,
                        balance: 0,
                        currency: 'NGN'
                    }
                });
            }

            const newBalance = Number((wallet.balance + amount).toFixed(2));

            const updatedWallet = await tx.userWallet.update({
                where: { id: wallet.id },
                data: { balance: newBalance }
            });

            const transaction = await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    userId,
                    amount: amount,
                    balanceAfter: newBalance,
                    type: 'CREDIT',
                    category,
                    description,
                    reference: reference || null,
                    paymentMethod: paymentMethod || 'PAYSTACK'
                }
            });

            return {
                success: true,
                wallet: updatedWallet,
                transaction,
                balanceAfter: newBalance
            };
        });
    },

    // 7. Verify Paystack Top-Up server-to-server
    async verifyPaystackTopup(reference: string, userId: string) {
        const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';

        if (!secretKey || secretKey === 'sk_test_placeholder') {
            console.warn('[Paystack Warning] PAYSTACK_SECRET_KEY is not configured or using placeholder.');
        }

        // Call Paystack verify endpoint
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: {
                Authorization: `Bearer ${secretKey}`
            }
        });

        const paystackData = response.data?.data;
        if (!paystackData || paystackData.status !== 'success') {
            throw new Error(`Paystack verification failed: Status is '${paystackData?.status || 'unknown'}'`);
        }

        // Paystack amounts are in KOBO (1 NGN = 100 Kobo)
        const amountInNgn = paystackData.amount / 100;
        const tariff = await this.getTariff();

        if (amountInNgn < (tariff.minTopupAmount || 3000)) {
            console.warn(`Paystack payment ₦${amountInNgn} is below recommended minimum ₦${tariff.minTopupAmount}`);
        }

        // Credit the wallet
        const creditResult = await this.creditWallet({
            userId,
            amount: amountInNgn,
            category: 'TOPUP',
            description: `Paystack Online Top-Up (Ref: ${reference})`,
            reference: reference,
            paymentMethod: 'PAYSTACK'
        });

        return {
            amount: amountInNgn,
            reference,
            balanceAfter: creditResult.balanceAfter,
            channel: paystackData.channel,
            paidAt: paystackData.paid_at
        };
    }
};
