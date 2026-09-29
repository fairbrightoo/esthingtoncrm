import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AutomationService } from './services/AutomationService.js';

import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Expose static uploads folder
const uploadDir = path.join(process.cwd(), 'uploads');
import fs from 'fs';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// (Payload limits moved higher up to prevent 413 errors)

app.post('/api/dom-dump', (req: Request, res: Response) => {
    try {
        const { dom, fixedElements } = req.body;
        const html = `<!DOCTYPE html><html><head><title>DOM Dump</title></head><body><h2>Fixed Elements:</h2><pre>${fixedElements}</pre><hr/><h2>DOM:</h2>${dom}</body></html>`;
        fs.writeFileSync('dom-dump.html', html);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

import prisma from './config/prisma.js';

app.get('/api/fix-totals', async (req: Request, res: Response) => {
    try {
        const sales = await prisma.sale.findMany({
            include: { payments: { where: { status: 'APPROVED' } } }
        });
        
        let fixedCount = 0;
        let logs: string[] = [];

        for (const sale of sales) {
            const correctTotal = sale.payments.reduce((sum, p) => sum + p.amount + (p.virtualLoanAmount || 0), 0);
            
            if (sale.totalPaid !== correctTotal) {
                logs.push(`Patching sale ${sale.id}: changing totalPaid from ${sale.totalPaid} to ${correctTotal}`);
                
                const isCompleted = correctTotal >= sale.agreedPrice;
                await prisma.sale.update({
                    where: { id: sale.id },
                    data: {
                        totalPaid: correctTotal,
                        status: isCompleted ? 'COMPLETED' : 'ONGOING'
                    }
                });

                if (!isCompleted && sale.plotId) {
                    await prisma.plot.update({
                       where: { id: sale.plotId },
                       data: { status: 'RESERVED' }
                    });
                }
                fixedCount++;
            }
        }
        res.json({ success: true, fixedCount, logs });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/proxy-image', async (req: Request, res: Response) => {
    try {
        const imageUrl = req.query.url as string;
        if (!imageUrl) return res.status(400).send('URL required');
        
        // Fetch the image from the remote server
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Failed to fetch image');
        
        // Get content type
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        // Convert to array buffer then buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Send back to client
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
    } catch (error) {
        console.error('Proxy image error:', error);
        res.status(500).send('Proxy error');
    }
});

import automationRoutes from './routes/automationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import corporateBankAccountRoutes from './routes/corporateBankAccountRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import globalTreasuryRoutes from './routes/globalTreasuryRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import scriptRoutes from './routes/scriptRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import eventRoutes from './routes/eventRoutes.js';

app.use('/api', automationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/corporate-bank-accounts', corporateBankAccountRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/leads', leadRoutes);
import communicationRoutes from './routes/communicationRoutes.js';
app.use('/api/communication', communicationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api', inventoryRoutes); // Products and Sales
import analyticsRoutes from './routes/analyticsRoutes.js';
app.use('/api/analytics', analyticsRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);

import userRoutes from './routes/userRoutes.js';
app.use('/api/users', userRoutes);

import discountRoutes from './routes/discountRoutes.js';
app.use('/api/discounts', discountRoutes);

import documentRoutes from './routes/documentRoutes.js';
app.use('/api/documents', documentRoutes);

import aiRoutes from './routes/aiRoutes.js';
app.use('/api/ai', aiRoutes);

import requisitionRoutes from './routes/requisitionRoutes.js';
app.use('/api/requisitions', requisitionRoutes);

import budgetRoutes from './routes/budgetRoutes.js';
app.use('/api/budgets', budgetRoutes);

import webhookRoutes from './routes/webhookRoutes.js';
app.use('/api/webhooks', webhookRoutes);

import refundRoutes from './routes/refundRoutes.js';
app.use('/api/refunds', refundRoutes);

import hrSettingsRoutes from './routes/hrSettingsRoutes.js';
app.use('/api/hr-settings', hrSettingsRoutes);

import hrAnalyticsRoutes from './routes/hrAnalyticsRoutes.js';
app.use('/api/hr-analytics', hrAnalyticsRoutes);

import hrWorkflowRoutes from './routes/hrWorkflowRoutes.js';
app.use('/api/hr-workflows', hrWorkflowRoutes);

import ticketRoutes from './routes/ticketRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
app.use('/api/tickets', ticketRoutes);
app.use('/api/referrals', referralRoutes);

import payrollRoutes from './routes/payrollRoutes.js';
app.use('/api/payroll', payrollRoutes);

import attendanceRoutes from './routes/attendanceRoutes.js';
app.use('/api/attendance', attendanceRoutes);

import taxRoutes from './routes/taxRoutes.js';
app.use('/api/taxes', taxRoutes);

import executiveMemoRoutes from './routes/executiveMemoRoutes.js';
app.use('/api/memos', executiveMemoRoutes);

import gmdAnalyticsRoutes from './routes/gmdAnalyticsRoutes.js';
import gmRoutes from './routes/gmRoutes.js';
import prisma from './config/prisma.js';
import teamRoutes from './routes/teamRoutes.js';

app.use('/api/gmd-analytics', gmdAnalyticsRoutes);
app.use('/api/gm', gmRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/global-treasury', globalTreasuryRoutes);

// Basic health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

if (process.env.NODE_ENV !== 'test') {
    // Start Background Omnichannel Automation
    AutomationService.startCronJobs();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export { app, prisma };
