import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';


export const RequisitionController = {
    // 1. Create a Requisition
    async createRequisition(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, companyId, branchId, role } = req.user!;
            
            // RBAC Enforcement
            if (role === 'MARKETER') {
                res.status(403).json({ error: "Marketers are not authorized to raise requisitions." });
                return;
            }

            const { title, description, category, items, receiptUrl, requestDate } = req.body;

            if (category === 'IMPREST' && role !== 'ACCOUNTANT' && role !== 'SUPER_ADMIN' && role !== 'GLOBAL_CHAIRMAN') {
                res.status(403).json({ error: "Only the Accountant or Executives can raise an IMPREST requisition." });
                return;
            }

            if (!companyId) {
                res.status(400).json({ error: "User must belong to a company to submit a requisition." });
                return;
            }
            if (!items || !Array.isArray(items) || items.length === 0) {
                res.status(400).json({ error: "Requisition must contain at least one line item." });
                return;
            }

            let status = 'PENDING_MD_APPROVAL';
            let approvedByUserId = null;
            let amountApproved = null;

            if (role === 'GLOBAL_CHAIRMAN') {
                status = 'DISBURSED';
                approvedByUserId = userId;
                amountApproved = items.reduce((sum: number, item: any) => sum + (parseInt(item.qty) * parseFloat(item.unitPrice)), 0);
            } else if (role === 'SUPER_ADMIN') {
                status = 'APPROVED_BY_MD';
                approvedByUserId = userId;
                amountApproved = items.reduce((sum: number, item: any) => sum + (parseInt(item.qty) * parseFloat(item.unitPrice)), 0);
            }

            const reqs = await prisma.requisition.create({
                data: {
                    title,
                    description,
                    category,
                    companyId,
                    branchId,
                    status,
                    approvedByUserId,
                    amountApproved,
                    requestedByUserId: userId,
                    requestDate: requestDate ? new Date(requestDate) : new Date(),
                    receiptUrl: receiptUrl || null,
                    items: {
                        create: items.map((item: any) => ({
                            itemRequired: item.itemRequired,
                            qty: parseInt(item.qty),
                            itemSpecification: item.itemSpecification || null,
                            purpose: item.purpose || null,
                            unitPrice: parseFloat(item.unitPrice),
                            totalPrice: parseInt(item.qty) * parseFloat(item.unitPrice)
                        }))
                    }
                },
                include: { items: true }
            });

            res.status(201).json({ message: "Requisition submitted successfully.", requisition: reqs });
        } catch (error) {
            console.error("Error creating requisition:", error);
            res.status(500).json({ error: "Failed to create requisition." });
        }
    },

    // 2. Fetch requisitions (Filtered by company)
    async getRequisitions(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { companyId, branchId, role, userId } = req.user!;
            
            // Allow Super Admin to view global, otherwise restrict to company
            const whereClause: any = {};
            if (role !== "SUPER_ADMIN" && companyId) {
                whereClause.companyId = companyId;
            }
            if (role === "ACCOUNTANT" && branchId) {
                whereClause.branchId = branchId;
            }

            // Normal users should only see their own requests
            if (role !== "SUPER_ADMIN" && role !== "MANAGING_DIRECTOR" && role !== "ACCOUNTANT" && role !== "BRANCH_HR") {
                whereClause.requestedByUserId = userId;
            }

            const reqs = await prisma.requisition.findMany({
                where: whereClause,
                include: {
                    requestedByUser: { select: { fullName: true, role: true } },
                    approvedByUser: { select: { fullName: true, role: true } },
                    disbursedByUser: { select: { fullName: true, role: true } },
                    branch: { select: { name: true } },
                    items: true
                },
                orderBy: { requestDate: 'desc' }
            });

            res.status(200).json(reqs);
        } catch (error) {
            console.error("Error fetching requisitions:", error);
            res.status(500).json({ error: "Failed to fetch requisitions." });
        }
    },

    // 3. MD Approves or Rejects Request
    async processApproval(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, role } = req.user!;
            if (role !== "MANAGING_DIRECTOR" && role !== "SUPER_ADMIN") {
                res.status(403).json({ error: "Only Managing Director can approve requisitions." });
                return;
            }

            const reqId = req.params.id as string;
            const { status, amountApproved, notes } = req.body;

            // Status must be "APPROVED_BY_MD" or "REJECTED"
            if (!["APPROVED_BY_MD", "REJECTED"].includes(status)) {
                res.status(400).json({ error: "Invalid status code." });
                return;
            }

            const updated = await prisma.requisition.update({
                where: { id: reqId },
                data: {
                    status,
                    amountApproved: amountApproved ? parseFloat(amountApproved) : null,
                    approvedByUserId: userId,
                    notes: notes || null
                }
            });

            res.status(200).json({ message: `Requisition ${status.toLowerCase()}`, requisition: updated });
        } catch (error) {
            console.error("Error processing approval:", error);
            res.status(500).json({ error: "Failed to process approval." });
        }
    },

    // 3.5 GM Recommends Request
    async recommendRequisition(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, role } = req.user!;
            if (role !== "GENERAL_MANAGER" && role !== "SUPER_ADMIN") {
                res.status(403).json({ error: "Only General Manager can provide recommendations." });
                return;
            }

            const reqId = req.params.id as string;
            const { gmRecommendation } = req.body;

            if (!["RECOMMENDED", "NOT_RECOMMENDED"].includes(gmRecommendation)) {
                res.status(400).json({ error: "Invalid recommendation." });
                return;
            }

            const updated = await prisma.requisition.update({
                where: { id: reqId },
                data: { gmRecommendation }
            });

            res.status(200).json({ message: `Requisition marked as ${gmRecommendation.toLowerCase()}`, requisition: updated });
        } catch (error) {
            console.error("Error setting recommendation:", error);
            res.status(500).json({ error: "Failed to process recommendation." });
        }
    },

    // 4. Accountant Disburses Funds
    async disburseFunds(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, role } = req.user!;
            if (role !== "ACCOUNTANT" && role !== "SUPER_ADMIN" && role !== "MANAGING_DIRECTOR" && role !== "GLOBAL_CHAIRMAN") {
                res.status(403).json({ error: "Insufficient permission to disburse funds." });
                return;
            }

            const reqId = req.params.id as string;
            const { receiptUrl } = req.body; // Upload final evidence of payment

            const requisition = await prisma.requisition.findUnique({ where: { id: reqId }});
            if (!requisition) {
                res.status(404).json({ error: "Not found." });
                return;
            }

            if (requisition.status !== "APPROVED_BY_MD") {
                res.status(400).json({ error: "Cannot disburse funds. This request must be approved by the MD first." });
                return;
            }

            const updated = await prisma.requisition.update({
                where: { id: reqId },
                data: {
                    status: "DISBURSED",
                    disbursedByUserId: userId,
                    disbursedAt: new Date(),
                    receiptUrl: receiptUrl || requisition.receiptUrl
                }
            });

            res.status(200).json({ message: "Funds disbursed successfully.", requisition: updated });
        } catch (error) {
            console.error("Error disbursing funds:", error);
            res.status(500).json({ error: "Failed to disburse funds." });
        }
    },

    // 5. Get Verified Payments awaiting Commission disbursement
    async getPendingCommissions(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { companyId, branchId, role } = req.user!;
            if (role !== "ACCOUNTANT" && role !== "SUPER_ADMIN" && role !== "MANAGING_DIRECTOR") {
                res.status(403).json({ error: "Forbidden." }); return;
            }

            const whereClause: any = { status: "APPROVED", isCommissionPaid: false };
            if (role !== "SUPER_ADMIN") {
                const saleFilter: any = { plot: { estate: { companyId } } };
                if (role === "ACCOUNTANT" && branchId) {
                    saleFilter.lead = { branchId };
                }
                whereClause.sale = saleFilter;
            }

            const payments = await prisma.payment.findMany({
                where: whereClause,
                include: {
                    sale: { include: { lead: { include: { assignedToUser: { select: { id: true, fullName: true, email: true, commissionRate: true } } } }, plot: { select: { plotNumber: true, estate: { select: { name: true } } } } } },
                },
                orderBy: { date: 'asc' }
            });

            res.status(200).json(payments);
        } catch (error) {
            console.error("Error finding commissions:", error);
            res.status(500).json({ error: "Failed to fetch pending commissions." });
        }
    },

    // 6. Accountant pays out Commission
    async payCommission(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { role } = req.user!;
            if (role !== "ACCOUNTANT" && role !== "SUPER_ADMIN" && role !== "MANAGING_DIRECTOR") {
                res.status(403).json({ error: "Forbidden." }); return;
            }

            const paymentId = req.params.paymentId as string;
            const updated = await prisma.payment.update({
                where: { id: paymentId },
                data: { isCommissionPaid: true, commissionDisbursedAt: new Date() }
            });

            res.status(200).json({ message: "Commission successfully marked as disbursed.", payment: updated });
        } catch (error) {
            console.error("Error paying commission:", error);
            res.status(500).json({ error: "Failed to log commission disbursement." });
        }
    }
};
