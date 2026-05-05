import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

async function main() {
    const prisma = new PrismaClient();
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    const target = await prisma.user.findFirst({ where: { role: 'BRANCH_ADMIN' } });

    const adminToken = jwt.sign(
        { userId: admin.id, role: admin.role, companyId: admin.companyId, branchId: admin.branchId },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
    );

    try {
        const res = await axios.post(`http://localhost:3000/api/users/global/${target.id}/impersonate`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log("Response User:", JSON.stringify(res.data.user, null, 2));
    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    }
    prisma.$disconnect();
}
main();
