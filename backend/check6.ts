import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

async function main() {
    const prisma = new PrismaClient();
    const target = await prisma.user.findFirst({ where: { role: 'BRANCH_ADMIN' } });

    const targetToken = jwt.sign(
        { userId: target.id, role: target.role, companyId: target.companyId, branchId: target.branchId },
        'your-super-secret-jwt-key-change-this-in-production'
    );

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
