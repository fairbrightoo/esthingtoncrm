
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummykey');

export const EmailService = {
    async send(to: string, subject: string, html: string, attachments?: { filename: string, content: Buffer }[], fromAddress?: string) {
        try {
            const defaultFrom = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
            const payload: any = {
                from: fromAddress || defaultFrom,
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
    },

    async sendWelcomeEmail(to: string, name: string, companyName: string, role: string, loginUrl: string, password?: string) {
        const subject = `Welcome to ${companyName} - Your Account Details`;
        const html = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; background-color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="color: #4F46E5; margin: 0; font-size: 24px;">Welcome to ${companyName}!</h2>
                </div>
                
                <p style="font-size: 16px; line-height: 1.5;">Hello <strong>${name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.5;">We are thrilled to have you on board! An account has been created for you on the ${companyName} portal. Your designated role is <strong>${role}</strong>.</p>
                
                <div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #E5E7EB;">
                    <h3 style="margin-top: 0; color: #111827; font-size: 18px; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px;">Your Login Credentials</h3>
                    <p style="margin-bottom: 8px;"><strong>Email:</strong> ${to}</p>
                    ${password ? `<p style="margin-bottom: 0;"><strong>Temporary Password:</strong> <code style="background-color: #E0E7FF; color: #4F46E5; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${password}</code></p>` : ''}
                </div>

                <p style="font-size: 16px; line-height: 1.5;">You can securely access your dashboard by clicking the button below:</p>
                
                <div style="text-align: center; margin: 35px 0;">
                    <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Login to Portal</a>
                </div>

                <div style="background-color: #FEF3C7; color: #92400E; padding: 12px; border-radius: 6px; font-size: 14px; margin-bottom: 25px;">
                    <strong>Security Notice:</strong> Please make sure to change your temporary password immediately after your first login by navigating to your Profile Settings.
                </div>

                <p style="font-size: 15px; color: #6B7280; line-height: 1.5;">Best regards,<br><strong style="color: #374151;">${companyName} HR & Admin Team</strong></p>
            </div>
        `;
        return this.send(to, subject, html);
    }
};
