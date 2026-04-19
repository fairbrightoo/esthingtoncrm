import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, role: true, companyId: true }
    });
    console.log('--- USERS IN DB ---');
    console.table(users);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
