
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummykey');

export const EmailService = {
    async send(to: string, subject: string, html: string, attachments?: { filename: string, content: Buffer }[], fromAddress?: string) {
        try {
            const payload: any = {
                from: fromAddress || process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev',
                to: [to],
                subject: subject,
                html: html,
            };

            if (attachments && attachments.length > 0) {
                payload.attachments = attachments;
            }

            const data = await resend.emails.send(payload);

            if (data.error) {
                console.error("Resend Error:", data.error);
                throw new Error(data.error.message);
            }

            console.log(`[EMAIL SENT] To: ${to}, ID: ${data.data?.id}`);
            return data.data?.id || 'resend-id';
        } catch (error) {
            console.error("Email Service Error:", error);
            throw error;
        }
    }
};
