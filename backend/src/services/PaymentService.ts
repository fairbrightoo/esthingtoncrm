import { PrismaClient } from '@prisma/client';
import { DocumentAutomationService } from './DocumentAutomationService.js';

const prisma = new PrismaClient();

export class PaymentService {
    /**
     * Approves a payment, updates the sale total, converts leads to clients, 
     * dispenses EsthCoins, and dispatches documents.
     */
    static async approvePayment(paymentId: string, approvedByUserId?: string, overrideNote?: string) {
        // 1. Update the payment status to APPROVED
        const payment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'APPROVED',
                ...(approvedByUserId && { approvedByUserId }),
                ...(overrideNote && { approvalNote: overrideNote })
            }
        });

        // 2. Fetch the sale to update totals
        const sale = await prisma.sale.findUnique({
            where: { id: payment.saleId },
            include: { lead: true }
        });

        if (sale) {
            const newTotal = sale.totalPaid + payment.amount + (payment.virtualLoanAmount || 0);
            const isCompleted = newTotal >= sale.agreedPrice;

            await prisma.sale.update({
                where: { id: sale.id },
                data: {
                    totalPaid: newTotal,
                    status: isCompleted ? 'COMPLETED' : 'ONGOING',
                    updatedAt: new Date()
                }
            });

            // If full payment is achieved, update Plot status to SOLD
            if (isCompleted) {
                await prisma.plot.update({
                    where: { id: sale.plotId },
                    data: { status: 'SOLD' }
                });
            }

            // AUTO-CONVERT Lead to CLIENT if not already
            if (sale.lead.status === 'PROSPECT') {
                await prisma.lead.update({
                    where: { id: sale.leadId },
                    data: { status: 'CLIENT' }
                });
            }

            // Fire off background task to email Receipt & Allocation Letters
            try {
                await DocumentAutomationService.dispatchDocuments(sale.id, 'PAYMENT', payment.id);
            } catch (docError: any) {
                console.error(`Payment approved, but failed to generate/email documents. Reason: ${docError.message}`);
                // We intentionally do not throw here to prevent rolling back the payment approval just because email failed.
            }

            // --- EsthCoin Earning Logic ---
            if (sale.marketerId) {
                const esthCoinYield = payment.amount / 20_000_000;
                if (esthCoinYield > 0) {
                    await prisma.esthCoinLedger.create({
                        data: {
                            userId: sale.marketerId,
                            amount: esthCoinYield,
                            transactionType: 'SALES_COMMISSION',
                            referenceId: payment.id,
                            description: `Earned from approved payment of ₦${payment.amount.toLocaleString()}`
                        }
                    });
                    await prisma.user.update({
                        where: { id: sale.marketerId },
                        data: { esthCoinBalance: { increment: esthCoinYield } }
                    });
                }
            }
        }

        return payment;
    }

    /**
     * Rejects a payment.
     */
    static async rejectPayment(paymentId: string, rejectionReason: string) {
        return await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'REJECTED',
                rejectionReason
            }
        });
    }
}
