import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';


export const DiscountController = {
    // 1. Generate new Discount Code (MDs / Branch Admins)
    generateDiscount: async (req: Request, res: Response) => {
        try {
            const { companyId, branchId, userId, role } = (req as AuthRequest).user || {};
            const { type, value, targetBranchId, maxUses, expiresAt } = req.body;

            if (!companyId) return res.status(401).json({ error: "Unauthorized" });

            // Validate that we are MD or Super Admin or Branch Admin
            if (!['SUPER_ADMIN', 'MANAGING_DIRECTOR', 'BRANCH_ADMIN'].includes(role || '')) {
                return res.status(403).json({ error: "Insufficient privileges to issue discount codes." });
            }

            if (!type || !['FLAT', 'PERCENTAGE'].includes(type) || !value) {
                return res.status(400).json({ error: "Invalid discount type or value." });
            }

            // Generate an alphanumeric unique string like ESTH-8X9P
            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            const prefix = "DSC";
            const codeString = `${prefix}-${randomStr}`;

            const finalBranchId = role === 'SUPER_ADMIN' ? targetBranchId : branchId;
            if (!finalBranchId) return res.status(400).json({ error: "Branch ID required to link discount." });

            const newCode = await prisma.discountCode.create({
                data: {
                    code: codeString,
                    type,
                    value: parseFloat(value),
                    isActive: true,
                    maxUses: maxUses ? parseInt(maxUses) : null,
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                    companyId: companyId,
                    branchId: finalBranchId,
                    createdByUserId: userId as string
                }
            });

            res.status(201).json(newCode);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to generate discount code." });
        }
    },

    // 2. Fetch all discounts for the company/branch
    getBranchDiscounts: async (req: Request, res: Response) => {
        try {
            const { companyId, branchId, role } = (req as AuthRequest).user || {};

            let whereClause: any = { companyId };
            if (role !== 'SUPER_ADMIN' && role !== 'MANAGING_DIRECTOR') {
                whereClause.branchId = branchId;
            }

            const activeCodes = await prisma.discountCode.findMany({
                where: whereClause,
                include: {
                    createdByUser: { select: { fullName: true, role: true } },
                    branch: { select: { name: true } },
                    _count: { select: { sales: true } } // Count how many times it was used
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(activeCodes);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to fetch discounts" });
        }
    },

    // 3. Toggle isActive status (Kill switch)
    toggleDiscountStatus: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const { companyId, role } = (req as AuthRequest).user || {};

            const existing = await prisma.discountCode.findUnique({ where: { id } });
            if (!existing) return res.status(404).json({ error: "Not found" });

            if (role !== 'SUPER_ADMIN' && existing.companyId !== companyId) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            const updated = await prisma.discountCode.update({
                where: { id },
                data: { isActive: !existing.isActive }
            });

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to toggle discount" });
        }
    }
};
