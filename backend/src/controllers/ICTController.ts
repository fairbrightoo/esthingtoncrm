import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const ICTController = {
    // Marketing Assets
    async getAssets(req: Request, res: Response) {
        try {
            const companyId = req.params.companyId as string;
            const branchId = req.params.branchId as string;
            const assets = await prisma.marketingAsset.findMany({
                where: { companyId, branchId: branchId !== 'null' ? branchId : null },
                orderBy: { createdAt: 'desc' }
            });
            res.json(assets);
        } catch (error) {
            console.error('Get Assets Error:', error);
            res.status(500).json({ error: 'Failed to fetch assets' });
        }
    },

    async createAsset(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = req.params.companyId as string;
            const branchId = req.params.branchId as string;
            const { title, description, type, fileUrl } = req.body;
            // if file was uploaded via multer, use req.file.path (which is the R2 URL set by middleware)
            const finalFileUrl = req.file ? (req.file as any).location : fileUrl;

            const asset = await prisma.marketingAsset.create({
                data: {
                    title,
                    description,
                    type,
                    fileUrl: finalFileUrl,
                    companyId,
                    branchId: branchId !== 'null' ? branchId : null,
                    uploadedByOracleId: user.userId || user.id
                }
            });
            res.json(asset);
        } catch (error) {
            console.error('Create Asset Error:', error);
            res.status(500).json({ error: 'Failed to create asset' });
        }
    },

    async deleteAsset(req: Request, res: Response) {
        try {
            const assetId = req.params.assetId as string;
            await prisma.marketingAsset.delete({ where: { id: assetId } });
            res.json({ success: true });
        } catch (error) {
            console.error('Delete Asset Error:', error);
            res.status(500).json({ error: 'Failed to delete asset' });
        }
    },

    // Production Scripts
    async getScripts(req: Request, res: Response) {
        try {
            const companyId = req.params.companyId as string;
            const branchId = req.params.branchId as string;
            const scripts = await prisma.productionScript.findMany({
                where: { companyId, branchId: branchId !== 'null' ? branchId : null },
                include: { assignedCast: true },
                orderBy: { createdAt: 'desc' }
            });
            res.json(scripts);
        } catch (error) {
            console.error('Get Scripts Error:', error);
            res.status(500).json({ error: 'Failed to fetch scripts' });
        }
    },

    async createScript(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = req.params.companyId as string;
            const branchId = req.params.branchId as string;
            const { title, content } = req.body;

            const script = await prisma.productionScript.create({
                data: {
                    title,
                    content,
                    companyId,
                    branchId: branchId !== 'null' ? branchId : null,
                    authorId: user.userId || user.id
                }
            });
            res.json(script);
        } catch (error) {
            console.error('Create Script Error:', error);
            res.status(500).json({ error: 'Failed to create script' });
        }
    },

    async deleteScript(req: Request, res: Response) {
        try {
            const scriptId = req.params.scriptId as string;
            await prisma.productionScript.delete({ where: { id: scriptId } });
            res.json({ success: true });
        } catch (error) {
            console.error('Delete Script Error:', error);
            res.status(500).json({ error: 'Failed to delete script' });
        }
    },

    // Social Media Reports
    async getSocialReports(req: Request, res: Response) {
        try {
            const companyId = req.params.companyId as string;
            const branchId = req.params.branchId as string;
            const reports = await prisma.socialMediaReport.findMany({
                where: { companyId, branchId: branchId !== 'null' ? branchId : null },
                include: { asset: true },
                orderBy: { reportDate: 'desc' }
            });
            res.json(reports);
        } catch (error) {
            console.error('Get Social Reports Error:', error);
            res.status(500).json({ error: 'Failed to fetch social reports' });
        }
    },

    async createSocialReport(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = req.params.companyId as string;
            const branchId = req.params.branchId as string;
            const { platform, views, likes, comments, shares, assetId } = req.body;

            const report = await prisma.socialMediaReport.create({
                data: {
                    platform,
                    views: parseInt(views) || 0,
                    likes: parseInt(likes) || 0,
                    comments: parseInt(comments) || 0,
                    shares: parseInt(shares) || 0,
                    assetId: assetId || null,
                    companyId,
                    branchId: branchId !== 'null' ? branchId : null,
                    reporterId: user.userId || user.id
                }
            });
            res.json(report);
        } catch (error) {
            console.error('Create Social Report Error:', error);
            res.status(500).json({ error: 'Failed to create social report' });
        }
    }
};
