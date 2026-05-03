import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';


export const BudgetController = {
    // 1. Create a Branch Budget (Accountant only)
    async createBudget(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, role, companyId, branchId } = req.user!;
            
            if (role !== 'ACCOUNTANT' && role !== 'SUPER_ADMIN') {
                res.status(403).json({ error: "Only the Accountant can prepare budgets." });
                return;
            }

            if (!companyId || !branchId) {
                res.status(400).json({ error: "Missing company or branch association." });
                return;
            }

            const { title, periodType, periodStartDate, periodEndDate, items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                res.status(400).json({ error: "Budget must contain at least one category allocation." });
                return;
            }

            const budget = await prisma.branchBudget.create({
                data: {
                    title,
                    periodType,
                    periodStartDate: new Date(periodStartDate),
                    periodEndDate: new Date(periodEndDate),
                    companyId,
                    branchId,
                    preparedByUserId: userId,
                    items: {
                        create: items.map((i: any) => ({
                            category: i.category,
                            amountAllocated: parseFloat(i.amountAllocated),
                            notes: i.notes || null
                        }))
                    }
                },
                include: { items: true }
            });

            res.status(201).json({ message: "Budget prepared successfully.", budget });
        } catch (error) {
            console.error("Error creating budget:", error);
            res.status(500).json({ error: "Failed to prepare budget." });
        }
    },

    // 2. Fetch Budgets
    async getBudgets(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { companyId, branchId, role } = req.user!;
            
            const whereClause: any = {};
            if (role !== "SUPER_ADMIN" && companyId) {
                whereClause.companyId = companyId;
            }
            if ((role === "ACCOUNTANT" || role === "HR_MANAGER") && branchId) {
                whereClause.branchId = branchId;
            }

            const budgets = await prisma.branchBudget.findMany({
                where: whereClause,
                include: {
                    preparedByUser: { select: { fullName: true, role: true } },
                    approvedByUser: { select: { fullName: true, role: true } },
                    items: true,
                    branch: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.status(200).json(budgets);
        } catch (error) {
            console.error("Error fetching budgets:", error);
            res.status(500).json({ error: "Failed to fetch budgets." });
        }
    },

    // 3. MD Approve / Reject
    async processApproval(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId, role } = req.user!;
            if (role !== "MANAGING_DIRECTOR" && role !== "SUPER_ADMIN") {
                res.status(403).json({ error: "Only Managing Director can approve budgets." });
                return;
            }

            const budgetId = req.params.id as string;
            const { status } = req.body;

            if (!["APPROVED", "REJECTED"].includes(status)) {
                res.status(400).json({ error: "Invalid status code." });
                return;
            }

            const updated = await prisma.branchBudget.update({
                where: { id: budgetId },
                data: {
                    status,
                    approvedByUserId: userId
                }
            });

            res.status(200).json({ message: `Budget ${status.toLowerCase()}`, budget: updated });
        } catch (error) {
            console.error("Error processing approval:", error);
            res.status(500).json({ error: "Failed to process approval." });
        }
    }
};
