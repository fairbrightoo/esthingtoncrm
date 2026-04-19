import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const branch = await prisma.branch.findFirst({
        where: { name: 'Garki' },
        include: { company: true }
    });

    if (!branch) {
        console.error('Garki branch not found!');
        return;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);
    const email = 'garki@doubleking.com';

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            fullName: 'Garki Branch Manager',
            passwordHash: hashedPassword,
            role: 'BRANCH_ADMIN',
            companyId: branch.companyId,
            branchId: branch.id,
            phone: '08001234567'
        }
    });

    console.log(`User created: ${user.email} for Branch: ${branch.name}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
