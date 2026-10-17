import { Request, Response } from 'express';
import { AIConciergeService } from '../services/AIConciergeService.js';
import { SmsService } from '../services/SmsService.js';
import { EmailService } from '../services/EmailService.js';
import { normalizePhoneNumber, splitAndNormalizePhones } from '../utils/phoneNormalizer.js';

export const BulkMessagingController = {
    async draftMessage(req: Request, res: Response) {
        try {
            const { prompt } = req.body;
            if (!prompt) {
                return res.status(400).json({ error: "Prompt is required" });
            }

            const draftedText = await AIConciergeService.draftBroadcastMessage(prompt);
            res.json({ text: draftedText });
        } catch (error: any) {
            console.error("BulkMessaging draft Error:", error);
            res.status(500).json({ error: error.message || "Failed to draft message" });
        }
    },

    async processBatch(req: Request, res: Response) {
        try {
            const { 
                contacts, 
                messageTemplate, 
                emailSubject, 
                attachments, 
                senderId, 
                channel,
                sendToAllNumbers = true 
            } = req.body;
            
            if (!contacts || !Array.isArray(contacts)) {
                return res.status(400).json({ error: "Invalid contacts array" });
            }

            const results = [];

            for (const contact of contacts) {
                try {
                    // Replace dynamic placeholders with smart fallbacks
                    let personalizedMessage = messageTemplate;
                    const cleanName = contact.name || 'Valued Subscriber';
                    const firstName = contact.firstName || (cleanName.includes(' ') ? cleanName.split(' ')[0] : cleanName);
                    const salutation = contact.salutation || `Dear ${firstName},`;
                    const title = contact.title || (contact.gender === 'Female' ? "Ma'am" : (contact.gender === 'Male' ? "Sir" : ''));
                    const site = contact.site || 'our prestigious estate';
                    const plotNumber = contact.plotNumber || '';
                    const houseType = contact.houseType || '';
                    const plotSize = contact.plotSize || '';
                    const address = contact.address || '';

                    personalizedMessage = personalizedMessage.replace(/{{Salutation}}/gi, salutation);
                    personalizedMessage = personalizedMessage.replace(/{{FirstName}}/gi, firstName);
                    personalizedMessage = personalizedMessage.replace(/{{Name}}/gi, cleanName);
                    personalizedMessage = personalizedMessage.replace(/{{Title}}/gi, title);
                    personalizedMessage = personalizedMessage.replace(/{{Site}}/gi, site);
                    personalizedMessage = personalizedMessage.replace(/{{PlotNumber}}/gi, plotNumber);
                    personalizedMessage = personalizedMessage.replace(/{{HouseType}}/gi, houseType);
                    personalizedMessage = personalizedMessage.replace(/{{PlotSize}}/gi, plotSize);
                    personalizedMessage = personalizedMessage.replace(/{{Address}}/gi, address);

                    if (channel === 'SMS') {
                        // Gather all numbers to send to
                        let targetPhones: string[] = [];
                        if (Array.isArray(contact.phones) && contact.phones.length > 0 && sendToAllNumbers) {
                            targetPhones = contact.phones.map((p: string) => normalizePhoneNumber(p)).filter(Boolean);
                        } else if (contact.phone) {
                            targetPhones = splitAndNormalizePhones(contact.phone);
                        }

                        if (targetPhones.length === 0) {
                            throw new Error("Missing or invalid phone number");
                        }

                        // Dispatch to each resolved number
                        for (let pIdx = 0; pIdx < targetPhones.length; pIdx++) {
                            const targetPhone = targetPhones[pIdx];
                            const isMulti = targetPhones.length > 1;
                            const lineLabel = isMulti ? ` (Line ${pIdx + 1})` : '';

                            try {
                                await SmsService.sendSMS(targetPhone, personalizedMessage, senderId);
                                results.push({ 
                                    id: isMulti ? `${contact.id}-line-${pIdx + 1}` : contact.id, 
                                    contactId: contact.id,
                                    name: `${contact.name}${lineLabel}`,
                                    phone: targetPhone, 
                                    status: 'Success' 
                                });
                            } catch (lineErr: any) {
                                results.push({ 
                                    id: isMulti ? `${contact.id}-line-${pIdx + 1}` : contact.id, 
                                    contactId: contact.id,
                                    name: `${contact.name}${lineLabel}`,
                                    phone: targetPhone, 
                                    status: 'Failed', 
                                    reason: lineErr.message || 'SMS Send Failure' 
                                });
                            }
                        }

                    } else if (channel === 'EMAIL') {
                        if (!contact.email) throw new Error("Missing email address");
                        
                        const senderName = senderId || 'Esthington Group';
                        
                        await EmailService.send(
                            contact.email, 
                            emailSubject || `${senderName} Update`, 
                            `<div style="font-family: sans-serif; white-space: pre-wrap;">${personalizedMessage}</div>`,
                            attachments,
                            `${senderName} <${process.env.EMAIL_FROM_ADDRESS}>`
                        );
                        results.push({ 
                            id: contact.id, 
                            name: contact.name,
                            email: contact.email, 
                            status: 'Success' 
                        });
                    }

                } catch (err: any) {
                    results.push({ 
                        id: contact.id, 
                        name: contact.name,
                        phone: contact.phone, 
                        email: contact.email,
                        status: 'Failed', 
                        reason: err.message || 'Unknown error' 
                    });
                }
            }

            res.json({ success: true, results });
        } catch (error: any) {
            console.error("BulkMessaging process Error:", error);
            res.status(500).json({ error: "Failed to process batch" });
        }
    }
};
