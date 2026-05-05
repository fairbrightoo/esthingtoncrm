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

    // Mock an Express request since we aren't hitting the server
    // Actually, since I am not running the server locally, let's just test Prisma queries
    // as if the backend code was running
    
    // Test what targetUser JWT payload has
    const tokenPayload = {
        userId: target.id,
        email: target.email,
        role: target.role,
        companyId: target.companyId,
        branchId: target.branchId
    };
    console.log("Token payload has companyId?", !!tokenPayload.companyId);
    console.log("Token payload has branchId?", !!tokenPayload.branchId);

    // Test getBranchUsers prisma query
    const companyId = target.companyId;
    const branchId = target.branchId;
    const users = await prisma.user.findMany({
        where: {
            companyId,
            branchId
        },
        select: {
            id: true,
            fullName: true,
            role: true
        }
    });
    console.log("Users returned for branch admin:", users.length);

    // Test getLeads query
    let whereClause = {
        companyId: target.companyId,
        branchId: target.branchId
    };
    const leads = await prisma.lead.findMany({ where: whereClause });
    console.log("Leads returned for branch admin:", leads.length);

    prisma.$disconnect();
}
main();
