import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PaymentService } from '../services/PaymentService.js';

const prisma = new PrismaClient();

export class GlobalTreasuryController {
    
    // 1. Get Pending Approvals (Payments and Requisitions)
    static async getPendingApprovals(req: Request, res: Response) {
        try {
            const { companyId, branchId } = req.query;

            const paymentEstateFilter: any = {};
            if (companyId) paymentEstateFilter.companyId = companyId;
            if (branchId) paymentEstateFilter.managingBranchId = branchId;

            // Fetch Pending Customer Payments
            const payments = await prisma.payment.findMany({
                where: {
                    status: 'PENDING',
                    sale: {
                        plot: {
                            estate: {
                                ...paymentEstateFilter
                            }
                        }
                    }
                },
                include: {
                    sale: {
                        include: {
                            plot: {
                                include: { estate: { include: { company: true, branch: true } } }
                            },
                            lead: true,
                            marketer: true
                        }
                    },
                    recordedByUser: true
                },
                orderBy: { date: 'desc' }
            });

            // Fetch Pending Requisitions
            const requisitionsFilter: any = {};
            if (companyId) requisitionsFilter.companyId = companyId;
            if (branchId) requisitionsFilter.branchId = branchId;

            const requisitions = await prisma.requisition.findMany({
                where: {
                    status: 'PENDING_MD_APPROVAL',
                    ...requisitionsFilter
                },
                include: {
                    requestedByUser: true,
                    company: true,
                    branch: true,
                    items: true
                },
                orderBy: { requestDate: 'desc' }
            });

            res.json({ payments, requisitions });
        } catch (error) {
            console.error("GlobalTreasury getPendingApprovals Error:", error);
            res.status(500).json({ error: "Failed to fetch pending approvals" });
        }
    }

    // 2. Approve Customer Payment (Override)
    static async approvePaymentOverride(req: Request, res: Response) {
        try {
            const paymentId = req.params.paymentId as string;
            const user = (req as any).user;
            
            const overrideNote = `Approved by Global Chairman/Super Admin: ${user.name} (${user.role})`;

            const payment = await PaymentService.approvePayment(paymentId, user.id, overrideNote);
            res.json(payment);
        } catch (error) {
            console.error("GlobalTreasury approvePaymentOverride Error:", error);
            res.status(500).json({ error: "Failed to approve payment override" });
        }
    }

    // 3. Approve Requisition (Override)
    static async approveRequisitionOverride(req: Request, res: Response) {
        try {
            const requisitionId = req.params.requisitionId as string;
            const user = (req as any).user;

            const reqRecord: any = await prisma.requisition.findUnique({
                where: { id: requisitionId },
                include: { items: true }
            });

            if (!reqRecord) {
                return res.status(404).json({ error: "Requisition not found" });
            }

            const totalAmount = reqRecord.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

            const updated = await prisma.requisition.update({
                where: { id: requisitionId },
                data: {
                    status: 'APPROVED_BY_MD',
                    amountApproved: totalAmount,
                    approvedByUserId: user.id,
                    notes: `Override Approval by Global Chairman/Super Admin: ${user.name}`
                }
            });

            res.json(updated);
        } catch (error) {
            console.error("GlobalTreasury approveRequisitionOverride Error:", error);
            res.status(500).json({ error: "Failed to approve requisition override" });
        }
    }

