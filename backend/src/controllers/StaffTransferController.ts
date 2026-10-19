import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const StaffTransferController = {

    /**
     * 1. INITIATE TRANSFER (HR Role / MD)
     */
    async initiateTransfer(req: Request, res: Response) {
        const { userId: initiatorId, role: initiatorRole, companyId: callerCompanyId, branchId: callerBranchId } = (req as any).user;
        const {
            userId,
            toBranchId,
            toCompanyId,
            newRole,
            newSalary,
            newCommission,
            reason,
            justification,
            effectiveDate,
            leadStrategy = 'MIGRATE_WITH_STAFF',
            reassignedToUserId,
            handoverNotes,
            assetsClearance = false,
            filesHandedOver = false
        } = req.body;

        const allowedRoles = ['BRANCH_HR', 'HR_MANAGER', 'MANAGING_DIRECTOR', 'GROUP_MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN'];
        if (!allowedRoles.includes(initiatorRole)) {
            return res.status(403).json({ error: 'Unauthorized: Only HR and Executive Management can initiate staff transfers.' });
        }

        if (!userId || !toBranchId || !effectiveDate || !reason) {
            return res.status(400).json({ error: 'Missing required transfer fields (Staff, Destination Branch, Effective Date, Reason).' });
        }

        try {
            // Fetch staff being transferred
            const staff = await prisma.user.findUnique({
                where: { id: userId },
                include: { branch: true, company: true }
            });

            if (!staff || !staff.isActive) {
                return res.status(404).json({ error: 'Staff member not found or is currently inactive.' });
            }

            if (!staff.branchId || !staff.companyId) {
                return res.status(400).json({ error: 'Staff member does not have an active branch/company assignment.' });
            }

            // Fetch destination branch
            const destBranch = await prisma.branch.findUnique({
                where: { id: toBranchId },
                include: { company: true }
            });

            if (!destBranch) {
                return res.status(404).json({ error: 'Destination branch not found.' });
            }

            // Validation: Cannot transfer to the exact same branch with the exact same role
            const finalRole = newRole || staff.role;
            if (staff.branchId === toBranchId && staff.role === finalRole) {
                return res.status(400).json({ error: 'Cannot transfer staff to the same branch with the identical role.' });
            }

            // Check if there is already an active pending transfer for this staff
            const existingPending = await prisma.staffTransfer.findFirst({
                where: {
                    userId,
                    status: { in: ['PENDING_RELEASING_MD', 'PENDING_RECEIVING_MD', 'APPROVED_SCHEDULED'] }
                }
            });

            if (existingPending) {
                return res.status(400).json({ error: `Staff already has an active transfer in progress (${existingPending.referenceNumber}).` });
            }

            // Generate unique reference number: TRF-YYYYMM-XXXX
            const now = new Date();
            const datePrefix = `TRF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
            const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            const referenceNumber = `${datePrefix}-${randomCode}`;

            const finalToCompanyId = toCompanyId || destBranch.companyId;

            // Determine initial workflow status:
            // If the initiator is already the Releasing MD, origin signoff is pre-approved!
            const isReleasingMD = (initiatorRole === 'MANAGING_DIRECTOR' && callerBranchId === staff.branchId) ||
                                  ['GROUP_MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN'].includes(initiatorRole);

            const initialStatus = isReleasingMD ? 'PENDING_RECEIVING_MD' : 'PENDING_RELEASING_MD';

            const transfer = await prisma.staffTransfer.create({
                data: {
                    referenceNumber,
                    userId,
                    fromCompanyId: staff.companyId,
                    fromBranchId: staff.branchId,
                    previousRole: staff.role,
                    previousSalary: staff.monthlySalary,
                    previousCommission: staff.commissionRate,
                    toCompanyId: finalToCompanyId,
                    toBranchId,
                    newRole: finalRole,
                    newSalary: newSalary !== undefined && newSalary !== '' ? parseFloat(newSalary) : staff.monthlySalary,
                    newCommission: newCommission !== undefined && newCommission !== '' ? parseFloat(newCommission) : staff.commissionRate,
                    reason,
                    justification,
                    effectiveDate: new Date(effectiveDate),
                    leadStrategy,
                    reassignedToUserId: reassignedToUserId || null,
                    handoverNotes,
                    assetsClearance: Boolean(assetsClearance),
                    filesHandedOver: Boolean(filesHandedOver),
                    status: initialStatus,
                    initiatedByUserId: initiatorId,
                    releasingMdApprovedByUserId: isReleasingMD ? initiatorId : null,
                    releasingMdApprovedAt: isReleasingMD ? new Date() : null,
                    releasingMdRemarks: isReleasingMD ? 'Initiated and approved by Releasing MD' : null
                },
                include: {
                    user: { select: { fullName: true, role: true, email: true, phone: true } },
                    fromBranch: { select: { name: true } },
                    toBranch: { select: { name: true } },
                    fromCompany: { select: { name: true } },
                    toCompany: { select: { name: true } },
                    initiatedByUser: { select: { fullName: true, role: true } }
                }
            });

            res.status(201).json({
                message: 'Staff transfer request initiated successfully.',
                transfer
            });

        } catch (error: any) {
            console.error('Error initiating staff transfer:', error);
            res.status(500).json({ error: error.message || 'Failed to initiate staff transfer.' });
        }
    },

    /**
     * 2. GET TRANSFERS LIST
     */
    async getTransfers(req: Request, res: Response) {
        const { userId, role, companyId, branchId } = (req as any).user;
        const { status, type } = req.query; // type: 'outbound' | 'inbound' | 'all'

        try {
            const whereClause: any = {};

            // Scoping based on Role
            if (['GROUP_MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN'].includes(role)) {
                // Group Executives see all transfers within company or group
                if (companyId) whereClause.fromCompanyId = companyId;
            } else if (role === 'MANAGING_DIRECTOR') {
                // Branch MD sees transfers where their branch is either releasing (outbound) or receiving (inbound)
                if (type === 'outbound') {
                    whereClause.fromBranchId = branchId;
                } else if (type === 'inbound') {
                    whereClause.toBranchId = branchId;
                } else {
                    whereClause.OR = [
                        { fromBranchId: branchId },
                        { toBranchId: branchId }
                    ];
                }
            } else if (['BRANCH_HR', 'BRANCH_ADMIN'].includes(role)) {
                // Branch HR sees transfers involving their branch
                whereClause.OR = [
                    { fromBranchId: branchId },
                    { toBranchId: branchId }
                ];
            } else {
                // Regular staff can only view their own transfer records
                whereClause.userId = userId;
            }

            // Filter by Status if provided
            if (status && status !== 'ALL') {
                whereClause.status = String(status);
            }

            const transfers = await prisma.staffTransfer.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            role: true,
                            email: true,
                            phone: true,
                            employeeId: true,
                            passportUrl: true
                        }
                    },
                    fromBranch: { select: { id: true, name: true, address: true, managerName: true } },
                    toBranch: { select: { id: true, name: true, address: true, managerName: true } },
                    fromCompany: { select: { id: true, name: true, logoUrl: true } },
                    toCompany: { select: { id: true, name: true, logoUrl: true } },
                    initiatedByUser: { select: { fullName: true, role: true } },
                    releasingMdApprovedByUser: { select: { fullName: true, role: true } },
                    receivingMdApprovedByUser: { select: { fullName: true, role: true } },
                    reassignedToUser: { select: { fullName: true, role: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(transfers);
        } catch (error: any) {
            console.error('Error fetching staff transfers:', error);
            res.status(500).json({ error: 'Failed to fetch staff transfers.' });
        }
    },

    /**
     * 3. RELEASING BRANCH MD SIGN-OFF (Approve Release or Reject)
     */
    async releasingMdSignoff(req: Request, res: Response) {
        const { userId: mdUserId, role: mdRole, branchId: mdBranchId } = (req as any).user;
        const { transferId } = req.params;
        const { action, remarks, rejectionReason } = req.body; // action: 'APPROVE' | 'REJECT'

        const allowedRoles = ['MANAGING_DIRECTOR', 'GROUP_MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN'];
        if (!allowedRoles.includes(mdRole)) {
            return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can sign off on staff release.' });
        }

        if (!['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({ error: 'Action must be APPROVE or REJECT.' });
        }

        try {
            const transfer = await prisma.staffTransfer.findUnique({
                where: { id: String(transferId) },
                include: { fromBranch: true, toBranch: true, user: true }
            });

            if (!transfer) {
                return res.status(404).json({ error: 'Transfer record not found.' });
            }

            if (transfer.status !== 'PENDING_RELEASING_MD') {
                return res.status(400).json({ error: `Cannot sign off on release. Transfer is in status: ${transfer.status}` });
            }

            // Branch validation for MD (unless GMD / SuperAdmin)
            if (mdRole === 'MANAGING_DIRECTOR' && transfer.fromBranchId !== mdBranchId) {
                return res.status(403).json({ error: 'You can only sign off on staff transfers originating from your branch.' });
            }

            if (action === 'REJECT') {
                if (!rejectionReason) {
                    return res.status(400).json({ error: 'Rejection reason is required.' });
                }

                const updated = await prisma.staffTransfer.update({
                    where: { id: String(transferId) },
                    data: {
                        status: 'REJECTED_BY_RELEASING_MD',
                        releasingMdRejectionReason: rejectionReason,
                        releasingMdApprovedByUserId: mdUserId,
                        releasingMdApprovedAt: new Date()
                    }
                });

                return res.json({ message: 'Transfer rejected by Releasing Managing Director.', transfer: updated });
            }

            // APPROVE Release: Advance to PENDING_RECEIVING_MD
            const updated = await prisma.staffTransfer.update({
                where: { id: String(transferId) },
                data: {
                    status: 'PENDING_RECEIVING_MD',
                    releasingMdApprovedByUserId: mdUserId,
                    releasingMdApprovedAt: new Date(),
                    releasingMdRemarks: remarks || 'Staff release approved.'
                }
            });

            res.json({ message: 'Staff release approved. Sent to Destination Branch MD for acceptance.', transfer: updated });

        } catch (error: any) {
            console.error('Error signing off on staff release:', error);
            res.status(500).json({ error: error.message || 'Failed to sign off on staff release.' });
        }
    },

    /**
     * 4. RECEIVING BRANCH MD SIGN-OFF (Accept Intake or Decline)
     */
    async receivingMdSignoff(req: Request, res: Response) {
        const { userId: mdUserId, role: mdRole, branchId: mdBranchId } = (req as any).user;
        const { transferId } = req.params;
        const { action, remarks, declineReason } = req.body; // action: 'ACCEPT' | 'DECLINE'

        const allowedRoles = ['MANAGING_DIRECTOR', 'GROUP_MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN'];
        if (!allowedRoles.includes(mdRole)) {
            return res.status(403).json({ error: 'Unauthorized: Only the Destination Managing Director can accept incoming staff.' });
        }

        if (!['ACCEPT', 'DECLINE'].includes(action)) {
            return res.status(400).json({ error: 'Action must be ACCEPT or DECLINE.' });
        }

        try {
            const transfer = await prisma.staffTransfer.findUnique({
                where: { id: String(transferId) },
                include: { fromBranch: true, toBranch: true, user: true }
            });

            if (!transfer) {
                return res.status(404).json({ error: 'Transfer record not found.' });
            }

            if (transfer.status !== 'PENDING_RECEIVING_MD') {
                return res.status(400).json({ error: `Cannot sign off on intake. Transfer is in status: ${transfer.status}` });
            }

            // Branch validation for MD (unless GMD / SuperAdmin)
            if (mdRole === 'MANAGING_DIRECTOR' && transfer.toBranchId !== mdBranchId) {
                return res.status(403).json({ error: 'You can only sign off on staff transfers incoming to your branch.' });
            }

            if (action === 'DECLINE') {
                if (!declineReason) {
                    return res.status(400).json({ error: 'Decline reason is required.' });
                }

                const updated = await prisma.staffTransfer.update({
                    where: { id: String(transferId) },
                    data: {
                        status: 'DECLINED_BY_RECEIVING_MD',
                        receivingMdDeclineReason: declineReason,
                        receivingMdApprovedByUserId: mdUserId,
                        receivingMdApprovedAt: new Date()
                    }
                });

                return res.json({ message: 'Incoming transfer declined by Destination Managing Director.', transfer: updated });
            }

            // ACCEPT Intake: Check Effective Date
            const isEffectiveNow = new Date(transfer.effectiveDate) <= new Date();

            if (isEffectiveNow) {
                // Execute immediately!
                const executedTransfer = await executeTransfer(transfer.id, {
                    receivingMdApprovedByUserId: mdUserId,
                    receivingMdRemarks: remarks || 'Staff intake accepted by Destination MD.'
                });

                return res.json({
                    message: `Staff transfer completed! ${transfer.user.fullName} is now active at ${transfer.toBranch.name}.`,
                    transfer: executedTransfer
                });
            } else {
                // Schedule for future date
                const updated = await prisma.staffTransfer.update({
                    where: { id: String(transferId) },
                    data: {
                        status: 'APPROVED_SCHEDULED',
                        receivingMdApprovedByUserId: mdUserId,
                        receivingMdApprovedAt: new Date(),
                        receivingMdRemarks: remarks || 'Staff intake accepted; scheduled for effective date.'
                    }
                });

                return res.json({
                    message: `Transfer accepted and scheduled for effective date: ${new Date(transfer.effectiveDate).toLocaleDateString()}.`,
                    transfer: updated
                });
            }

        } catch (error: any) {
            console.error('Error signing off on staff intake:', error);
            res.status(500).json({ error: error.message || 'Failed to process staff intake.' });
        }
    },

    /**
     * 5. CANCEL TRANSFER (HR or Origin MD prior to execution)
     */
    async cancelTransfer(req: Request, res: Response) {
        const { userId, role, branchId } = (req as any).user;
        const { transferId } = req.params;

        try {
            const transfer = await prisma.staffTransfer.findUnique({
                where: { id: String(transferId) }
            });

            if (!transfer) return res.status(404).json({ error: 'Transfer not found.' });

            if (['COMPLETED', 'REJECTED_BY_RELEASING_MD', 'DECLINED_BY_RECEIVING_MD'].includes(transfer.status)) {
                return res.status(400).json({ error: `Cannot cancel transfer in status ${transfer.status}.` });
            }

            const updated = await prisma.staffTransfer.update({
                where: { id: String(transferId) },
                data: { status: 'CANCELLED' }
            });

            res.json({ message: 'Transfer cancelled successfully.', transfer: updated });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Failed to cancel transfer.' });
        }
    },

    /**
     * 6. GET SINGLE TRANSFER DETAILS & OFFICIAL LETTER DATA
     */
    async getTransferDetails(req: Request, res: Response) {
        const { transferId } = req.params;

        try {
            const transfer = await prisma.staffTransfer.findUnique({
                where: { id: String(transferId) },
                include: {
                    user: true,
                    fromBranch: true,
                    toBranch: true,
                    fromCompany: true,
                    toCompany: true,
                    initiatedByUser: { select: { fullName: true, role: true } },
                    releasingMdApprovedByUser: { select: { fullName: true, role: true, signatureUrl: true } },
                    receivingMdApprovedByUser: { select: { fullName: true, role: true, signatureUrl: true } },
                    reassignedToUser: { select: { fullName: true, role: true } }
                }
            });

            if (!transfer) return res.status(404).json({ error: 'Transfer record not found.' });

            res.json(transfer);
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to fetch transfer details.' });
        }
    }
};

/**
 * HELPER: Atomically executes the transfer in DB
 */
async function executeTransfer(transferId: string, receivingApprovalData: any) {
    return await prisma.$transaction(async (tx) => {
        const transfer = await tx.staffTransfer.findUnique({
            where: { id: transferId },
            include: { user: true, toBranch: true, fromBranch: true }
        });

        if (!transfer) throw new Error('Transfer record not found for execution.');

        // 1. Update User Branch, Company, Role, and Compensation
        const userUpdateData: any = {
            branchId: transfer.toBranchId,
            companyId: transfer.toCompanyId,
            role: transfer.newRole
        };

        if (transfer.newSalary !== null && transfer.newSalary !== undefined) {
            userUpdateData.monthlySalary = transfer.newSalary;
        }

        if (transfer.newCommission !== null && transfer.newCommission !== undefined) {
            userUpdateData.commissionRate = transfer.newCommission;
        }

        await tx.user.update({
            where: { id: transfer.userId },
            data: userUpdateData
        });

        // 2. Execute Lead Handling Strategy
        if (transfer.leadStrategy === 'MIGRATE_WITH_STAFF') {
            // All personal active leads follow the staff to their new branch & company
            await tx.lead.updateMany({
                where: { assignedToUserId: transfer.userId },
                data: {
                    branchId: transfer.toBranchId,
                    companyId: transfer.toCompanyId
                }
            });
        } else if (transfer.leadStrategy === 'REASSIGN_AT_SOURCE' && transfer.reassignedToUserId) {
            // Reassign active leads to the designated colleague at origin branch
            await tx.lead.updateMany({
                where: { assignedToUserId: transfer.userId },
                data: {
                    assignedToUserId: transfer.reassignedToUserId
                }
            });
        } else if (transfer.leadStrategy === 'RETURN_TO_BRANCH_POOL') {
            // Return leads to origin branch pool (unassigned)
            await tx.lead.updateMany({
                where: { assignedToUserId: transfer.userId },
                data: {
                    assignedToUserId: null
                }
            });
        }

        // 3. Mark Transfer as COMPLETED
        const completedTransfer = await tx.staffTransfer.update({
            where: { id: transferId },
            data: {
                ...receivingApprovalData,
                status: 'COMPLETED',
                executedAt: new Date()
            },
            include: {
                user: { select: { fullName: true, role: true, email: true } },
                fromBranch: { select: { name: true } },
                toBranch: { select: { name: true } }
            }
        });

        return completedTransfer;
    });
}
