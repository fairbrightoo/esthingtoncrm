import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';
import { generatePassword } from '../utils/passwordGenerator.js';
import bcrypt from 'bcryptjs';

export const LegacySaleRequestController = {

    // 1. Create a new Legacy Sale Request (Submitting Branch)
    async createRequest(req: AuthRequest, res: Response) {
        try {
            const { userId, companyId, branchId } = req.user!;
            const { 
                estateId, clientName, clientPhone, clientEmail, 
                prototype, size, agreedPrice, amountPaidSoFar, 
                dateOfSale, requestedPlotNumber, marketerEmail, notes 
            } = req.body;

            // Fetch Estate to know who manages it
            const estate = await prisma.estate.findUnique({
                where: { id: estateId },
                include: { company: true, branch: true }
            });

            if (!estate) {
                return res.status(404).json({ error: "Estate not found" });
            }

            const request = await prisma.legacySaleRequest.create({
                data: {
                    clientName,
                    clientPhone,
                    clientEmail,
                    prototype,
                    size: Number(size),
                    agreedPrice: Number(agreedPrice),
                    amountPaidSoFar: Number(amountPaidSoFar),
                    dateOfSale: new Date(dateOfSale),
                    requestedPlotNumber,
                    marketerEmail,
                    notes,
                    estateId,
                    requestingUserId: userId,
                    requestingCompanyId: companyId!,
                    requestingBranchId: branchId!,
                    managingCompanyId: estate.companyId,
                    managingBranchId: estate.managingBranchId,
                    status: 'PENDING'
                }
            });

            res.status(201).json({ message: "Legacy Sale Request submitted successfully to the managing branch.", request });
        } catch (error) {
            console.error("Error creating legacy sale request:", error);
            res.status(500).json({ error: "Failed to submit request" });
        }
    },

    // 2. View Sent Requests (Submitting Branch Admin)
    async getSentRequests(req: AuthRequest, res: Response) {
        try {
            const { branchId } = req.user!;
            const requests = await prisma.legacySaleRequest.findMany({
                where: { requestingBranchId: branchId },
                include: {
                    estate: { select: { name: true, managingCompany: true, managingBranch: true } },
                    assignedPlot: { select: { plotNumber: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(requests);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch sent requests" });
        }
    },

    // 3. View Received Requests (Managing Branch Admin)
    async getReceivedRequests(req: AuthRequest, res: Response) {
        try {
            const { branchId } = req.user!;
            const requests = await prisma.legacySaleRequest.findMany({
                where: { managingBranchId: branchId },
                include: {
                    estate: { select: { name: true } },
                    requestingCompany: { select: { name: true } },
                    requestingBranch: { select: { name: true } },
                    requestingUser: { select: { fullName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(requests);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch received requests" });
        }
    },

    // 4. Reject Request (Managing Branch Admin)
    async rejectRequest(req: AuthRequest, res: Response) {
        try {
            const { requestId } = req.params;
            const { rejectionReason } = req.body;
            const { branchId } = req.user!;

            const existing = await prisma.legacySaleRequest.findUnique({ where: { id: requestId } });
            if (!existing || existing.managingBranchId !== branchId) {
                return res.status(403).json({ error: "Unauthorized or request not found" });
            }

            const updated = await prisma.legacySaleRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    rejectionReason
                }
            });

            res.json({ message: "Request rejected successfully", request: updated });
        } catch (error) {
            res.status(500).json({ error: "Failed to reject request" });
        }
    },

    // 5. Approve Request and Execute Onboarding (Managing Branch Admin)
    async approveRequest(req: AuthRequest, res: Response) {
        try {
            const { requestId } = req.params;
            const { assignedPlotId } = req.body; // Branch Admin selects an available Plot ID
            const { userId, branchId } = req.user!;

            const request = await prisma.legacySaleRequest.findUnique({ 
                where: { id: requestId },
                include: { estate: true }
            });

            if (!request || request.managingBranchId !== branchId) {
                return res.status(403).json({ error: "Unauthorized or request not found" });
            }

            if (request.status !== 'PENDING') {
                return res.status(400).json({ error: "Request is already processed." });
            }

            // 1. Validate Assigned Plot
            const plot = await prisma.plot.findUnique({ where: { id: assignedPlotId } });
            if (!plot || plot.estateId !== request.estateId) {
                return res.status(400).json({ error: "Invalid plot selected." });
            }
            if (plot.status !== 'AVAILABLE') {
                return res.status(400).json({ error: `Plot ${plot.plotNumber} is already ${plot.status}.` });
            }

            // 2. Fetch Marketer (from Requesting Branch)
            let marketerId = null;
            if (request.marketerEmail) {
                const marketer = await prisma.user.findUnique({ where: { email: request.marketerEmail.toLowerCase().trim() } });
                if (marketer) marketerId = marketer.id;
            }

            // 3. Register or Find Client (in Requesting Branch context)
            let clientUser;
            if (request.clientEmail) {
                clientUser = await prisma.user.findUnique({ where: { email: request.clientEmail.toLowerCase().trim() } });
            }
            if (!clientUser) {
                const tempPassword = generatePassword();
                const hashedPassword = await bcrypt.hash(tempPassword, 10);
                clientUser = await prisma.user.create({
                    data: {
                        fullName: request.clientName,
                        email: request.clientEmail || `client-${Date.now()}@temp.esthington.com`,
                        phone: request.clientPhone,
                        password: hashedPassword,
                        role: 'CLIENT',
                        companyId: request.requestingCompanyId, // ATTRIBUTED TO REQUESTING COMPANY
                        branchId: request.requestingBranchId,     // ATTRIBUTED TO REQUESTING BRANCH
                        isActive: true
                    }
                });
            }

            // 4. Create Lead if not exists
            let lead = await prisma.lead.findFirst({
                where: { email: clientUser.email }
            });
            if (!lead) {
                lead = await prisma.lead.create({
                    data: {
                        name: clientUser.fullName,
                        email: clientUser.email,
                        phone: clientUser.phone || "",
                        source: "LEGACY_MIGRATION",
                        status: "CLOSED_WON",
                        companyId: request.requestingCompanyId, // ATTRIBUTED TO REQUESTING COMPANY
                        branchId: request.requestingBranchId,     // ATTRIBUTED TO REQUESTING BRANCH
                        assignedToId: marketerId || request.requestingUserId,
                        convertedToClientId: clientUser.id
                    }
                });
            }

            // 5. Update Plot
            await prisma.plot.update({
                where: { id: plot.id },
                data: { status: 'SOLD' }
            });

            // 6. Create Sale
            const sale = await prisma.sale.create({
                data: {
                    leadId: lead.id,
                    marketerId: marketerId,
                    plotId: plot.id,
                    isCornerPiece: plot.isCornerPiece,
                    agreedPrice: request.agreedPrice,
                    totalPaid: request.amountPaidSoFar,
                    saleStatus: request.amountPaidSoFar >= request.agreedPrice ? 'COMPLETED' : 'ACTIVE',
                    dateOfSale: request.dateOfSale,
                    companyId: request.requestingCompanyId, // ATTRIBUTED TO REQUESTING COMPANY
                    branchId: request.requestingBranchId,     // ATTRIBUTED TO REQUESTING BRANCH
                    // Cross-Company details
                    crossCompanyId: request.requestingCompanyId !== request.managingCompanyId ? request.managingCompanyId : null,
                    receivingBranchId: request.requestingCompanyId !== request.managingCompanyId ? request.managingBranchId : null
                }
            });

            // 7. Create Payment record for legacy amount
            if (request.amountPaidSoFar > 0) {
                await prisma.payment.create({
                    data: {
                        saleId: sale.id,
                        amount: request.amountPaidSoFar,
                        paymentMethod: 'LEGACY_MIGRATION',
                        paymentDate: request.dateOfSale,
                        status: 'CONFIRMED',
                        recordedByUserId: userId, // The approving MD
                        reference: `LEGACY-REQ-${request.id}`,
                        notes: `Legacy Sale approved and onboarded. Originally requested by ${request.requestingUserId}`,
                        receivingBranchId: request.requestingCompanyId !== request.managingCompanyId ? request.managingBranchId : null
                    }
                });
            }

            // 8. Update Request Status
            const approvedRequest = await prisma.legacySaleRequest.update({
                where: { id: request.id },
                data: {
                    status: 'APPROVED',
                    assignedPlotId: plot.id
                }
            });

            res.json({ message: "Legacy Sale successfully approved and onboarded.", request: approvedRequest });
        } catch (error) {
            console.error("Error approving legacy sale request:", error);
            res.status(500).json({ error: "Failed to approve request" });
        }
    }
};
