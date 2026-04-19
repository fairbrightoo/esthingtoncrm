import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { branch: { name: { contains: 'Garki' } }, role: { in: ['BRANCH_ADMIN', 'SUPER_ADMIN'] } },
        include: { branch: true, company: true }
    });
    console.log("=== Garki Admins/MDs ===");
    for(const u of users) {
        console.log(`Email: ${u.email} | Role: ${u.role} | Branch: ${u.branch?.name} | Company: ${u.company?.name}`);
    }
}

main().finally(() => prisma.$disconnect());
