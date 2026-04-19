import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export const WebhookController = {
    /**
     * Required by Meta to verify the webhook URL.
     * GET /api/webhooks/whatsapp
     */
    async verifyWhatsAppWebhook(req: Request, res: Response) {
        const verify_token = process.env.META_WEBHOOK_VERIFY_TOKEN || 'esthington_wa_secret';
        
        // Parse params from the webhook verification request
        const mode = req.query['hub.mode'] as string;
        const token = req.query['hub.verify_token'] as string;
        const challenge = req.query['hub.challenge'] as string;

        if (mode && token) {
            if (mode === 'subscribe' && token === verify_token) {
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                // Responds with '403 Forbidden' if verify tokens do not match
                return res.sendStatus(403);
            }
        }
        return res.sendStatus(400);
    },

    /**
     * Receives event payloads (inbound messages, read receipts, etc.)
     * POST /api/webhooks/whatsapp
     */
    async handleWhatsAppWebhook(req: Request, res: Response) {
        try {
            const body = req.body;

            // Check if this is an event from a page subscription
            if (body.object) {
                // Iterate over each entry - there may be multiple if batched
                for (const entry of body.entry || []) {
                    for (const change of entry.changes || []) {
                        if (change.value) {
                            const value = change.value;

                            // 1. INBOUND MESSAGES
                            if (value.messages && value.messages[0]) {
                                const message = value.messages[0];
                                const fromPhone = message.from; // e.g. 2348012345678
                                const messageId = message.id;
                                let textContent = '';

                                if (message.type === 'text') {
                                    textContent = message.text.body;
                                } else {
                                    textContent = `[Media or Interactive Message Received: ${message.type}]`;
                                }

                                // Best effort phone matching (last 10 digits to ignore country code variants like 0 vs 234)
                                const phoneSuffix = fromPhone.slice(-10);
                                const leads = await prisma.lead.findMany({
                                    where: { phone: { contains: phoneSuffix } }
                                });

                                if (leads.length > 0) {
                                    const lead = leads[0];
                                    if (!lead) continue;
                                    
                                    // Prevent duplicate inserts from webhook retries
                                    const existingLog = await prisma.communicationLog.findFirst({
                                        where: { providerId: messageId }
                                    });

                                    if (!existingLog) {
                                        let targetUserId = lead.assignedToUserId;
                                        if (!targetUserId) {
                                            const fallbackUser = await prisma.user.findFirst({ where: { companyId: lead.companyId } });
                                            if (fallbackUser) targetUserId = fallbackUser.id;
                                        }

                                        if (targetUserId) {
                                            await prisma.communicationLog.create({
                                                data: {
                                                    leadId: lead.id,
                                                    type: 'WHATSAPP',
                                                    direction: 'INBOUND',
                                                    content: textContent,
                                                    status: 'DELIVERED',
                                                    providerId: messageId,
                                                    userId: targetUserId
                                                }
                                            });
                                            console.log(`[WEBHOOK INBOUND] Saved message from ${fromPhone}`);
                                            
                                            // --- PHASE 2: AI CONCIERGE AUTO-RESPONSE (24-Hour/Prospect Window) ---
                                            if (lead.status === 'PROSPECT') {
                                                const company = await prisma.company.findUnique({ where: { id: lead.companyId } });
                                                if (company?.waToken && company?.waPhoneNumberId) {
                                                    // Fire async to not block Meta's webhook timeout
                                                    setTimeout(async () => {
                                                        const { AIConciergeService } = await import('../services/AIConciergeService.js');
                                                        const { WhatsAppService } = await import('../services/WhatsAppService.js');
                                                        
                                                        const aiReply = await AIConciergeService.handleIncomingMessage(lead.id, textContent, company.id);
                                                        
                                                        if (aiReply) {
                                                            const sentId = await WhatsAppService.sendText(fromPhone, aiReply, company.waPhoneNumberId!, company.waToken!);
                                                            if (sentId) {
                                                                await prisma.communicationLog.create({
                                                                    data: {
                                                                        leadId: lead.id,
                                                                        type: 'WHATSAPP',
                                                                        direction: 'OUTBOUND',
                                                                        content: aiReply,
                                                                        status: 'SENT',
                                                                        providerId: sentId,
                                                                        userId: targetUserId
                                                                    }
                                                                });
                                                                console.log(`[AI CONCIERGE] Auto-replied to ${fromPhone}`);
                                                            }
                                                        }
                                                    }, 500);
                                                }
                                            }

                                        }
                                    }
                                }
                            }

                            // 2. STATUS UPDATES (Read/Delivered Receipts)
                            if (value.statuses && value.statuses[0]) {
                                const statusObj = value.statuses[0];
                                const messageId = statusObj.id;
                                const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
                                
                                let mappedStatus = 'SENT';
                                if (status === 'delivered') mappedStatus = 'DELIVERED';
                                if (status === 'read') mappedStatus = 'READ';
                                if (status === 'failed') mappedStatus = 'FAILED';

                                if (messageId) {
                                    const log = await prisma.communicationLog.findFirst({
                                        where: { providerId: messageId }
                                    });
                                    
                                    if (log) {
                                        await prisma.communicationLog.update({
                                            where: { id: log.id },
                                            data: { status: mappedStatus }
                                        });
                                        console.log(`[WEBHOOK STATUS] Updated message ${messageId} to ${mappedStatus}`);
                                    }
                                }
                            }

                        }
                    }
                }
                // Return 200 OK to Meta instantly so they stop retrying
                return res.sendStatus(200);
            } else {
                return res.sendStatus(404);
            }
        } catch (error) {
            console.error("Webhook Processing Error:", error);
            // Always return 200 to prevent retry storms
            return res.sendStatus(200);
        }
    },

    /**
     * Required by Meta to verify the Lead Ads webhook URL.
     * GET /api/webhooks/meta-ads
     */
    async verifyMetaAdsWebhook(req: Request, res: Response) {
        const verify_token = process.env.META_WEBHOOK_VERIFY_TOKEN || 'esthington_wa_secret';
        
        const mode = req.query['hub.mode'] as string;
        const token = req.query['hub.verify_token'] as string;
        const challenge = req.query['hub.challenge'] as string;

        if (mode && token) {
            if (mode === 'subscribe' && token === verify_token) {
                console.log('META_ADS_WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                return res.sendStatus(403);
            }
        }
        return res.sendStatus(400);
    },

    /**
     * Receives Meta Lead Ads payloads
     * POST /api/webhooks/meta-ads/:companyId
     */
    async handleMetaLeadAdWebhook(req: Request, res: Response) {
        try {
            const companyId = req.params.companyId;
            const branchId = req.params.branchId || null;
            const body = req.body;

            if (body.object === 'page') {
                for (const entry of body.entry || []) {
                    for (const change of entry.changes || []) {
                        if (change.field === 'leadgen' && change.value) {
                            const leadgenId = change.value.leadgen_id;
                            
                            // Find the company to get its Meta Access Token
                            const company = await prisma.company.findUnique({
                                where: { id: companyId }
                            });

                            if (!company || !company.waToken) {
                                console.error(`[WEBHOOK] Company ${companyId} lacks Meta Token for LeadGen.`);
                                continue;
                            }

                            // Fetch lead details from Meta Graph API
                            try {
                                const fbRes = await axios.get(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${company.waToken}`);
                                const fieldData = fbRes.data.field_data || [];
                                
                                let fullName = 'Unknown FB Lead';
                                let phone = '0000000000';
                                let email = '';

                                for (const field of fieldData) {
                                    if (field.name === 'full_name' && field.values?.[0]) fullName = field.values[0];
                                    if (field.name === 'phone_number' && field.values?.[0]) phone = field.values[0];
                                    if (field.name === 'email' && field.values?.[0]) email = field.values[0];
                                }

                                // Create or Ignore Lead in CRM
                                const phoneSuffix = phone.slice(-10);
                                const existingLead = await prisma.lead.findFirst({
                                    where: { phone: { contains: phoneSuffix } }
                                });

                                if (!existingLead) {
                                    await prisma.lead.create({
                                        data: {
                                            fullName,
                                            phone,
                                            email,
                                            source: 'META_ADS',
                                            status: 'PROSPECT',
                                            companyId: company.id,
                                            branchId: branchId
                                        }
                                    });
                                    console.log(`[WEBHOOK] Injected Meta Lead: ${fullName}`);

                                    // Zero-minute AI greeting
                                    setTimeout(async () => {
                                        try {
                                            const { AIConciergeService } = await import('../services/AIConciergeService.js');
                                            const { WhatsAppService } = await import('../services/WhatsAppService.js');
                                            const userContext = `System Action: A new user named ${fullName} just filled out a Facebook Ad Form for our properties. Give them a short, professional welcome message to start qualifying them.`;
                                            
                                            // Handle ID Retrieval
                                            const savedLead = await prisma.lead.findFirst({ where: { phone: { contains: phoneSuffix } }});
                                            if (savedLead) {
                                              const aiReply = await AIConciergeService.handleIncomingMessage(savedLead.id, userContext, company.id);
                                              if (aiReply) {
                                                  await WhatsAppService.sendText(savedLead.phone, aiReply, company.waPhoneNumberId!, company.waToken!);
                                              }
                                            }
                                        } catch (e) {
                                            console.error("Failed to send zero-minute AI greeting for FB lead", e);
                                        }
                                    }, 1000);
                                }

                            } catch (metaErr) {
                                console.error(`[WEBHOOK] Failed to fetch Meta Lead ${leadgenId}`, metaErr);
                            }
                        }
                    }
                }
                return res.sendStatus(200);
            }
            return res.sendStatus(404);
        } catch (error) {
            console.error("Meta Ads Webhook Error:", error);
            return res.sendStatus(200); // Stop retry storm
        }
    }
};
