import { Request, Response } from 'express';
import { OnboardingService } from '../services/OnboardingService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const OnboardingController = {
    async bulkUpload(req: Request, res: Response) {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const { companyId } = (req as AuthRequest).user || {};

        if (!companyId) { // Super Admin might need to specify companyId in body? For now assume user belongs to company
            // Or if Super Admin, pass companyID in body
            // Let's check body for companyId override if Super Admin
            // For now simple implementation:
            // res.status(400).json({ error: 'User must belong to a company' });
            // return;
        }

        // If Super Admin, allow companyId param override
        const targetCompanyId = req.body.companyId || companyId;
        const targetBranchId = req.body.branchId || (req as AuthRequest).user?.branchId || null;

        if (!targetCompanyId) {
            res.status(400).json({ error: 'Target company ID required' });
            return;
        }

        try {
            const results = await OnboardingService.processBulkUpload(req.file.buffer, targetCompanyId, targetBranchId);
            res.json(results);
        } catch (error) {
            console.error('Values upload error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