    // 4. Get Pending Commissions
    static async getPendingCommissions(req: Request, res: Response) {
        try {
            const { companyId, branchId, startDate, endDate } = req.query;

            const estateFilter: any = {};
            if (companyId) estateFilter.companyId = companyId;
            if (branchId) estateFilter.managingBranchId = branchId;

            const dateFilter: any = {};
            if (startDate) dateFilter.gte = new Date(startDate as string);
            if (endDate) dateFilter.lte = new Date(endDate as string);

            const payments = await prisma.payment.findMany({
                where: {
                    status: 'APPROVED',
                    OR: [
                        { isCommissionPaid: false },
                        { isReferralCommissionPaid: false }
                    ],
                    ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
                    sale: {
                        plot: {
                            estate: {
                                ...estateFilter
                            }
                        }
                    }
                },
                include: {
                    sale: {
                        include: {
                            marketer: true,
                            referrer: true,
                            plot: {
                                include: { estate: { include: { company: true, branch: true } } }
                            }
                        }
                    }
                },
                orderBy: { date: 'desc' }
            });

            // Flatten into distinct payout lines
            const payouts: any[] = [];

            for (const p of payments) {
                const sale = p.sale;
                const estate = sale.plot.estate;

                // Marketer Payout
                if (!p.isCommissionPaid && sale.marketerId && sale.marketer) {
                    const commissionRate = sale.marketerCommissionRate || sale.marketer.commissionRate || 5.0;
                    const commissionAmount = (p.amount * commissionRate) / 100;
                    payouts.push({
                        type: 'MARKETER',
                        paymentId: p.id,
                        userId: sale.marketer.id,
                        name: sale.marketer.fullName,
                        email: sale.marketer.email,
                        bankName: sale.marketer.bankName,
                        accountName: sale.marketer.accountName,
                        accountNumber: sale.marketer.accountNumber,
                        companyName: estate.company.name,
                        branchName: estate.branch?.name || 'HQ',
                        plotNumber: sale.plotNumber || sale.plot.plotNumber,
                        date: p.date,
                        rate: commissionRate,
                        amountPaid: p.amount,
                        commissionAmount: commissionAmount
                    });
                }

                // Referrer Payout
                if (!p.isReferralCommissionPaid && sale.referrerId && sale.referrer) {
                    const refCommissionRate = sale.referrerCommissionRate || 2.0; // Default fallback
                    const refCommissionAmount = (p.amount * refCommissionRate) / 100;
                    payouts.push({
                        type: 'REFERRER',
                        paymentId: p.id,
                        userId: sale.referrer.id,
                        name: sale.referrer.fullName,
                        email: sale.referrer.email,
                        bankName: sale.referrer.bankName,
                        accountName: sale.referrer.accountName,
                        accountNumber: sale.referrer.accountNumber,
                        companyName: estate.company.name,
                        branchName: estate.branch?.name || 'HQ',
                        plotNumber: sale.plotNumber || sale.plot.plotNumber,
                        date: p.date,
                        rate: refCommissionRate,
                        amountPaid: p.amount,
                        commissionAmount: refCommissionAmount
                    });
                }
            }

            res.json(payouts);
        } catch (error) {
            console.error("GlobalTreasury getPendingCommissions Error:", error);
            res.status(500).json({ error: "Failed to fetch pending commissions" });
        }
    }

    // 5. Bulk Mark Commissions as Paid
    static async markCommissionsPaid(req: Request, res: Response) {
        try {
            const { payouts } = req.body; // Array of { paymentId, type: 'MARKETER' | 'REFERRER' }
            const user = (req as any).user;

            let updatedCount = 0;

            for (const payout of payouts) {
                if (payout.type === 'MARKETER') {
                    await prisma.payment.update({
                        where: { id: payout.paymentId },
                        data: {
                            isCommissionPaid: true,
                            commissionDisbursedAt: new Date()
                        }
                    });
                    updatedCount++;
                } else if (payout.type === 'REFERRER') {
                    await prisma.payment.update({
                        where: { id: payout.paymentId },
                        data: {
                            isReferralCommissionPaid: true,
                            referralCommissionDisbursedAt: new Date()
                        }
                    });
                    updatedCount++;
                }
            }

            res.json({ message: `Successfully marked ${updatedCount} commissions as paid.`, updatedCount });
        } catch (error) {
            console.error("GlobalTreasury markCommissionsPaid Error:", error);
            res.status(500).json({ error: "Failed to mark commissions as paid" });
        }
    }
}
