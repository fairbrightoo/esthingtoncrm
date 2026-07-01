import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Testing attendance query...");
        await prisma.attendance.findMany({
            where: { userId: "test" },
            take: 1
        });
        
        console.log("Testing lead query...");
        await prisma.lead.count({
            where: { assignedToUserId: "test" }
        });
        
        console.log("Testing payment query...");
        await prisma.payment.findMany({
            where: { status: 'APPROVED', sale: { marketerId: "test" } },
            take: 1
        });

        console.log("Testing getPendingPayments query components...");
        const companyId = "test";
        const company = await prisma.company.findUnique({ where: { id: companyId }, select: { hoDelegatesPayments: true } });
        
        const branchId = "test";
        const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { isHeadOffice: true } });

        console.log("All queries executed successfully.");
    } catch (e: any) {
        console.error("Prisma error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
