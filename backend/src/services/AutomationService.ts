import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { EmailService } from './EmailService.js';

const prisma = new PrismaClient();

dotenv.config();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

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
                temp_password: user.tempToken, // In real app, send reset link, not raw pwd if possible, or temp pwd
                login_url: process.env.FRONTEND_URL || 'http://localhost:5173/login' // Define this env
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

            const today = new Date();
            const month = today.getMonth() + 1; // 1-12
            const day = today.getDate();

            const allLeadsWithBirthdays = await prisma.lead.findMany({
                where: { dateOfBirth: { not: null }, email: { not: null } },
                include: { company: true }
            });

            const birthdayLeads = allLeadsWithBirthdays.filter(lead => {
                if (!lead.dateOfBirth) return false;
                const dob = new Date(lead.dateOfBirth);
                return (dob.getMonth() + 1) === month && dob.getDate() === day;
            });

            for (const lead of birthdayLeads) {
                if (!lead.email) continue;

                const html = `
                <div style="font-family: sans-serif; text-align: center; padding: 40px;">
                    <h1 style="color: #EC4899;">Happy Birthday, ${lead.fullName}! 🎂</h1>
                    <p style="color: #555; font-size: 18px;">From all of us at ${lead.company.name}, we wish you joy, health, and abundant wealth in your new age.</p>
                    <br/>
                    <p style="font-size: 14px; color: #888;">Cheers to another amazing year!</p>
                </div>
                `;

                const sentId = await EmailService.send(lead.email, `Happy Birthday from ${lead.company.name}! 🎉`, html, undefined, lead.company.email || undefined);
                
                if (systemAdmin) {
                    await prisma.communicationLog.create({
                        data: {
                            leadId: lead.id,
                            userId: systemAdmin.id,
                            type: 'EMAIL',
                            direction: 'OUTBOUND',
                            content: 'Auto Drip: Happy Birthday Greeting',
                            status: 'SENT',
                            providerId: sentId
                        }
                    });
                }
                console.log(`[CRON] Sent Birthday email to ${lead.email}`);
            }
        } catch (error) {
            console.error('[CRON] Failed Birthday Emails:', error);
        }
    }
};
