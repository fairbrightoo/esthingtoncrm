import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const RefundController = {

    async createRefundRequest(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { saleId, reason } = req.body;

            const sale = await prisma.sale.findUnique({
                where: { id: saleId },
                include: { lead: true }
            });

            if (!sale) {
                return res.status(404).json({ error: 'Sale not found' });
            }

            if (sale.totalPaid <= 0) {
                return res.status(400).json({ error: 'Cannot refund a sale with zero payments.' });
            }

            const totalPaidByClient = sale.totalPaid;
            const penaltyAmount = totalPaidByClient * 0.20;
            const refundAmount = totalPaidByClient * 0.80;

            const refundRequest = await prisma.refundRequest.create({
                data: {
                    saleId: sale.id,
                    clientId: sale.leadId,
                    marketerId: user.userId,
                    totalPaidByClient,
                    penaltyAmount,
                    refundAmount,
                    reason: reason,
                    companyId: user.companyId,
                    branchId: user.branchId, // Marketer's branch
                    status: 'PENDING_BRANCH_ADMIN'
                }
            });

            await prisma.sale.update({
                where: { id: sale.id },
                data: { status: 'REFUND_REQUESTED' }
            });

            await prisma.activity.create({
                data: {
                    leadId: sale.leadId,
                    type: 'REFUND_REQUESTED',
                    notes: `Refund requested for Sale. Reason: ${reason}`,
                    createdByUserId: user.userId
                }
            });

            res.status(201).json(refundRequest);
        } catch (error) {
            console.error('Create Refund Error:', error);
            res.status(500).json({ error: 'Failed to create refund request' });
        }
    },

    async getRefunds(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const whereClause: any = {};

            if (user.role !== 'SUPER_ADMIN') {
                whereClause.companyId = user.companyId;

                if (user.role === 'MARKETER') {
                    whereClause.marketerId = user.userId;
                } else if (user.role === 'BRANCH_ADMIN' || user.role === 'CUSTOMER_CARE') {
                    whereClause.branchId = user.branchId;
                }
            }

            const refunds = await prisma.refundRequest.findMany({
                where: whereClause,
                include: {
                    client: { select: { fullName: true, phone: true } },
                    marketer: { select: { fullName: true } },
                    sale: {
                        include: {
                            plot: { select: { plotNumber: true, prototype: true, estate: { select: { name: true } } } }
                        }
                    }
                },
                orderBy: { requestDate: 'desc' }
            });

            res.json(refunds);
        } catch (error) {
            console.error('Get Refunds Error:', error);
            res.status(500).json({ error: 'Failed to fetch refunds' });
        }
    },

    async updateRefundStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { action } = req.body; // 'ESCALATE', 'APPROVE', 'REJECT', 'DISBURSE'
            const user = (req as any).user;

            const refund = await prisma.refundRequest.findUnique({
                where: { id },
                include: { sale: true }
            });

            if (!refund) return res.status(404).json({ error: 'Refund not found' });

            let updatedStatus = refund.status;
            let transactionOps: any[] = [];

            if (action === 'ESCALATE' && user.role === 'BRANCH_ADMIN') {
                updatedStatus = 'PENDING_MD_APPROVAL';
                transactionOps.push(prisma.refundRequest.update({
                    where: { id },
                    data: { status: updatedStatus, branchAdminId: user.userId }
                }));
            } 
            else if (action === 'APPROVE' && (user.role === 'MANAGING_DIRECTOR' || user.role === 'SUPER_ADMIN')) {
                updatedStatus = 'APPROVED_BY_MD';
                
                transactionOps.push(prisma.refundRequest.update({
                    where: { id },
                    data: { status: updatedStatus, approvedByMdId: user.userId }
                }));

                // IMMEDIATELY return plot to the market and mark sale as processing refund
                transactionOps.push(prisma.plot.update({
                    where: { id: refund.sale.plotId },
                    data: { status: 'AVAILABLE' }
                }));

                transactionOps.push(prisma.sale.update({
                    where: { id: refund.saleId },
                    data: { status: 'REFUND_IN_PROGRESS' }
                }));

                transactionOps.push(prisma.activity.create({
                    data: {
                        leadId: refund.clientId,
                        type: 'REFUND_APPROVED',
                        notes: `MD approved refund of ₦${refund.refundAmount}. Plot is now available.`,
                        createdByUserId: user.userId
                    }
                }));
            }
            else if (action === 'REJECT') {
                updatedStatus = 'REJECTED';
                transactionOps.push(prisma.refundRequest.update({
                    where: { id },
                    data: { status: updatedStatus }
                }));
            }
            else if (action === 'DISBURSE' && user.role === 'ACCOUNTANT') {
                updatedStatus = 'DISBURSED';
                transactionOps.push(prisma.refundRequest.update({
                    where: { id },
                    data: { status: updatedStatus, disbursedByUserId: user.userId, disbursedAt: new Date() }
                }));

                // Mark the sale fully refunded
                transactionOps.push(prisma.sale.update({
                    where: { id: refund.saleId },
                    data: { status: 'REFUNDED' }
                }));

                transactionOps.push(prisma.activity.create({
                    data: {
                        leadId: refund.clientId,
                        type: 'REFUND_DISBURSED',
                        notes: `Accountant disbursed refund of ₦${refund.refundAmount} to client.`,
                        createdByUserId: user.userId
                    }
                }));
            } else {
                return res.status(403).json({ error: 'Invalid action or unauthorized role.' });
            }

            await prisma.$transaction(transactionOps);
            res.json({ message: 'Refund status updated', status: updatedStatus });

        } catch (error) {
            console.error('Update Refund Status Error:', error);
            res.status(500).json({ error: 'Failed to update refund status' });
        }
    }
};
