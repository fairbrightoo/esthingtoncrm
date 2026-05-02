import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/EmailService.js';
import { SmsService } from '../services/SmsService.js';
import { WhatsAppService } from '../services/WhatsAppService.js';

const prisma = new PrismaClient();

export const CommunicationController = {
    // Send a single message to a lead
    async sendMessage(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const { leadId, type, content, subject, campaignId, mediaUrl, mediaType } = req.body; // type: EMAIL, SMS, WHATSAPP

            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
            if (!user) return res.status(401).json({ error: "User not found" });

            const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { company: true } });
            if (!lead) return res.status(404).json({ error: "Lead not found" });

            const companySenderId = lead.company?.smsSenderId || undefined;
            const waPhoneNumberId = lead.company?.waPhoneNumberId || undefined;
            const waToken = lead.company?.waToken || undefined;

            let providerId = "";
            let recipient = "";
            let status = "SENT"; // Default to SENT if successful

            try {
                if (type === 'EMAIL') {
                    recipient = lead.email || "";
                    if (!recipient) throw new Error("Lead has no email");
                    providerId = await EmailService.send(recipient, subject || "New Message", content, undefined, lead.company?.email || undefined);
                } else if (type === 'SMS') {
                    recipient = lead.phone || "";
                    if (!recipient) throw new Error("Lead has no phone");
                    providerId = await SmsService.sendSMS(recipient, content, companySenderId);
                } else if (type === 'WHATSAPP') {
                    if (lead.whatsappOptIn === false) {
                        throw new Error("Lead has opted out of WhatsApp communications");
                    }
                    recipient = lead.phone || "";
                    if (!recipient) throw new Error("Lead has no phone");
                    if (!waPhoneNumberId || !waToken) throw new Error("WhatsApp Business credentials not configured for this company");
                    if (mediaUrl && mediaType) {
                        providerId = await WhatsAppService.sendMedia(recipient, mediaUrl, mediaType, waPhoneNumberId, waToken);
                    } else {
                        providerId = await WhatsAppService.sendText(recipient, content, waPhoneNumberId, waToken);
                    }
                } else {
                    return res.status(400).json({ error: "Invalid message type" });
                }
            } catch (err: any) {
                console.error("Provider Error:", err.message);
                status = "FAILED";
                // Record the failure in the log
                const log = await prisma.communicationLog.create({
                    data: {
                        leadId,
                        userId: user.id,
                        type,
                        direction: 'OUTBOUND',
                        content,
                        status: 'FAILED',
                        providerId: err.message || ""
                    }
                });
                return res.status(400).json({ error: err.message || "Provider failed to send message", log });
            }

            // Log communication on success
            const log = await prisma.communicationLog.create({
                data: {
                    leadId,
                    userId: user.id,
                    type,
                    direction: 'OUTBOUND',
                    content,
                    status: 'SENT',
                    providerId
                }
            });

            res.json({ success: true, log });
        } catch (error) {
            console.error("SendMessage Error:", error);
            res.status(500).json({ error: "Failed to send message" });
        }
    },

    // Get communication history for a lead
    async getLeadLogs(req: Request, res: Response) {
        try {
            const { leadId } = req.params as { leadId: string };
            const logs = await prisma.communicationLog.findMany({
                where: { leadId },
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, fullName: true, role: true } } }
            });
            res.json(logs);
        } catch (error) {
            console.error("GetLeadLogs Error:", error);
            res.status(500).json({ error: "Failed to fetch logs" });
        }
    },

    // Get branch-wide communication history
    async getAllLogs(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
            
            if (!user) return res.status(401).json({ error: "User not found" });

            const whereClause: any = {};
            if (user.role !== 'SUPER_ADMIN') {
                if (!user.companyId || !user.branchId) {
                    return res.status(400).json({ error: "User is missing company or branch assignment" });
                }
                // Prisma relation filter: fetch logs where the associated lead belongs to this company and branch
                whereClause.lead = { branchId: user.branchId, companyId: user.companyId };
            }

            const logs = await prisma.communicationLog.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: { 
                    user: { select: { fullName: true } },
                    lead: { select: { fullName: true, phone: true, email: true } }
                }
            });
            res.json(logs);
        } catch (error) {
            console.error("GetAllLogs Error:", error);
            res.status(500).json({ error: "Failed to fetch all logs" });
        }
    },

    // Bridged Media Uploader directly to Meta API
    async uploadMetaMedia(req: Request, res: Response) {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            
            // @ts-ignore
            const tokenUser = req.user;
            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId }, include: { company: true } });
            if (!user || !user.company) return res.status(400).json({ error: "User or Company not found" });

            const waPhoneNumberId = user.company.waPhoneNumberId || undefined;
            const waToken = user.company.waToken || undefined;

            const { WhatsAppService } = await import('../services/WhatsAppService.js');
            const fs = await import('fs');
            
            // Wait, we used multer diskStorage, so we must read the Buffer from disk
            const fileBuffer = fs.readFileSync(req.file.path);

            const mediaId = await WhatsAppService.uploadMediaToMeta(
                fileBuffer, 
                req.file.originalname, 
                req.file.mimetype, 
                waPhoneNumberId, 
                waToken
            );

            // Optional: delete local copy since it is securely in Meta now
            fs.unlinkSync(req.file.path);

            res.json({ mediaId, mediaType: req.file.mimetype.split('/')[0] });
        } catch (error: any) {
            console.error("UploadMetaMedia Error:", error.message);
            res.status(500).json({ error: error.message || "Failed to upload to Meta" });
        }
    },

    // Templates
    async createTemplate(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const { name, content, type } = req.body;

            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
            if (!user || !user.companyId) return res.status(400).json({ error: "User has no company" });

            const template = await prisma.messageTemplate.create({
                data: { name, content, type, companyId: user.companyId }
            });
            res.json(template);
        } catch (error) {
            console.error("CreateTemplate Error:", error);
            res.status(500).json({ error: "Failed to create template" });
        }
    },

    async getTemplates(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const { type } = req.query; // Optional filter

            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
            if (!user || !user.companyId) {
                // Return empty if no company (or handle as error depending on logic)
                console.warn("GetTemplates: User has no companyId:", tokenUser.userId);
                return res.json([]);
            }

            const whereClause: any = { companyId: user.companyId };
            if (type) whereClause.type = String(type);

            const templates = await prisma.messageTemplate.findMany({
                where: whereClause,
                orderBy: { name: 'asc' }
            });
            res.json(templates);
        } catch (error) {
            console.error("GetTemplates Error:", error);
            res.status(500).json({ error: "Failed to fetch templates" });
        }
    },

    /**
     * Get Meta WhatsApp Templates for Campaign Builder
     */
    async getWhatsAppTemplates(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
            if (!user) return res.status(401).json({ error: "User not found" });
            if (!user.companyId) return res.status(400).json({ error: "User is not assigned to a company" });

            const company = await prisma.company.findUnique({ where: { id: user.companyId } });
            if (!company || !company.waBusinessAccountId || !company.waToken) {
                return res.status(400).json({ error: "WhatsApp Business details are not configured for your company." });
            }

            const { WhatsAppService } = await import('../services/WhatsAppService.js');
            const templates = await WhatsAppService.getApprovedTemplates(company.waBusinessAccountId, company.waToken);
            res.json(templates);
        } catch (error: any) {
            console.error("Meta Templates Fetch Error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch Meta templates" });
        }
    }
};
