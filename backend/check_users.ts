import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, role: true, companyId: true, branchId: true, passwordHash: true }
    });
    console.log('Users in DB:', users);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
