import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../server.js'; // Ensure app and prisma are correctly exported from server.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../services/StorageService.js', () => ({
    uploadFile: vi.fn().mockResolvedValue('https://mock-s3-url/receipt.jpg')
}));

vi.mock('../services/DocumentAutomationService.js', () => ({
    DocumentAutomationService: {
        dispatchDocuments: vi.fn().mockResolvedValue(true)
    }
}));

// Simulation Configuration
const TEST_COMPANY_ABBR = 'TESTX';

describe('Cross-Company Sales & Commission Architecture', () => {
    
    let tokenA1_Marketer = '';
    let tokenA1_MD = '';
    let tokenB1_MD = '';
    let tokenA1_Accountant = '';
    let tokenB1_Accountant = '';

    // Data references
    let companyA: any, companyB: any;
    let branchA1: any, branchB1: any, branchC1: any;
    let bankA1: any, bankB1: any, bankC1: any;
    let marketerA1: any, mdA1: any, mdB1: any, accA1: any, accB1: any;
    let estateA1: any, estateB1: any;
    let plotA1: any, plotB1: any, plotC1: any;
    let leadA1: any;
    
    // Created Sales & Payments
    let directSale: any, directPayment: any;
    let outboundSale: any, outboundPayment: any;
    let inboundSale: any, inboundPayment: any; // essentially the same as outbound, but evaluated from B1's perspective
    let mismatchedSale: any, mismatchedPayment: any;

    const generateToken = (user: any) => {
        return jwt.sign(
            { userId: user.id, companyId: user.companyId, branchId: user.branchId, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1h' }
        );
    };

    beforeAll(async () => {
        // --- 1. SETUP ENVIRONMENT & SEED DATA ---
        // Clean up previous test runs if they failed mid-way
        // Delete children manually because Prisma cascade deletes might not be configured
        await prisma.payment.deleteMany({ where: { sale: { lead: { company: { abbreviation: TEST_COMPANY_ABBR } } } } });
        await prisma.sale.deleteMany({ where: { lead: { company: { abbreviation: TEST_COMPANY_ABBR } } } });
        await prisma.lead.deleteMany({ where: { company: { abbreviation: TEST_COMPANY_ABBR } } });
        await prisma.plot.deleteMany({ where: { estate: { company: { abbreviation: TEST_COMPANY_ABBR } } } });
        await prisma.estate.deleteMany({ where: { company: { abbreviation: TEST_COMPANY_ABBR } } });
        await prisma.corporateBankAccount.deleteMany({ where: { branch: { company: { abbreviation: TEST_COMPANY_ABBR } } } });
        await prisma.user.deleteMany({ where: { company: { abbreviation: TEST_COMPANY_ABBR } } });
        await prisma.branch.deleteMany({ where: { company: { abbreviation: TEST_COMPANY_ABBR } } });
        await prisma.company.deleteMany({ where: { abbreviation: TEST_COMPANY_ABBR } });

        // Create 2 Mock Companies
        companyA = await prisma.company.create({ data: { name: 'Test Company A', abbreviation: TEST_COMPANY_ABBR } });
        companyB = await prisma.company.create({ data: { name: 'Test Company B', abbreviation: TEST_COMPANY_ABBR } });

        // Create 3 Branches: A1 (Company A), B1 (Company B), C1 (Company A - unrelated)
        branchA1 = await prisma.branch.create({ data: { name: 'Branch A1', companyId: companyA.id } });
        branchB1 = await prisma.branch.create({ data: { name: 'Branch B1', companyId: companyB.id } });
        branchC1 = await prisma.branch.create({ data: { name: 'Branch C1', companyId: companyA.id } });

        // Create Corporate Bank Accounts
        bankA1 = await prisma.corporateBankAccount.create({ data: { accountName: 'Bank A1', accountNumber: '111', bankName: 'Bank', branchId: branchA1.id, companyName: companyA.name } });
        bankB1 = await prisma.corporateBankAccount.create({ data: { accountName: 'Bank B1', accountNumber: '222', bankName: 'Bank', branchId: branchB1.id, companyName: companyB.name } });
        bankC1 = await prisma.corporateBankAccount.create({ data: { accountName: 'Bank C1', accountNumber: '333', bankName: 'Bank', branchId: branchC1.id, companyName: companyA.name } });

        const pw = await bcrypt.hash('password123', 10);

        // Create Users
        marketerA1 = await prisma.user.create({ data: { email: 'marketer@A1.com', passwordHash: pw, fullName: 'Marketer A1', role: 'MARKETER', companyId: companyA.id, branchId: branchA1.id } });
        mdA1 = await prisma.user.create({ data: { email: 'md@A1.com', passwordHash: pw, fullName: 'MD A1', role: 'MANAGING_DIRECTOR', companyId: companyA.id, branchId: branchA1.id } });
        mdB1 = await prisma.user.create({ data: { email: 'md@B1.com', passwordHash: pw, fullName: 'MD B1', role: 'MANAGING_DIRECTOR', companyId: companyB.id, branchId: branchB1.id } });
        accA1 = await prisma.user.create({ data: { email: 'acc@A1.com', passwordHash: pw, fullName: 'Accountant A1', role: 'ACCOUNTANT', companyId: companyA.id, branchId: branchA1.id } });
        accB1 = await prisma.user.create({ data: { email: 'acc@B1.com', passwordHash: pw, fullName: 'Accountant B1', role: 'ACCOUNTANT', companyId: companyB.id, branchId: branchB1.id } });

        // Generate Tokens
        tokenA1_Marketer = generateToken(marketerA1);
        tokenA1_MD = generateToken(mdA1);
        tokenB1_MD = generateToken(mdB1);
        tokenA1_Accountant = generateToken(accA1);
        tokenB1_Accountant = generateToken(accB1);

        // Create Estates
        estateA1 = await prisma.estate.create({ data: { name: 'Estate A1', location: 'Loc A1', companyId: companyA.id, managingBranchId: branchA1.id } });
        estateB1 = await prisma.estate.create({ data: { name: 'Estate B1', location: 'Loc B1', companyId: companyB.id, managingBranchId: branchB1.id } });

        // Create Plots
        plotA1 = await prisma.plot.create({ data: { estateId: estateA1.id, plotNumber: 'PA1', prototype: 'Type 1', size: 500, price: 10000000 } });
        plotB1 = await prisma.plot.create({ data: { estateId: estateB1.id, plotNumber: 'PB1', prototype: 'Type 1', size: 500, price: 20000000 } });
        plotC1 = await prisma.plot.create({ data: { estateId: estateA1.id, plotNumber: 'PC1', prototype: 'Type 1', size: 500, price: 10000000 } });

        // Create a Lead (Owned by Marketer A1)
        leadA1 = await prisma.lead.create({ data: { fullName: 'Client X', email: 'x@x.com', phone: '000', companyId: companyA.id, branchId: branchA1.id, assignedToUserId: marketerA1.id } });
    });

    afterAll(async () => {
        // --- TEARDOWN --- 
        // We delete everything associated with TEST_COMPANY_ABBR
        await prisma.payment.deleteMany({ where: { sale: { lead: { company: { abbreviation: TEST_COMPANY_ABBR } } } } });
        await prisma.sale.deleteMany({ where: { lead: { company: { abbreviation: TEST_COMPANY_ABBR } } } });
        await prisma.lead.deleteMany({ where: { company: { abbreviation: TEST_COMPANY_ABBR } } });
        await prisma.plot.deleteMany({ where: { estate: { company: { abbreviation: TEST_COMPANY_ABBR } } } });
        await prisma.estate.deleteMany({ where: { company: { abbreviation: TEST_COMPANY_ABBR } } });
        await prisma.corporateBankAccount.deleteMany({ where: { branch: { company: { abbreviation: TEST_COMPANY_ABBR } } } });
        await prisma.user.deleteMany({ where: { company: { abbreviation: TEST_COMPANY_ABBR } } });
        await prisma.branch.deleteMany({ where: { company: { abbreviation: TEST_COMPANY_ABBR } } });
        await prisma.company.deleteMany({ where: { abbreviation: TEST_COMPANY_ABBR } });
    });

    it('Scenario 1: Direct Sale - Marketer A1 sells Estate A1, client pays into Bank A1', async () => {
        const res = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${tokenA1_Marketer}`)
            .send({
                leadId: leadA1.id,
                plotId: plotA1.id,
                agreedPrice: 10000000
            });
        
        expect(res.status).toBe(201);
        directSale = res.body;

        const payRes = await request(app)
            .post(`/api/sales/${directSale.id}/payments`)
            .set('Authorization', `Bearer ${tokenA1_Marketer}`)
            .field('amount', 1000000)
            .field('method', 'BANK_TRANSFER')
            .field('accountPaidTo', 'Bank A1 - 111')
            .field('userId', marketerA1.id)
            .attach('proofs', Buffer.from('dummy'), 'receipt.jpg');
            
        if (payRes.status !== 201) console.error("PAYMENT FAIL 1", payRes.body);
        expect(payRes.status).toBe(201);
        directPayment = payRes.body;

        // Verify receiving branch logic
        expect(directPayment.receivingBranchId).toBe(branchA1.id);
        
        // Verify MD sees it as 'Direct'
        const mdRes = await request(app)
            .get(`/api/payments/pending`)
            .set('Authorization', `Bearer ${tokenA1_MD}`);
        
        const saleInPending = mdRes.body.directSales.find((p: any) => p.id === directPayment.id);
        expect(saleInPending).toBeDefined();
        
        // MD A1 approves it
        const approveRes = await request(app)
            .put(`/api/payments/${directPayment.id}/status`)
            .set('Authorization', `Bearer ${tokenA1_MD}`)
            .send({
                status: 'APPROVED',
                rejectionReason: null
            });
        expect(approveRes.status).toBe(200);
    });

    it('Scenario 2: Outbound Cross-Sale - Marketer A1 sells Estate B1, client pays into Bank B1', async () => {
        const res = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${tokenA1_Marketer}`)
            .send({
                leadId: leadA1.id,
                plotId: plotB1.id,
                agreedPrice: 20000000
            });
        
        expect(res.status).toBe(201);
        outboundSale = res.body;

        const payRes = await request(app)
            .post(`/api/sales/${outboundSale.id}/payments`)
            .set('Authorization', `Bearer ${tokenA1_Marketer}`)
            .field('amount', 5000000)
            .field('method', 'BANK_TRANSFER')
            .field('accountPaidTo', 'Bank B1 - 222')
            .field('userId', marketerA1.id)
            .attach('proofs', Buffer.from('dummy'), 'receipt.jpg');
            
        if (payRes.status !== 201) console.error("PAYMENT FAIL 2", payRes.body);
        expect(payRes.status).toBe(201);
        outboundPayment = payRes.body;

        expect(outboundPayment.receivingBranchId).toBe(branchB1.id);

        // Verification 1: Selling MD (A1) does NOT approve this, but Managing MD (B1) DOES.
        // Selling MD sees it in their "Outbound" history but it is pending Bank/MD B1 approval.
        const mdB1Res = await request(app)
            .get(`/api/payments/pending`)
            .set('Authorization', `Bearer ${tokenB1_MD}`);
        
        const pendingForB1 = mdB1Res.body.inboundCrossSales.find((p: any) => p.id === outboundPayment.id);
        expect(pendingForB1).toBeDefined(); // B1 manages the property, so B1 approves the payment

        // Verify Bank branch confirmation
        expect(pendingForB1.bankBranchConfirmation).toBe('PENDING');
        // Since B1 owns the bank account AND manages the property, B1 is the one who confirms the bank receipt.
        
        // B1 Approves it
        const approveRes = await request(app)
            .put(`/api/payments/${outboundPayment.id}/status`)
            .set('Authorization', `Bearer ${tokenB1_MD}`)
            .send({
                status: 'APPROVED',
                rejectionReason: null
            });
        
        expect(approveRes.status).toBe(200);
    });

    it('Scenario 3: Bank Confirmation Check - Marketer A1 sells Estate A1, client pays into Bank C1', async () => {
        // Here, the managing branch is A1, but the money went into Bank C1.
        // MD A1 should NOT be able to approve immediately, they must wait for MD C1 to confirm 'Bank Receipt'.
        const res = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${tokenA1_Marketer}`)
            .send({
                leadId: leadA1.id,
                plotId: plotC1.id,
                agreedPrice: 10000000
            });
        
        expect(res.status).toBe(201);
        mismatchedSale = res.body;

        const payRes = await request(app)
            .post(`/api/sales/${mismatchedSale.id}/payments`)
            .set('Authorization', `Bearer ${tokenA1_Marketer}`)
            .field('amount', 2000000)
            .field('method', 'BANK_TRANSFER')
            .field('accountPaidTo', 'Bank C1 - 333')
            .field('userId', marketerA1.id)
            .attach('proofs', Buffer.from('dummy'), 'receipt.jpg');
            
        if (payRes.status !== 201) console.error("PAYMENT FAIL 3", payRes.body);
        expect(payRes.status).toBe(201);
        mismatchedPayment = payRes.body;

        // Verify it requires bank confirmation
        expect(mismatchedPayment.bankBranchConfirmation).toBe('PENDING');
        expect(mismatchedPayment.receivingBranchId).toBe(branchC1.id);
    });

    it('Scenario 4: Commission Ownership (Requisitions)', async () => {
        // Outbound Payment was APPROVED by B1 in Scenario 2.
        // Since Bank B1 received the cash, the commission should be visible to Accountant B1, NOT Accountant A1.
        
        const reqA1 = await request(app)
            .get('/api/requisitions/pending-commissions')
            .set('Authorization', `Bearer ${tokenA1_Accountant}`);
            
        const reqB1 = await request(app)
            .get('/api/requisitions/pending-commissions')
            .set('Authorization', `Bearer ${tokenB1_Accountant}`);

        const commissionInB1 = reqB1.body.find((p: any) => p.id === outboundPayment.id);
        const commissionInA1 = reqA1.body.find((p: any) => p.id === outboundPayment.id);

        expect(commissionInB1).toBeDefined(); // B1 holds the cash, B1 pays the commission
        expect(commissionInA1).toBeUndefined(); // A1 does not pay it
    });

    it('Scenario 5: Analytics Dashboard (Cash vs Volume)', async () => {
        // Check Branch A1's Dashboard
        const kpiResA1 = await request(app)
            .get(`/api/analytics/reports/md?branchId=${branchA1.id}`)
            .set('Authorization', `Bearer ${tokenA1_MD}`);
        
        const kpisA1 = kpiResA1.body.kpis;

        // Total Sales Generated: Direct(10M) + Outbound(20M) + Mismatched(10M) = 40M (Wait, outbound was 20M, mismatched was 10M)
        // But only Direct(1M) went into A1's Bank. Mismatched(2M) went to C1.
        expect(kpisA1.grossCashReceived).toBe(1000000);
        expect(kpisA1.directSalesVolume).toBeGreaterThan(0);
        expect(kpisA1.outboundSalesVolume).toBeGreaterThan(0);

        // Check Branch B1's Dashboard
        const analyticsB1 = await request(app)
            .get(`/api/analytics/reports/md?branchId=${branchB1.id}`)
            .set('Authorization', `Bearer ${tokenB1_MD}`);
        
        const kpisB1 = analyticsB1.body.kpis;
        // B1 didn't sell anything directly, but received an inbound cross sale of 20M volume, and got 5M cash.
        expect(kpisB1.grossCashReceived).toBe(5000000);
        expect(kpisB1.inboundSalesVolume).toBeGreaterThan(0);
        expect(kpisB1.totalSalesGenerated).toBe(0); // They didn't generate the sale
    });

});
