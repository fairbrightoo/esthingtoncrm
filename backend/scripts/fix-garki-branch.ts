import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Find the Garki branch
    const branch = await prisma.branch.findFirst({
        where: { name: { contains: 'Garki' } }
    });

    if (!branch) {
        console.error('Garki branch not found!');
        return;
    }

    console.log('Found branch:', branch);

    // 2. Update the user
    const user = await prisma.user.update({
        where: { email: 'garki@doubleking.com' },
        data: { branchId: branch.id }
    });

    console.log('Updated user:', user);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
