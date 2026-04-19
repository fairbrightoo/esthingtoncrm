import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'garki@doubleking.com' },
        select: { email: true, role: true, companyId: true, branchId: true }
    });
    console.log('--- USER CHECK ---');
    console.log(user);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
