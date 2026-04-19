
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('=== SEEDING CUSTOMER CARE USER ===');

    const company = await prisma.company.findUnique({ where: { name: 'Double King Estate Ltd' } });
    if (!company) throw new Error('Double King not found');

    const branch = await prisma.branch.findFirst({
        where: { companyId: company.id, name: 'Garki' }
    });
    if (!branch) throw new Error('Garki Branch not found');

    const email = 'cc_garki@doubleking.com';
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash: hashedPassword // Force update password
        },
        create: {
            email,
            fullName: 'Sarah (Customer Care)',
            passwordHash: hashedPassword,
            role: 'CUSTOMER_CARE',
            companyId: company.id,
            branchId: branch.id,
            phone: '08122334455'
        }
    });

    console.log(`✅ Created Customer Care User: ${email}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
