import { Request, Response } from 'express';
import { AIConciergeService } from '../services/AIConciergeService.js';
import { SmsService } from '../services/SmsService.js';
import { EmailService } from '../services/EmailService.js';

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
            res.status(500).json({ error: "Failed to draft message" });
        }
    },

    async processBatch(req: Request, res: Response) {
        try {
            const { contacts, messageTemplate, senderId, channel } = req.body;
            
            if (!contacts || !Array.isArray(contacts)) {
                return res.status(400).json({ error: "Invalid contacts array" });
            }

            const results = [];

            for (const contact of contacts) {
                try {
                    // Replace placeholders
                    let personalizedMessage = messageTemplate;
                    personalizedMessage = personalizedMessage.replace(/{{Name}}/gi, contact.name || '');
                    personalizedMessage = personalizedMessage.replace(/{{Site}}/gi, contact.site || '');
                    personalizedMessage = personalizedMessage.replace(/{{Title}}/gi, contact.title || (contact.gender === 'Female' ? 'Ma\'am' : 'Sir'));

                    if (channel === 'SMS') {
                        if (!contact.phone) throw new Error("Missing phone number");
                        await SmsService.sendSMS(contact.phone, personalizedMessage, senderId);
                        results.push({ id: contact.id, phone: contact.phone, status: 'Success' });
                    } else if (channel === 'EMAIL') {
                        if (!contact.email) throw new Error("Missing email address");
                        
                        const senderName = senderId || 'Esthington Group';
                        
                        await EmailService.send(
                            contact.email, 
                            `${senderName} Update`, 
                            `<div style="font-family: sans-serif; white-space: pre-wrap;">${personalizedMessage}</div>`,
                            undefined,
                            `${senderName} <${process.env.EMAIL_FROM_ADDRESS}>`
                        );
                        results.push({ id: contact.id, email: contact.email, status: 'Success' });
                    }

                } catch (err: any) {
                    results.push({ 
                        id: contact.id, 
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
