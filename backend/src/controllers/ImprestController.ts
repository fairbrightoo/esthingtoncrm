import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';

export const ImprestController = {

    /**
     * 1. CREATE IMPREST
     */
    async createImprest(req: AuthRequest, res: Response) {
        try {
            const { userId, role, companyId: callerCompanyId, branchId: callerBranchId } = req.user!;
            
            const allowedRoles = ['ACCOUNTANT', 'GLOBAL_ACCOUNTANT', 'MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR'];
            if (!allowedRoles.includes(role)) {
                res.status(403).json({ error: 'Unauthorized: Only Accountants and Authorized Management can create an Imprest record.' });
                return;
            }

            const {
                title,
                period,
                startDate,
                endDate,
                branchId: inputBranchId,
                companyId: inputCompanyId,
                openingBalance = 0,
                status = 'PENDING_APPROVAL',
                notes,
                items = []
            } = req.body;

            const finalBranchId = inputBranchId || callerBranchId;
            const finalCompanyId = inputCompanyId || callerCompanyId;

            if (!finalBranchId || !finalCompanyId) {
                res.status(400).json({ error: 'Branch and Company assignment required for Imprest.' });
                return;
            }

            if (!startDate || !endDate) {
                res.status(400).json({ error: 'Start Date and End Date are required.' });
                return;
            }

            // Verify branch exists
            const branch = await prisma.branch.findUnique({
                where: { id: finalBranchId },
                include: { company: true }
            });

            if (!branch) {
                res.status(404).json({ error: 'Branch not found.' });
                return;
            }

            // Generate unique reference number: IMP-YYYYMM-XXXX
            const now = new Date();
            const datePrefix = `IMP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
            const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            const referenceNumber = `${datePrefix}-${randomCode}`;

            const openBal = parseFloat(openingBalance) || 0;

            // Compute item mathematics & progressive running balance
            let currentBalance = openBal;
            let totalInflow = openBal;
            let totalOutflow = 0;

            const processedItems = items.map((item: any, index: number) => {
                const itemInflow = parseFloat(item.inflow) || 0;
                const qty = item.qty !== undefined && item.qty !== '' ? parseFloat(item.qty) : 1;
                const unitPrice = parseFloat(item.unitPrice) || 0;
                const outflow = item.outflow !== undefined && item.outflow !== '' ? parseFloat(item.outflow) : (qty * unitPrice);

                currentBalance = currentBalance + itemInflow - outflow;
                totalInflow += itemInflow;
                totalOutflow += outflow;

                return {
                    itemNumber: index + 1,
                    date: item.date ? new Date(item.date) : new Date(),
                    description: item.description || '',
                    expenseClass: item.expenseClass || 'GENERAL',
                    uom: item.uom || 'ACT',
                    qty,
                    unitPrice,
                    inflow: itemInflow,
                    outflow,
                    runningBalance: currentBalance,
                    receivedBy: item.receivedBy || '',
                    paymentStatus: item.paymentStatus || 'PAID',
                    receiptUrl: item.receiptUrl || null
                };
            });

            const closingBalance = totalInflow - totalOutflow;
            const reimbursementRequested = totalOutflow; // Reimbursement requested to restore float

            const imprest = await prisma.imprest.create({
                data: {
                    referenceNumber,
                    title: title || `Imprest Expense Reimbursement - ${period || 'Monthly'}`,
                    period: period || `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    companyId: finalCompanyId,
                    branchId: finalBranchId,
                    openingBalance: openBal,
                    totalInflow,
                    totalOutflow,
                    closingBalance,
                    reimbursementRequested,
                    status: status === 'DRAFT' ? 'DRAFT' : 'PENDING_APPROVAL',
                    preparedByUserId: userId,
                    submittedAt: status === 'DRAFT' ? null : new Date(),
                    notes: notes || null,
                    items: {
                        create: processedItems
                    }
                },
                include: {
                    items: { orderBy: { itemNumber: 'asc' } },
                    branch: { select: { id: true, name: true, address: true } },
                    company: { select: { id: true, name: true, logoUrl: true } },
                    preparedByUser: { select: { id: true, fullName: true, role: true, email: true } }
                }
            });

            res.status(201).json({
                message: 'Imprest record created successfully.',
                imprest
            });

        } catch (error: any) {
            console.error('Error creating imprest:', error);
            res.status(500).json({ error: error.message || 'Failed to create imprest record.' });
        }
    },

    /**
     * 2. GET IMPREST LIST
     */
    async getImprests(req: AuthRequest, res: Response) {
        try {
            const { userId, role, companyId: callerCompanyId, branchId: callerBranchId } = req.user!;
            const { branchId, companyId, status, year, month } = req.query;

            const allowedRoles = ['ACCOUNTANT', 'GLOBAL_ACCOUNTANT', 'MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR'];
            if (!allowedRoles.includes(role)) {
                res.status(403).json({ error: 'Unauthorized: Access restricted to Accountants and Executive Management.' });
                return;
            }

            const whereClause: any = {};

            // Scoping based on Role
            if (['GLOBAL_ACCOUNTANT', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR'].includes(role)) {
                // Group Executives & Global Accountant can see all branches or filter by branch/company
                if (branchId && branchId !== 'ALL') {
                    whereClause.branchId = branchId as string;
                }
                if (companyId && companyId !== 'ALL') {
                    whereClause.companyId = companyId as string;
                }
            } else if (role === 'MANAGING_DIRECTOR') {
                // Branch MD sees their branch
                whereClause.branchId = callerBranchId;
            } else if (role === 'ACCOUNTANT') {
                // Branch accountant sees their branch
                if (callerBranchId) {
                    whereClause.branchId = callerBranchId;
                } else if (callerCompanyId) {
                    whereClause.companyId = callerCompanyId;
                }
            }

            if (status && status !== 'ALL') {
                whereClause.status = status as string;
            }

            if (year) {
                const y = parseInt(year as string);
                whereClause.startDate = {
                    gte: new Date(y, 0, 1),
                    lte: new Date(y, 11, 31, 23, 59, 59)
                };
            }

            const imprests = await prisma.imprest.findMany({
                where: whereClause,
                include: {
                    branch: { select: { id: true, name: true, address: true } },
                    company: { select: { id: true, name: true, logoUrl: true } },
                    preparedByUser: { select: { id: true, fullName: true, role: true, email: true } },
                    approvedByUser: { select: { id: true, fullName: true, role: true } },
                    disbursedByUser: { select: { id: true, fullName: true, role: true } },
                    items: {
                        orderBy: { itemNumber: 'asc' }
                    }
                },
                orderBy: { startDate: 'desc' }
            });

            res.json(imprests);

        } catch (error: any) {
            console.error('Error fetching imprests:', error);
            res.status(500).json({ error: 'Failed to fetch imprest records.' });
        }
    },

    /**
     * 3. GET SINGLE IMPREST BY ID
     */
    async getImprestById(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { role, branchId: callerBranchId } = req.user!;

            const imprest = await prisma.imprest.findUnique({
                where: { id },
                include: {
                    items: { orderBy: { itemNumber: 'asc' } },
                    branch: { select: { id: true, name: true, address: true, managerName: true } },
                    company: { select: { id: true, name: true, logoUrl: true, address: true, email: true, phone: true } },
                    preparedByUser: { select: { id: true, fullName: true, role: true, email: true } },
                    approvedByUser: { select: { id: true, fullName: true, role: true } },
                    disbursedByUser: { select: { id: true, fullName: true, role: true } }
                }
            });

            if (!imprest) {
                res.status(404).json({ error: 'Imprest record not found.' });
                return;
            }

            // Access check: Branch Accountant or Branch MD can only view their branch
            if (['ACCOUNTANT', 'MANAGING_DIRECTOR'].includes(role) && callerBranchId && imprest.branchId !== callerBranchId) {
                res.status(403).json({ error: 'Unauthorized to view this branch imprest record.' });
                return;
            }

            res.json(imprest);

        } catch (error: any) {
            console.error('Error fetching imprest by id:', error);
            res.status(500).json({ error: 'Failed to retrieve imprest details.' });
        }
    },

    /**
     * 4. UPDATE IMPREST (Edit draft or revise items before final approval)
     */
    async updateImprest(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { userId, role } = req.user!;
            const {
                title,
                period,
                startDate,
                endDate,
                openingBalance,
                status,
                notes,
                items = []
            } = req.body;

            const existing = await prisma.imprest.findUnique({
                where: { id },
                include: { items: true }
            });

            if (!existing) {
                res.status(404).json({ error: 'Imprest record not found.' });
                return;
            }

            if (existing.status === 'DISBURSED') {
                res.status(400).json({ error: 'Cannot modify an already disbursed Imprest record.' });
                return;
            }

            const openBal = openingBalance !== undefined ? parseFloat(openingBalance) : existing.openingBalance;

            // Recalculate math
            let currentBalance = openBal;
            let totalInflow = openBal;
            let totalOutflow = 0;

            const processedItems = items.map((item: any, index: number) => {
                const itemInflow = parseFloat(item.inflow) || 0;
                const qty = item.qty !== undefined && item.qty !== '' ? parseFloat(item.qty) : 1;
                const unitPrice = parseFloat(item.unitPrice) || 0;
                const outflow = item.outflow !== undefined && item.outflow !== '' ? parseFloat(item.outflow) : (qty * unitPrice);

                currentBalance = currentBalance + itemInflow - outflow;
                totalInflow += itemInflow;
                totalOutflow += outflow;

                return {
                    itemNumber: index + 1,
                    date: item.date ? new Date(item.date) : new Date(),
                    description: item.description || '',
                    expenseClass: item.expenseClass || 'GENERAL',
                    uom: item.uom || 'ACT',
                    qty,
                    unitPrice,
                    inflow: itemInflow,
                    outflow,
                    runningBalance: currentBalance,
                    receivedBy: item.receivedBy || '',
                    paymentStatus: item.paymentStatus || 'PAID',
                    receiptUrl: item.receiptUrl || null
                };
            });

            const closingBalance = totalInflow - totalOutflow;
            const reimbursementRequested = totalOutflow;

            // Execute atomic replacement of items
            const updated = await prisma.$transaction(async (tx) => {
                // Delete existing items
                await tx.imprestItem.deleteMany({
                    where: { imprestId: id }
                });

                // Update imprest and recreate items
                return tx.imprest.update({
                    where: { id },
                    data: {
                        ...(title && { title }),
                        ...(period && { period }),
                        ...(startDate && { startDate: new Date(startDate) }),
                        ...(endDate && { endDate: new Date(endDate) }),
                        openingBalance: openBal,
                        totalInflow,
                        totalOutflow,
                        closingBalance,
                        reimbursementRequested,
                        ...(status && { status }),
                        ...(status === 'PENDING_APPROVAL' && !existing.submittedAt && { submittedAt: new Date() }),
                        notes: notes !== undefined ? notes : existing.notes,
                        items: {
                            create: processedItems
                        }
                    },
                    include: {
                        items: { orderBy: { itemNumber: 'asc' } },
                        branch: { select: { id: true, name: true } },
                        company: { select: { id: true, name: true, logoUrl: true } }
                    }
                });
            });

            res.json({
                message: 'Imprest updated successfully.',
                imprest: updated
            });

        } catch (error: any) {
            console.error('Error updating imprest:', error);
            res.status(500).json({ error: error.message || 'Failed to update imprest.' });
        }
    },

    /**
     * 5. APPROVE IMPREST (Dual Authority: Branch MD OR Global Accountant)
     */
    async approveImprest(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { userId, role, branchId: callerBranchId } = req.user!;
            const { remarks } = req.body;

            const allowedRoles = ['MANAGING_DIRECTOR', 'GLOBAL_ACCOUNTANT', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR'];
            if (!allowedRoles.includes(role)) {
                res.status(403).json({ error: 'Unauthorized: Only Branch Managing Director or Global Accountant can approve Imprest.' });
                return;
            }

            const imprest = await prisma.imprest.findUnique({
                where: { id },
                include: { branch: true }
            });

            if (!imprest) {
                res.status(404).json({ error: 'Imprest record not found.' });
                return;
            }

            // If Branch MD, ensure it matches their branch
            if (role === 'MANAGING_DIRECTOR' && callerBranchId && imprest.branchId !== callerBranchId) {
                res.status(403).json({ error: 'Unauthorized: Branch Managing Directors can only approve their own branch Imprest.' });
                return;
            }

            const updated = await prisma.imprest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approvedByUserId: userId,
                    approvedAt: new Date(),
                    approvalRole: role,
                    approvalRemarks: remarks || `Approved by ${role.replace('_', ' ')}`
                },
                include: {
                    items: { orderBy: { itemNumber: 'asc' } },
                    branch: { select: { id: true, name: true } },
                    approvedByUser: { select: { fullName: true, role: true } }
                }
            });

            res.json({
                message: `Imprest approved successfully by ${role.replace('_', ' ')}.`,
                imprest: updated
            });

        } catch (error: any) {
            console.error('Error approving imprest:', error);
            res.status(500).json({ error: 'Failed to approve imprest.' });
        }
    },

    /**
     * 6. DISBURSE IMPREST (Dual Authority: Global Accountant OR Branch MD)
     */
    async disburseImprest(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { userId, role, branchId: callerBranchId } = req.user!;
            const {
                disbursementSourceBank,
                disbursementReference,
                disbursementProofUrl,
                notes
            } = req.body;

            const allowedRoles = ['GLOBAL_ACCOUNTANT', 'MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR'];
            if (!allowedRoles.includes(role)) {
                res.status(403).json({ error: 'Unauthorized: Only Global Accountant or Managing Director can disburse Imprest funds.' });
                return;
            }

            const imprest = await prisma.imprest.findUnique({
                where: { id }
            });

            if (!imprest) {
                res.status(404).json({ error: 'Imprest record not found.' });
                return;
            }

            if (role === 'MANAGING_DIRECTOR' && callerBranchId && imprest.branchId !== callerBranchId) {
                res.status(403).json({ error: 'Managing Director can only disburse funds for their own branch.' });
                return;
            }

            const updated = await prisma.imprest.update({
                where: { id },
                data: {
                    status: 'DISBURSED',
                    disbursedByUserId: userId,
                    disbursedAt: new Date(),
                    disbursementSourceBank: disbursementSourceBank || null,
                    disbursementReference: disbursementReference || null,
                    disbursementProofUrl: disbursementProofUrl || null,
                    notes: notes || imprest.notes
                },
                include: {
                    items: { orderBy: { itemNumber: 'asc' } },
                    branch: { select: { id: true, name: true } },
                    disbursedByUser: { select: { fullName: true, role: true } }
                }
            });

            res.json({
                message: 'Imprest funds marked as disbursed successfully.',
                imprest: updated
            });

        } catch (error: any) {
            console.error('Error disbursing imprest:', error);
            res.status(500).json({ error: 'Failed to record imprest disbursement.' });
        }
    },

    /**
     * 7. REJECT IMPREST
     */
    async rejectImprest(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { userId, role } = req.user!;
            const { rejectionReason } = req.body;

            const allowedRoles = ['MANAGING_DIRECTOR', 'GLOBAL_ACCOUNTANT', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR'];
            if (!allowedRoles.includes(role)) {
                res.status(403).json({ error: 'Unauthorized to reject Imprest.' });
                return;
            }

            if (!rejectionReason || !rejectionReason.trim()) {
                res.status(400).json({ error: 'Rejection reason is required.' });
                return;
            }

            const updated = await prisma.imprest.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectionReason
                }
            });

            res.json({
                message: 'Imprest marked as rejected.',
                imprest: updated
            });

        } catch (error: any) {
            console.error('Error rejecting imprest:', error);
            res.status(500).json({ error: 'Failed to reject imprest.' });
        }
    },

    /**
     * 8. GET LAST MONTH'S CLOSING BALANCE (For Seamless Rollover to Next Month)
     */
    async getLastClosingBalance(req: AuthRequest, res: Response) {
        try {
            const queryBranchId = req.query.branchId ? String(req.query.branchId) : undefined;
            const callerBranchId = req.user?.branchId;
            const targetBranchId = queryBranchId || callerBranchId;

            if (!targetBranchId) {
                res.json({ lastClosingBalance: 0, lastPeriod: null, lastReference: null });
                return;
            }

            // Find the most recent approved or disbursed imprest for this branch
            const lastImprest = await prisma.imprest.findFirst({
                where: {
                    branchId: targetBranchId,
                    status: { in: ['DISBURSED', 'APPROVED', 'PENDING_APPROVAL'] }
                },
                orderBy: { endDate: 'desc' }
            });

            if (!lastImprest) {
                res.json({ lastClosingBalance: 0, lastPeriod: null, lastReference: null });
                return;
            }

            res.json({
                lastClosingBalance: lastImprest.closingBalance,
                lastPeriod: lastImprest.period,
                lastReference: lastImprest.referenceNumber
            });

        } catch (error: any) {
            console.error('Error getting last closing balance:', error);
            res.status(500).json({ error: 'Failed to fetch rollover balance.' });
        }
    },

    /**
     * 9. DELETE IMPREST (Drafts only)
     */
    async deleteImprest(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { userId, role } = req.user!;

            const imprest = await prisma.imprest.findUnique({ where: { id } });
            if (!imprest) {
                res.status(404).json({ error: 'Not found.' });
                return;
            }

            if (imprest.status !== 'DRAFT' && role !== 'SUPER_ADMIN') {
                res.status(400).json({ error: 'Only draft Imprest records can be deleted.' });
                return;
            }

            await prisma.imprest.delete({ where: { id } });
            res.json({ message: 'Imprest deleted successfully.' });

        } catch (error: any) {
            console.error('Error deleting imprest:', error);
            res.status(500).json({ error: 'Failed to delete imprest.' });
        }
    }
};
