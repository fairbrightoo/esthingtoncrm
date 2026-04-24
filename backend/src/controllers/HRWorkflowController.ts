import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { uploadFile } from '../services/StorageService.js';

const prisma = new PrismaClient();

export const HRWorkflowController = {

    // ==========================================
    // 1. LEAVE MANAGEMENT WORKFLOW
    // ==========================================

    async applyLeave(req: Request, res: Response) {
        let { userId, companyId, branchId, id: altId } = (req as any).user;
        const { startDate, endDate, type, reason } = req.body;

        try {
            // Fallback: If JWT payload is malformed, fetch from DB
            if (!userId || !companyId || !branchId) {
                const searchId = userId || altId;
                if (searchId) {
                    const dbUser = await prisma.user.findUnique({ where: { id: searchId } });
                    if (dbUser) {
                        userId = dbUser.id;
                        companyId = dbUser.companyId;
                        branchId = dbUser.branchId;
                    }
                }
            }

            if (!companyId || !branchId) {
                return res.status(400).json({ error: 'Your account is not linked to a company branch.' });
            }

            const leave = await prisma.leaveRequest.create({
                data: {
                    userId,
                    companyId,
                    branchId,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    type,
                    reason,
                    status: 'PENDING_HR_APPROVAL'
                }
            });
            res.json(leave);
        } catch (error) {
            console.error('Error applying for leave:', error);
            res.status(500).json({ error: 'Failed to apply for leave' });
        }
    },

    async getMyLeaves(req: Request, res: Response) {
        const { userId } = (req as any).user;
        try {
            const leaves = await prisma.leaveRequest.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    hrApprovedBy: { select: { fullName: true } },
                    mdApprovedBy: { select: { fullName: true } }
                }
            });
            res.json(leaves);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch leaves' });
        }
    },

    async getBranchLeaves(req: Request, res: Response) {
        const { companyId, branchId } = (req as any).user;
        try {
            const leaves = await prisma.leaveRequest.findMany({
                where: { companyId, branchId },
                include: { user: { select: { fullName: true, role: true } } },
                orderBy: { createdAt: 'desc' }
            });
            res.json(leaves);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch branch leaves' });
        }
    },

    async getAllCompanyLeaves(req: Request, res: Response) {
        // For Managing Director
        const { companyId } = (req as any).user;
        try {
            const leaves = await prisma.leaveRequest.findMany({
                where: { companyId, status: 'PENDING_MD_APPROVAL' }, // MD only needs to see vetted leaves
                include: { 
                    user: { select: { fullName: true, role: true } },
                    branch: { select: { name: true } },
                    hrApprovedBy: { select: { fullName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(leaves);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch company leaves' });
        }
    },

    async vetLeaveAsHR(req: Request, res: Response) {
        const { userId: hrUserId } = (req as any).user;
        const { leaveId } = req.params;
        const { status, hrRemarks } = req.body; // status should be PENDING_MD_APPROVAL or REJECTED

        if (!['PENDING_MD_APPROVAL', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status for HR vetting. Use PENDING_MD_APPROVAL or REJECTED.' });
        }

        try {
            const leave = await prisma.leaveRequest.update({
                // @ts-ignore
                where: { id: leaveId },
                data: {
                    status,
                    hrRemarks,
                    hrApprovedByUserId: hrUserId
                }
            });
            res.json(leave);
        } catch (error) {
            res.status(500).json({ error: 'Failed to vet leave' });
        }
    },

    async approveLeaveAsMD(req: Request, res: Response) {
        const { userId: mdUserId } = (req as any).user;
        const { leaveId } = req.params;
        const { status, mdRemarks } = req.body; // APPROVED or REJECTED

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status for MD approval. Use APPROVED or REJECTED.' });
        }

        try {
            const leave = await prisma.leaveRequest.update({
                // @ts-ignore
                where: { id: leaveId },
                data: {
                    status,
                    mdRemarks,
                    mdApprovedByUserId: mdUserId
                }
            });
            res.json(leave);
        } catch (error) {
            res.status(500).json({ error: 'Failed to authorize leave' });
        }
    },

    // ==========================================
    // 2. DISCIPLINARY & QUERIES
    // ==========================================

    async issueQuery(req: Request, res: Response) {
        const { userId: issuerId, companyId, branchId } = (req as any).user;
        const { staffId, subject, description, severity } = req.body;

        try {
            const query = await prisma.disciplinaryQuery.create({
                data: {
                    staffId,
                    issuerId,
                    companyId,
                    branchId,
                    subject,
                    description,
                    severity: severity || 'MEDIUM',
                    status: 'OPEN'
                }
            });
            res.json(query);
        } catch (error) {
            res.status(500).json({ error: 'Failed to issue query' });
        }
    },

    async replyToQuery(req: Request, res: Response) {
        const { userId: staffId } = (req as any).user;
        const { queryId } = req.params;
        const { staffReply } = req.body;

        try {
            const query = await prisma.disciplinaryQuery.updateMany({
                // @ts-ignore
                where: { id: queryId, staffId },
                data: {
                    staffReply,
                    status: 'ANSWERED'
                }
            });
            res.json({ message: 'Reply submitted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to submit reply' });
        }
    },

    async resolveQuery(req: Request, res: Response) {
        const { queryId } = req.params;
        try {
            const query = await prisma.disciplinaryQuery.update({
                // @ts-ignore
                where: { id: queryId },
                data: { status: 'RESOLVED' }
            });
            res.json(query);
        } catch (error) {
            res.status(500).json({ error: 'Failed to resolve query' });
        }
    },

    async getMyQueries(req: Request, res: Response) {
        const { userId: staffId } = (req as any).user;
        try {
            const queries = await prisma.disciplinaryQuery.findMany({
                where: { staffId },
                include: { issuer: { select: { fullName: true, role: true } } },
                orderBy: { createdAt: 'desc' }
            });
            res.json(queries);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch your queries' });
        }
    },

    async getBranchQueries(req: Request, res: Response) {
        const { companyId, branchId } = (req as any).user;
        try {
            const queries = await prisma.disciplinaryQuery.findMany({
                where: { companyId, branchId },
                include: { 
                    staff: { select: { fullName: true, role: true } },
                    issuer: { select: { fullName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(queries);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch branch queries' });
        }
    },

    // ==========================================
    // 3. PERFORMANCE APPRAISALS & AWARDS
    // ==========================================

    async createAppraisal(req: Request, res: Response) {
        const { userId: reviewerId, companyId, branchId } = (req as any).user;
        const { staffId, period, score, remarks, kpiData } = req.body;

        try {
            const appraisal = await prisma.appraisal.create({
                data: {
                    staffId,
                    reviewerId,
                    companyId,
                    branchId,
                    period,
                    score: parseFloat(score),
                    remarks,
                    kpiData: JSON.stringify(kpiData)
                }
            });
            res.json(appraisal);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create appraisal' });
        }
    },

    async getBranchAppraisals(req: Request, res: Response) {
        const { companyId, branchId } = (req as any).user;
        try {
            const appraisals = await prisma.appraisal.findMany({
                where: { companyId, branchId },
                include: { 
                    staff: { select: { fullName: true, role: true } },
                    reviewer: { select: { fullName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(appraisals);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch appraisals' });
        }
    },

    async getMyAppraisals(req: Request, res: Response) {
        const { userId: staffId } = (req as any).user;
        try {
            const appraisals = await prisma.appraisal.findMany({
                where: { staffId },
                include: { reviewer: { select: { fullName: true } } },
                orderBy: { createdAt: 'desc' }
            });
            res.json(appraisals);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch your appraisals' });
        }
    },

    async awardBestStaff(req: Request, res: Response) {
        const { companyId, branchId } = (req as any).user;
        const { staffId, title, month, year } = req.body;
        try {
            // Prevent duplicate awards for same month/year in a branch
            const existing = await prisma.performanceAward.findFirst({
                where: { branchId, month, year, title }
            });
            if (existing) {
                return res.status(400).json({ error: `An award for ${title} in ${month}/${year} already exists.` });
            }

            const award = await prisma.performanceAward.create({
                data: { staffId, companyId, branchId, title, month: parseInt(month), year: parseInt(year) }
            });
            res.json(award);
        } catch (error) {
            res.status(500).json({ error: 'Failed to issue award' });
        }
    },

    async getBranchAwards(req: Request, res: Response) {
        const { companyId, branchId } = (req as any).user;
        try {
            const awards = await prisma.performanceAward.findMany({
                where: { companyId, branchId },
                include: { staff: { select: { fullName: true, passportUrl: true, role: true } } },
                orderBy: { createdAt: 'desc' }
            });
            res.json(awards);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch awards' });
        }
    },

    // ==========================================
    // 4. DOCUMENT & POLICY HUB
    // ==========================================

    async uploadCompanyDocument(req: Request, res: Response) {
        const { userId: createdByUserId, companyId, branchId, role } = (req as any).user;
        const { title, type, isGlobal } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        try {
            const fileUrl = await uploadFile(req.file.buffer, req.file.originalname, 'policies');

            // Allow SUPER_ADMIN or MD to create Global company documents
            const assignBranchId = (isGlobal === 'true' && ['SUPER_ADMIN', 'MANAGING_DIRECTOR'].includes(role)) ? null : branchId;

            const doc = await prisma.companyDocument.create({
                data: {
                    companyId,
                    branchId: assignBranchId,
                    createdByUserId,
                    title,
                    type,
                    fileUrl
                }
            });

            res.json(doc);
        } catch (error) {
            console.error('Error uploading policy document:', error);
            res.status(500).json({ error: 'Failed to upload document' });
        }
    },

    async getCompanyDocuments(req: Request, res: Response) {
        const { companyId, branchId } = (req as any).user;
        try {
            // Fetch global documents (branchId is null) OR branch-specific documents
            const docs = await prisma.companyDocument.findMany({
                where: {
                    companyId,
                    OR: [
                        { branchId: null },
                        { branchId }
                    ]
                },
                include: { createdByUser: { select: { fullName: true, role: true } } },
                orderBy: { createdAt: 'desc' }
            });
            res.json(docs);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch documents' });
        }
    },

    async deleteCompanyDocument(req: Request, res: Response) {
        const { id: docId } = req.params;
        try {
                // @ts-ignore
            const doc = await prisma.companyDocument.findUnique({ where: { id: docId } });
            if (doc && doc.fileUrl) {
                const fileName = doc.fileUrl.replace('/uploads/policies/', '');
                const filePath = path.join(process.cwd(), 'uploads', 'policies', fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
                // @ts-ignore
            await prisma.companyDocument.delete({ where: { id: docId } });
            res.json({ message: 'Document deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete document' });
        }
    }
};
