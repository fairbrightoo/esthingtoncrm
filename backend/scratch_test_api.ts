import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function main() {
    try {
        // Find Double King Head Office MD
        const company = await prisma.company.findFirst({ where: { name: { contains: 'Double King' } } });
        if (!company) { console.log('No company found'); return; }

        const branch = await prisma.branch.findFirst({ where: { companyId: company.id, isHeadOffice: true } });
        if (!branch) { console.log('No HO branch found'); return; }

        const md = await prisma.user.findFirst({ where: { branchId: branch.id, role: 'MANAGING_DIRECTOR' } });
        if (!md) { console.log('No MD found'); return; }

        console.log(`Found MD: ${md.email} (${md.id}) in branch ${branch.name}`);

        const token = jwt.sign({ userId: md.id }, JWT_SECRET, { expiresIn: '1d' });
        
        // Find a staff member
        const staff = await prisma.user.findFirst({ where: { branchId: branch.id, role: 'MARKETER' } });
        if (!staff) { console.log('No staff found'); return; }

        console.log(`Testing staff performance API for staff: ${staff.id}...`);
        
        // Make the HTTP request
        // First we need to start the server or we can just run the controller logic directly.
        // Let's run the controller logic directly by mocking req/res
        const { MDReportController } = await import('./src/controllers/MDReportController.ts');
        const { SaleController } = await import('./src/controllers/SaleController.ts');

        const mockRes = {
            status: function(s: number) { this.statusCode = s; return this; },
            json: function(data: any) { this.data = data; return this; },
            statusCode: 200,
            data: null
        };

        const req1 = {
            params: { staffId: staff.id },
            query: { startDate: '2024-01-01', endDate: '2024-12-31' },
            user: { ...md, companyId: md.companyId, branchId: md.branchId }
        };

        await MDReportController.getMDStaffPerformance(req1 as any, mockRes as any);
        console.log("Performance Result:", mockRes.statusCode, mockRes.data);

        // Test getPendingPayments
        console.log("Testing getPendingPayments...");
        const mockRes2 = {
            status: function(s: number) { this.statusCode = s; return this; },
            json: function(data: any) { this.data = data; return this; },
            statusCode: 200,
            data: null
        };

        const req2 = {
            user: { ...md, companyId: md.companyId, branchId: md.branchId }
        };

        await SaleController.getPendingPayments(req2 as any, mockRes2 as any);
        console.log("Pending Result:", mockRes2.statusCode);
        if (mockRes2.statusCode !== 200) console.log(mockRes2.data);
        
    } catch (e: any) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
