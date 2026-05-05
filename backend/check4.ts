import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

async function main() {
    const prisma = new PrismaClient();
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    const target = await prisma.user.findFirst({ where: { role: 'BRANCH_ADMIN' } });

    // Simulate the impersonation payload from my fix
    const targetToken = jwt.sign(
        { userId: target.id, role: target.role, companyId: target.companyId, branchId: target.branchId },
        process.env.JWT_SECRET || 'secret' // Test with the standard secret
    );

    // Call getBranchUsers
    const url1 = `https://esthington-os-backend.onrender.com/api/companies/${target.companyId}/branches/${target.branchId}/users`;
    try {
        const res1 = await axios.get(url1, { headers: { Authorization: `Bearer ${targetToken}` } });
        console.log(`Branch Users API (${url1}):`, res1.data.length);
    } catch(e) {
        console.log(`Branch Users API Error:`, e.response?.status, e.response?.data);
    }

    // Call getLeads
    const url2 = `https://esthington-os-backend.onrender.com/api/leads`;
    try {
        const res2 = await axios.get(url2, { headers: { Authorization: `Bearer ${targetToken}` } });
        console.log(`Leads API (${url2}):`, res2.data.length);
    } catch(e) {
        console.log(`Leads API Error:`, e.response?.status, e.response?.data);
    }

    prisma.$disconnect();
}

main();
