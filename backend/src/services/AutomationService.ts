import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { EmailService } from './EmailService.js';
import { WhatsAppService } from './WhatsAppService.js';
import { SmsService } from './SmsService.js';
import prisma from '../config/prisma.js';
import OpenAI from 'openai';

dotenv.config();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateAIMessage(prompt: string): Promise<string> {
    try {
        const openai = getOpenAI();
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: prompt }],
            max_tokens: 150,
            temperature: 0.7
        });
        return response.choices[0].message.content || "";
    } catch (e) {
        console.error("OpenAI generation error", e);
        return "";
    }
}

export const AutomationService = {
    /**
     * Triggered when a marketer is created (bulk or single).
     */
    async triggerMarketerCreated(user: { name: string; email: string; tempToken: string }) {
        if (!N8N_WEBHOOK_URL) return;
        try {
            await axios.post(`${N8N_WEBHOOK_URL}/marketer-created`, {
                name: user.name,
                email: user.email,
                temp_password: user.tempToken,
                login_url: process.env.FRONTEND_URL || 'http://localhost:5173/login'
            });
            console.log(`[Automation] Marketer Created webhook sent for ${user.email}`);
        } catch (error) {
            console.error('[Automation] Failed to send Marketer Created webhook', error);
        }
    },

    /**
     * Triggered when a lead is registered.
     */
    async triggerLeadRegistered(lead: { id: string; name: string; email: string; phone: string }) {
        if (!N8N_WEBHOOK_URL) return;
        try {
            await axios.post(`${N8N_WEBHOOK_URL}/lead-registered`, lead);
            console.log(`[Automation] Lead Registered webhook sent for ${lead.email}`);
        } catch (error) {
            console.error('[Automation] Failed to send Lead Registered webhook', error);
        }
    },

    /**
     * Triggered when a payment is verified (Placeholder for future use).
     */
    async triggerPaymentVerified(payment: any) {
        if (!N8N_WEBHOOK_URL) return;
        try {
            await axios.post(`${N8N_WEBHOOK_URL}/payment-verified`, payment);
        } catch (error) {
            console.error('[Automation] Failed to send Payment Verified webhook', error);
        }
    },

    /**
     * CRON JOBS: Drip Campaigns & Nurturing (PHASE 4)
     */
    startCronJobs() {
        // Run daily at 9:00 AM (server time)
        cron.schedule('0 9 * * *', async () => {
            console.log('[CRON] Starting daily omnichannel automation sequences...');
            await this.runDay7NurturingEmail();
            await this.runBirthdayEmails();
            await this.runDailyAIPaymentReminders();
            console.log('[CRON] Sequences completed.');
        });
        console.log('[CRON] Automation Service initialized and running in background.');
    },

    async runDay7NurturingEmail() {
        try {
            const systemAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });

            const sevenDaysAgoStart = new Date();
            sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7);
            sevenDaysAgoStart.setHours(0, 0, 0, 0);

            const sevenDaysAgoEnd = new Date(sevenDaysAgoStart);
            sevenDaysAgoEnd.setHours(23, 59, 59, 999);

            const leadsToNurture = await prisma.lead.findMany({
                where: {
                    status: 'PROSPECT',
                    createdAt: { gte: sevenDaysAgoStart, lte: sevenDaysAgoEnd },
                    email: { not: null }
                },
                include: { company: true }
            });

            for (const lead of leadsToNurture) {
                if (!lead.email) continue;
                
                const html = `
                <div style="font-family: sans-serif; max-w: 600px; margin: auto; padding: 20px;">
                    <h2 style="color: #4F46E5;">Are you still considering your investment, ${lead.fullName}?</h2>
                    <p>It's been a week since you inquired about our luxury portfolios.</p>
                    <p>Did you know that properties in our flagship estates have historically appreciated by <strong>22% annually</strong>? Every day you wait to secure your plot, you leave potential equity on the table.</p>
                    <p>We are currently offering extremely flexible payment structures to make acquiring your asset completely stress-free.</p>
                    <br/>
                    <p>If you're ready to review the ROI breakdown, reply to this email or send us a WhatsApp message.</p>
                    <hr style="border: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #888;">${lead.company.name} | Premium Real Estate Management</p>
                </div>
                `;

                const sentId = await EmailService.send(lead.email, `Your Property Investment Portfolio - ROI Breakdown`, html, undefined, lead.company.email || undefined);
                
                if (systemAdmin) {
                    await prisma.communicationLog.create({
                        data: {
                            leadId: lead.id,
                            userId: systemAdmin.id,
                            type: 'EMAIL',
                            direction: 'OUTBOUND',
                            content: 'Auto Drip: 7-Day Asset ROI Breakdown Email',
                            status: 'SENT',
                            providerId: sentId
                        }
                    });
                }
                console.log(`[CRON] Sent 7-Day ROI email to ${lead.email}`);
            }
        } catch (error) {
            console.error('[CRON] Failed Day 7 Nurturing:', error);
        }
    },

    async runBirthdayEmails() {
        try {
            const systemAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
            if (!systemAdmin) return;

            const today = new Date();
            const month = today.getMonth() + 1; // 1-12
            const day = today.getDate();

            const allLeadsWithBirthdays = await prisma.lead.findMany({
                where: { dateOfBirth: { not: null } },
                include: { company: true }
            });

            const birthdayLeads = allLeadsWithBirthdays.filter(lead => {
                if (!lead.dateOfBirth) return false;
                const dob = new Date(lead.dateOfBirth);
                return (dob.getMonth() + 1) === month && dob.getDate() === day;
            });

            for (const lead of birthdayLeads) {
                if (!lead.phone && !lead.email) continue;

                const prompt = `You are a Customer Care representative for ${lead.company.name}. Today is ${lead.fullName}'s birthday. Write a very short, warm, and professional birthday greeting (max 2 sentences) to be sent via WhatsApp/SMS. Use their name. Do not sign off with a personal name, just the company name. Do not include placeholders.`;
                const aiMessage = await generateAIMessage(prompt);
                
                if (!aiMessage) continue;

                let sentVia = '';
                // Try WhatsApp first
                if (lead.whatsappOptIn && lead.phone && lead.company.waPhoneNumberId && lead.company.waToken) {
                    try {
                        await WhatsAppService.sendText(lead.phone, aiMessage, lead.company.waPhoneNumberId, lead.company.waToken);
                        sentVia = 'WHATSAPP';
                    } catch (e) { console.error("WhatsApp failed for birthday", e); }
                }
                
                // Fallback to SMS if WhatsApp not sent
                if (!sentVia && lead.phone) {
                    try {
                        const smsId = await SmsService.sendSMS(lead.phone, aiMessage, lead.company.smsSenderId || undefined);
                        sentVia = 'SMS';
                    } catch (e) { console.error("SMS failed for birthday", e); }
                }

                // Fallback to Email if SMS/WhatsApp not sent and email exists
                if (!sentVia && lead.email) {
                    const html = `<div style="font-family: sans-serif; padding: 20px;"><p>${aiMessage.replace(/\n/g, '<br/>')}</p></div>`;
                    await EmailService.send(lead.email, `Happy Birthday from ${lead.company.name}! 🎉`, html, undefined, lead.company.email || undefined);
                    sentVia = 'EMAIL';
                }

                if (sentVia) {
                    await prisma.communicationLog.create({
                        data: {
                            leadId: lead.id,
                            userId: systemAdmin.id,
                            type: sentVia,
                            direction: 'OUTBOUND',
                            content: `Auto AI: ${aiMessage}`,
                            status: 'SENT',
                            providerId: 'AI_BIRTHDAY_CRON'
                        }
                    });
                    console.log(`[CRON] Sent AI Birthday message to ${lead.fullName} via ${sentVia}`);
                }
            }
        } catch (error) {
            console.error('[CRON] Failed Birthday Emails:', error);
        }
    },

    async runDailyAIPaymentReminders() {
        try {
            const systemAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
            if (!systemAdmin) return;

            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            
            // Determine if we are in the last 7 days of the month
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const isEndOfMonth = today.getDate() > (daysInMonth - 7);

            // Fetch ongoing sales
            const ongoingSales = await prisma.sale.findMany({
                where: { status: 'ONGOING' },
                include: { 
                    lead: { include: { company: true } }, 
                    payments: { where: { status: 'APPROVED' }, orderBy: { date: 'desc' } }
                }
            });

            for (const sale of ongoingSales) {
                const lead = sale.lead;
                if (!lead.phone && !lead.email) continue;

                const balance = sale.agreedPrice - sale.totalPaid;
                if (balance <= 0) continue;

                const lastPaymentDate = sale.payments.length > 0 ? new Date(sale.payments[0].date) : new Date(sale.createdAt);
                
                // Calculate days since last payment
                const diffTime = Math.abs(today.getTime() - lastPaymentDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Check if they paid this month
                const paidThisMonth = sale.payments.some(p => {
                    const pDate = new Date(p.date);
                    return pDate.getMonth() === month && pDate.getFullYear() === year;
                });

                let prompt = '';
                let reminderType = '';

                // Condition 1: 30 days overdue
                if (diffDays >= 30) {
                    prompt = `You are a Customer Care representative for ${lead.company.name}. You are messaging ${lead.fullName} who has an ongoing property purchase. Their last payment was over 30 days ago, and their outstanding balance is ₦${balance.toLocaleString()}. Write a very short, professional, and firm message (max 2 sentences) urging them to clear their arrears immediately to avoid risking the loss of their property allocation. Keep it respectful but urgent. Do not use placeholders.`;
                    reminderType = 'OVERDUE_WARNING';
                } 
                // Condition 2: End of month gentle reminder
                else if (isEndOfMonth && !paidThisMonth) {
                    prompt = `You are a Customer Care representative for ${lead.company.name}. You are messaging ${lead.fullName} who has an ongoing property purchase but hasn't made a payment this month. Their outstanding balance is ₦${balance.toLocaleString()}. Write a very short, subtle, and friendly message (max 2 sentences) reminding them to make a deposit before the month ends. Be highly professional. Do not use placeholders.`;
                    reminderType = 'GENTLE_REMINDER';
                }

                if (prompt) {
                    const aiMessage = await generateAIMessage(prompt);
                    if (!aiMessage) continue;

                    let sentVia = '';
                    if (lead.whatsappOptIn && lead.phone && lead.company.waPhoneNumberId && lead.company.waToken) {
                        try {
                            await WhatsAppService.sendText(lead.phone, aiMessage, lead.company.waPhoneNumberId, lead.company.waToken);
                            sentVia = 'WHATSAPP';
                        } catch (e) { console.error("WhatsApp failed for payment reminder", e); }
                    }
                    
                    // Fallback to SMS if WhatsApp not sent
                    if (!sentVia && lead.phone) {
                        try {
                            const smsId = await SmsService.sendSMS(lead.phone, aiMessage, lead.company.smsSenderId || undefined);
                            sentVia = 'SMS';
                        } catch (e) { console.error("SMS failed for payment reminder", e); }
                    }

                    // Fallback to Email if SMS/WhatsApp not sent
                    if (!sentVia && lead.email) {
                        const html = `<div style="font-family: sans-serif; padding: 20px;"><p>${aiMessage.replace(/\n/g, '<br/>')}</p></div>`;
                        await EmailService.send(lead.email, `Property Payment Update - ${lead.company.name}`, html, undefined, lead.company.email || undefined);
                        sentVia = 'EMAIL';
                    }

                    if (sentVia) {
                        await prisma.communicationLog.create({
                            data: {
                                leadId: lead.id,
                                userId: systemAdmin.id,
                                type: sentVia,
                                direction: 'OUTBOUND',
                                content: `Auto AI (${reminderType}): ${aiMessage}`,
                                status: 'SENT',
                                providerId: 'AI_REMINDER_CRON'
                            }
                        });
                        console.log(`[CRON] Sent AI Payment Reminder (${reminderType}) to ${lead.fullName} via ${sentVia}`);
                    }
                }
            }
        } catch (error) {
            console.error('[CRON] Failed Daily Payment Reminders:', error);
        }
    }
};
