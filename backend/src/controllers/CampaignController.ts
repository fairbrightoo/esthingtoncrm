import { Request, Response } from 'express';
import { EmailService } from '../services/EmailService.js';
import { SmsService } from '../services/SmsService.js';
import { WhatsAppService } from '../services/WhatsAppService.js';
import prisma from '../config/prisma.js';


export const CampaignController = {
    // Create new campaign (Draft)
    async createCampaign(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { companyId } = req.user as { companyId: string };
            const { name, type, filters, templateId, scheduledAt } = req.body;

            const campaign = await prisma.campaign.create({
                data: {
                    name,
                    type,
                    status: 'DRAFT',
                    filters: JSON.stringify(filters), // Store as JSON string: { gender: 'Male', source: 'Facebook' }
                    templateId,
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                    companyId
                }
            });
            res.json(campaign);
        } catch (error) {
            console.error("Create Campaign Error:", error);
            res.status(500).json({ error: "Failed to create campaign" });
        }
    },

    // List Campaigns
    async getCampaigns(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { companyId } = req.user as { companyId: string };
            const campaignsRaw = await prisma.campaign.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                include: { template: true }
            });

            // Augment with exact delivery stats
            const campaigns = await Promise.all(campaignsRaw.map(async (camp) => {
                const logs = await prisma.communicationLog.groupBy({
                    by: ['status'],
                    where: { campaignId: camp.id },
                    _count: true
                });

                let sent = 0;
                let failed = 0;
                logs.forEach(l => {
                    if (l.status === 'SENT') sent = l._count;
                    if (l.status === 'FAILED') failed = l._count;
                });

                return {
                    ...camp,
                    stats: { sent, failed }
                };
            }));

            res.json(campaigns);
        } catch (error) {
            console.error("Get Campaigns Error:", error);
            res.status(500).json({ error: "Failed to fetch campaigns" });
        }
    },

    // Execute Campaign (Send Now)
    async sendCampaign(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { userId, companyId } = req.user as { userId: string, companyId: string };
            const { id } = req.params as { id: string };

            const campaign = await prisma.campaign.findUnique({
                where: { id },
                include: { template: true }
            });

            if (!campaign) return res.status(404).json({ error: "Campaign not found" });
            if (campaign.status === 'COMPLETED') return res.status(400).json({ error: "Campaign already sent" });

            // @ts-ignore
            if (!campaign.template) return res.status(400).json({ error: "Campaign has no template" });

            // 1. Parse Filters and Build Query
            const filters = JSON.parse(campaign.filters);
            const whereClause: any = { companyId };

            // Apply Filters
            if (filters.gender && filters.gender !== 'All') {
                whereClause.gender = filters.gender;
            }
            if (filters.status && filters.status !== 'All') {
                whereClause.status = filters.status;
            }
            if (filters.source && typeof filters.source === 'string' && filters.source.trim() !== '') {
                whereClause.source = { contains: filters.source };
            }

            // 2. Fetch Audience
            const leads = await prisma.lead.findMany({ where: whereClause });

            if (leads.length === 0) {
                return res.status(400).json({ error: "No leads match the campaign criteria" });
            }

            // Fetch the company's approved Termii Sender ID and WhatsApp keys
            const company = await prisma.company.findUnique({ where: { id: companyId } });
            const companySenderId = company?.smsSenderId || undefined;
            const waPhoneNumberId = company?.waPhoneNumberId || undefined;
            const waToken = company?.waToken || undefined;

            // 3. Bulk Send Logic
            let sentCount = 0;
            let failedCount = 0;
            const template = (campaign as any).template; // For easier access
            console.log(`[CAMPAIGN START] Sending '${campaign.name}' to ${leads.length} leads...`);

            for (const lead of leads) {
                let status: 'SENT' | 'FAILED' = 'SENT';
                let providerId: string | null = null;
                let success = false;

                if (campaign.type === 'EMAIL') {
                    if (lead.email) {
                        try {
                            providerId = await EmailService.send(lead.email, campaign.name, template.content, undefined, company?.email || undefined);
                            success = true;
                        } catch (e: any) {
                            status = 'FAILED';
                            console.error(`Failed to email lead ${lead.id}:`, e.message);
                        }
                    } else {


                    }
                } else if (campaign.type === 'SMS') {
                    if (lead.phone) {
                        try {
                            // Pass the company's SMS Sender ID here!
                            providerId = await SmsService.sendSMS(lead.phone, template.content, companySenderId);
                            success = true;
                        } catch (e: any) {
                            status = 'FAILED';
                            console.error(`Failed to SMS lead ${lead.id}:`, e.message);
                        }
                    } else {
                        status = 'FAILED';
                    }
                } else if (campaign.type === 'WHATSAPP') {
                    if (lead.whatsappOptIn === false) {
                        status = 'FAILED';
                        console.error(`Lead ${lead.id} opted out of WhatsApp.`);
                    } else if (lead.phone) {
                        try {
                            // Meta usually requires pre-approved templates for campaigns
                            let templateName = template.name;
                            let language = 'en_US';

                            if (template.content.startsWith('META_TEMPLATE|')) {
                                const parts = template.content.split('|');
                                templateName = parts[1];
                                language = parts[2];
                            } else {
                                templateName = template.name.toLowerCase().replace('draft template - ', '').trim();
                            }

                            if (!waPhoneNumberId || !waToken) throw new Error("WhatsApp Business credentials not configured for this company");
                            const waMediaId = filters.waMediaId;
                            const waMediaType = filters.waMediaType;
                            
                            providerId = await WhatsAppService.sendTemplate(lead.phone, templateName, language, waPhoneNumberId, waToken, waMediaId, waMediaType);
                            success = true;
                        } catch (e: any) {
                            status = 'FAILED';
                            console.error(`Failed to WhatsApp lead ${lead.id}:`, e.message);
                        }
                    } else {
                        status = 'FAILED';
                    }
                }

                if (success) sentCount++;
                else failedCount++;

                // Create the log (Record success or failure)
                await prisma.communicationLog.create({
                    data: {
                        leadId: lead.id,
                        userId,
                        type: campaign.type,
                        direction: 'OUTBOUND',
                        content: template.content,
                        status,
                        providerId: providerId || null,
                        campaignId: campaign.id
                    }
                });

                // --- RATE LIMITING IMPL ---
                // Termii only allows 2 reqs per second. Sleep for 600ms to be safe.
                if (campaign.type === 'SMS' || campaign.type === 'WHATSAPP') {
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            }

            // 4. Update Campaign Status
            await prisma.campaign.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    scheduledAt: new Date() // Mark the actual sent time
                }
            });

            console.log(`[CAMPAIGN FINISHED] Sent: ${sentCount}, Failed: ${failedCount}`);
            res.json({ success: true, sent: sentCount, failed: failedCount });

        } catch (error) {
            console.error("Send Campaign Error:", error);
            res.status(500).json({ error: "Failed to execute campaign" });
        }
    },

    // Get Logs for a specific campaign (Sent/Failed details)
    async getCampaignLogs(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { companyId } = req.user as { companyId: string };
            const { id } = req.params as { id: string };

            const logs = await prisma.communicationLog.findMany({
                where: { campaignId: id },
                include: {
                    lead: {
                        select: { id: true, fullName: true, phone: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(logs);
        } catch (error) {
            console.error("Get Campaign Logs Error:", error);
            res.status(500).json({ error: "Failed to fetch campaign logs" });
        }
    },

    // Resend Failed Messages for a Campaign
    async resendFailed(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { userId, companyId } = req.user as { userId: string, companyId: string };
            const { id } = req.params as { id: string };

            const campaign = await prisma.campaign.findUnique({
                where: { id },
                include: { template: true }
            });

            if (!campaign) return res.status(404).json({ error: "Campaign not found" });

            const company = await prisma.company.findUnique({ where: { id: companyId } });
            const companySenderId = company?.smsSenderId || undefined;
            const waPhoneNumberId = company?.waPhoneNumberId || undefined;
            const waToken = company?.waToken || undefined;

            // Find all FAILED logs for this campaign
            const failedLogs = await prisma.communicationLog.findMany({
                where: { campaignId: id, status: 'FAILED' },
                include: { lead: true }
            });

            if (failedLogs.length === 0) {
                return res.json({ success: true, message: "No failed messages to resend.", resent: 0 });
            }

            let recentCount = 0;
            const template = (campaign as any).template;

            for (const log of failedLogs) {
                const lead = log.lead;
                let success = false;
                let providerId: string | null = null;
                let errorMessage = "";

                if (campaign.type === 'EMAIL' && lead.email) {
                    try {
                        providerId = await EmailService.send(lead.email, campaign.name, template.content, undefined, company?.email || undefined);
                        success = true;
                    } catch (e: any) {
                        errorMessage = e.message;
                    }
                } else if (campaign.type === 'SMS' && lead.phone) {
                    try {
                        providerId = await SmsService.sendSMS(lead.phone, template.content, companySenderId);
                        success = true;
                    } catch (e: any) {
                        errorMessage = e.message;
                    }
                } else if (campaign.type === 'WHATSAPP' && lead.phone) {
                    if (lead.whatsappOptIn === false) {
                        errorMessage = "Lead has opted out of WhatsApp communications.";
                    } else {
                        try {
                            const templateName = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                        if (!waPhoneNumberId || !waToken) throw new Error("WhatsApp Business credentials not configured for this company");
                        providerId = await WhatsAppService.sendTemplate(lead.phone, templateName, 'en', waPhoneNumberId, waToken);
                        success = true;
                        } catch (e: any) {
                            errorMessage = e.message;
                        }
                    }
                }

                if (success) {
                    recentCount++;
                    // Update log to SENT
                    await prisma.communicationLog.update({
                        where: { id: log.id },
                        data: {
                            status: 'SENT',
                            providerId: providerId || null
                        }
                    });
                } else {
                    // Just update the providerId with the new error if we want
                    await prisma.communicationLog.update({
                         where: { id: log.id },
                         data: { providerId: errorMessage || log.providerId }
                    });
                }

                // --- RATE LIMITING IMPL ---
                // Termii only allows 2 reqs per second. Sleep for 600ms to be safe.
                if (campaign.type === 'SMS' || campaign.type === 'WHATSAPP') {
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            }

            res.json({ success: true, resent: recentCount, totalFailedAttempted: failedLogs.length });

        } catch (error) {
            console.error("Resend Failed Error:", error);
            res.status(500).json({ error: "Failed to resend campaign messages" });
        }
    }
};
