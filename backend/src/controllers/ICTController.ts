import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { uploadFile } from '../services/StorageService.js';

function parseVideoLink(url: string) {
    if (!url) return { provider: 'EXTERNAL_URL', thumbnailUrl: null, embedUrl: null };
    
    // YouTube
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
        const id = ytMatch[1];
        return {
            provider: 'YOUTUBE',
            thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${id}`
        };
    }

    // Google Drive
    const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
    if (driveMatch && driveMatch[1]) {
        const id = driveMatch[1];
        return {
            provider: 'GOOGLE_DRIVE',
            thumbnailUrl: `https://drive.google.com/thumbnail?id=${id}&sz=w800`,
            embedUrl: `https://drive.google.com/file/d/${id}/preview`
        };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch && vimeoMatch[1]) {
        return {
            provider: 'VIMEO',
            thumbnailUrl: null,
            embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
        };
    }

    return { provider: 'EXTERNAL_URL', thumbnailUrl: null, embedUrl: url };
}

export const ICTController = {
    // Marketing Assets
    async getAssets(req: Request, res: Response) {
        try {
            const companyId = (req.params.companyId || req.query.companyId) as string;
            const branchId = (req.params.branchId || req.query.branchId) as string;
            const { estateId, type, aspectRatio, search, scope } = req.query;

            const whereClause: any = {};

            // Company & Branch Filtering (default: group-wide across entire Esthington Group)
            if (companyId && companyId !== 'ALL' && scope !== 'ALL_COMPANIES' && scope !== 'GROUP') {
                whereClause.companyId = companyId;
            }
            if (branchId && branchId !== 'ALL' && branchId !== 'null' && scope === 'BRANCH_ONLY') {
                whereClause.branchId = branchId;
            }

            if (estateId && estateId !== 'ALL') {
                if (estateId === 'NON_ESTATE' || estateId === 'CORPORATE') {
                    whereClause.estateId = null;
                } else {
                    whereClause.estateId = String(estateId);
                }
            }

            if (type && type !== 'ALL') {
                whereClause.type = String(type);
            }

            if (aspectRatio && aspectRatio !== 'ALL') {
                whereClause.aspectRatio = String(aspectRatio);
            }

            if (search) {
                const s = String(search).trim();
                whereClause.OR = [
                    { title: { contains: s, mode: 'insensitive' } },
                    { description: { contains: s, mode: 'insensitive' } },
                    { marketingCaption: { contains: s, mode: 'insensitive' } },
                    { estate: { name: { contains: s, mode: 'insensitive' } } },
                    { company: { name: { contains: s, mode: 'insensitive' } } },
                    { branch: { name: { contains: s, mode: 'insensitive' } } }
                ];
            }

            const assets = await prisma.marketingAsset.findMany({
                where: whereClause,
                include: {
                    estate: { select: { id: true, name: true, location: true } },
                    company: { select: { id: true, name: true, logoUrl: true } },
                    branch: { select: { id: true, name: true } },
                    uploadedByOracle: { select: { id: true, fullName: true, role: true } }
                },
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
            let effectiveCompanyId = (req.params.companyId && req.params.companyId !== 'ALL' && req.params.companyId !== 'global') 
                ? req.params.companyId 
                : (user.companyId || req.body.companyId);

            const { 
                title, 
                description, 
                type = 'FLYER', 
                aspectRatio = '1:1', 
                estateId, 
                marketingCaption, 
                fileUrl, 
                customThumbnailUrl 
            } = req.body;

            if (!effectiveCompanyId && estateId && estateId !== 'ALL') {
                const est = await prisma.estate.findUnique({ where: { id: estateId }, select: { companyId: true } });
                if (est?.companyId) effectiveCompanyId = est.companyId;
            }

            if (!effectiveCompanyId) {
                const firstCompany = await prisma.company.findFirst({ select: { id: true } });
                if (firstCompany) effectiveCompanyId = firstCompany.id;
            }

            const rawBranch = req.params.branchId || user.branchId;
            const effectiveBranchId = (rawBranch && rawBranch !== 'ALL' && rawBranch !== 'null' && rawBranch !== 'global') ? rawBranch : (user.branchId || null);

            let finalFileUrl = fileUrl;
            let storageProvider = 'R2';
            let thumbnailUrl: string | null = customThumbnailUrl || null;
            let fileSizeMB: number | null = null;

            if (req.file) {
                const isVideoFile = req.file.mimetype.startsWith('video/') ||
                    Boolean(req.file.originalname.match(/\.(mp4|mov|webm|m4v)$/i)) ||
                    type.toLowerCase().includes('video') ||
                    type === 'STORY_REEL' ||
                    type === 'PROMO_VIDEO' ||
                    type === 'MEETING_EVENT' ||
                    type === 'ENTERTAINMENT' ||
                    type === 'TRAINING';

                const folder = isVideoFile ? 'marketing-videos' : 'marketing-flyers';
                finalFileUrl = await uploadFile(req.file.buffer, req.file.originalname, folder);
                fileSizeMB = Number((req.file.size / (1024 * 1024)).toFixed(2));
                storageProvider = 'R2';

                // If client provided a base64 thumbnail captured from video frame
                if (customThumbnailUrl && typeof customThumbnailUrl === 'string' && customThumbnailUrl.startsWith('data:image')) {
                    try {
                        const base64Data = customThumbnailUrl.replace(/^data:image\/\w+;base64,/, '');
                        const thumbBuffer = Buffer.from(base64Data, 'base64');
                        const thumbName = `thumb-${Date.now()}.jpg`;
                        thumbnailUrl = await uploadFile(thumbBuffer, thumbName, 'marketing-thumbnails');
                    } catch (e) {
                        console.error('Failed to process custom video thumbnail:', e);
                        thumbnailUrl = null;
                    }
                } else if (!isVideoFile) {
                    // For images, the image file is its own thumbnail
                    thumbnailUrl = finalFileUrl;
                } else {
                    // For video files without custom thumbnail, leave null (frontend uses video #t=0.5)
                    thumbnailUrl = null;
                }
            } else if (fileUrl) {
                // External video / cloud link
                const parsed = parseVideoLink(fileUrl);
                storageProvider = parsed.provider;
                if (!thumbnailUrl && parsed.thumbnailUrl) {
                    thumbnailUrl = parsed.thumbnailUrl;
                }
            } else {
                return res.status(400).json({ error: 'Please provide a file to upload or an external video link.' });
            }

            const asset = await prisma.marketingAsset.create({
                data: {
                    title,
                    description: description || null,
                    type,
                    aspectRatio,
                    fileUrl: finalFileUrl,
                    thumbnailUrl,
                    storageProvider,
                    fileSizeMB,
                    marketingCaption: marketingCaption || null,
                    estateId: (estateId && estateId !== 'ALL' && estateId !== 'NON_ESTATE' && estateId !== 'CORPORATE') ? estateId : null,
                    companyId: effectiveCompanyId as string,
                    branchId: effectiveBranchId,
                    uploadedByOracleId: user.userId || user.id
                },
                include: {
                    estate: { select: { id: true, name: true, location: true } },
                    company: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true } },
                    uploadedByOracle: { select: { id: true, fullName: true } }
                }
            });

            res.status(201).json(asset);
        } catch (error: any) {
            console.error('Create Asset Error:', error);
            res.status(500).json({ error: error.message || 'Failed to create asset' });
        }
    },

    async updateAsset(req: Request, res: Response) {
        try {
            const assetId = req.params.assetId as string;
            const { title, description, type, aspectRatio, estateId, marketingCaption } = req.body;

            const updated = await prisma.marketingAsset.update({
                where: { id: assetId },
                data: {
                    ...(title && { title }),
                    ...(description !== undefined && { description }),
                    ...(type && { type }),
                    ...(aspectRatio && { aspectRatio }),
                    estateId: (estateId && estateId !== 'ALL' && estateId !== 'NON_ESTATE' && estateId !== 'CORPORATE') ? estateId : null,
                    ...(marketingCaption !== undefined && { marketingCaption })
                },
                include: {
                    estate: { select: { id: true, name: true, location: true } },
                    company: { select: { id: true, name: true } }
                }
            });

            res.json(updated);
        } catch (error: any) {
            console.error('Update Asset Error:', error);
            res.status(500).json({ error: 'Failed to update asset' });
        }
    },

    async trackDownload(req: Request, res: Response) {
        try {
            const assetId = req.params.assetId as string;
            const updated = await prisma.marketingAsset.update({
                where: { id: assetId },
                data: { downloadCount: { increment: 1 } }
            });
            res.json({ success: true, downloadCount: updated.downloadCount });
        } catch (error) {
            console.error('Track Download Error:', error);
            res.status(500).json({ error: 'Failed to record download' });
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
