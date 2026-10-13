import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const BroadcastCampaignController = {
    // Record a completed or batch-processed campaign into persistent history
    async recordCampaign(req: Request, res: Response) {
        try {
            const { title, channel, senderId, subject, messageTemplate, results } = req.body;

            if (!messageTemplate || !results || !Array.isArray(results)) {
                return res.status(400).json({ error: "Invalid campaign payload" });
            }

            const successCount = results.filter((r: any) => r.status?.toUpperCase() === 'SUCCESS').length;
            const failedCount = results.length - successCount;

            const campaignTitle = title?.trim() || 
                (subject?.trim() ? subject.trim() : `${channel} Broadcast - ${new Date().toLocaleDateString()}`);

            // Create Campaign record
            const campaign = await prisma.broadcastCampaign.create({
                data: {
                    title: campaignTitle,
                    channel: channel || 'SMS',
                    senderId: senderId || 'DOUBLE KING',
                    subject: subject || null,
                    messageTemplate,
                    totalRecipients: results.length,
                    successCount,
                    failedCount
                }
            });

            // Prepare recipient logs
            const recipientLogs = results.map((r: any) => ({
                campaignId: campaign.id,
                contactId: r.contactId || null,
                name: r.name || null,
                phone: r.phone ? String(r.phone) : null,
                email: r.email || null,
                status: (r.status || 'FAILED').toUpperCase(),
                failureReason: r.reason || null
            }));

            // Batch insert recipient logs
            if (recipientLogs.length > 0) {
                await prisma.broadcastRecipientLog.createMany({
                    data: recipientLogs
                });
            }

            res.status(201).json({ success: true, campaign });
        } catch (error: any) {
            console.error("Error recording broadcast campaign:", error);
            res.status(500).json({ error: error.message || "Failed to record campaign" });
        }
    },

    // List past campaigns with pagination & delivery metrics (Tier 1)
    async getCampaigns(req: Request, res: Response) {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 15));
            const channel = (req.query.channel as string || '').trim().toUpperCase();

            const where: any = {};
            if (channel && (channel === 'SMS' || channel === 'EMAIL')) {
                where.channel = channel;
            }

            const [total, campaigns] = await Promise.all([
                prisma.broadcastCampaign.count({ where }),
                prisma.broadcastCampaign.findMany({
                    where,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                })
            ]);

            res.json({
                campaigns,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            });
        } catch (error: any) {
            console.error("Error fetching broadcast campaigns:", error);
            res.status(500).json({ error: "Failed to fetch campaigns" });
        }
    },

    // Get granular logs for a specific campaign with search and status filtering (Tier 2 Drilldown)
    async getCampaignLogs(req: Request, res: Response) {
        try {
            const id = String(req.params.id);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
            const status = (req.query.status as string || '').trim().toUpperCase();
            const search = (req.query.search as string || '').trim();

            const where: any = { campaignId: id };

            if (status === 'SUCCESS' || status === 'FAILED') {
                where.status = status;
            }

            if (search) {
                const searchDigits = search.replace(/[^0-9]/g, '');
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    ...(searchDigits ? [{ phone: { contains: searchDigits } }] : [])
                ];
            }

            const [campaign, total, logs] = await Promise.all([
                prisma.broadcastCampaign.findUnique({ where: { id } }),
                prisma.broadcastRecipientLog.count({ where }),
                prisma.broadcastRecipientLog.findMany({
                    where,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { sentAt: 'desc' }
                })
            ]);

            if (!campaign) {
                return res.status(404).json({ error: "Campaign not found" });
            }

            res.json({
                campaign,
                logs,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            });
        } catch (error: any) {
            console.error("Error fetching campaign logs:", error);
            res.status(500).json({ error: "Failed to fetch campaign logs" });
        }
    },

    // Retrieve failed recipients from a campaign to quickly reload into the composer
    async getFailedRecipients(req: Request, res: Response) {
        try {
            const id = String(req.params.id);
            const failedLogs = await prisma.broadcastRecipientLog.findMany({
                where: {
                    campaignId: id,
                    status: 'FAILED'
                },
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    failureReason: true
                }
            });

            const recipients = failedLogs.map(l => ({
                id: l.id,
                name: l.name || '',
                phone: l.phone || '',
                email: l.email || '',
                site: '',
                gender: ''
            }));

            res.json({ recipients, count: recipients.length });
        } catch (error: any) {
            console.error("Error fetching failed recipients:", error);
            res.status(500).json({ error: "Failed to fetch failed recipients" });
        }
    }
};
