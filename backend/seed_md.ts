import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('=== SEEDING MANAGING DIRECTOR ===');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const garkiBranch = await prisma.branch.findFirst({ where: { name: 'Garki' } });
    
    if (garkiBranch) {
        const mdEmail = 'md@doubleking.com'; // Or md.garki@doubleking.com
        await prisma.user.upsert({
            where: { email: mdEmail },
            update: {
                role: 'MANAGING_DIRECTOR',
                branchId: garkiBranch.id,
                companyId: garkiBranch.companyId
            },
            create: {
                email: mdEmail,
                fullName: 'Managing Director',
                passwordHash: hashedPassword,
                role: 'MANAGING_DIRECTOR',
                branchId: garkiBranch.id,
                companyId: garkiBranch.companyId,
                phone: '08100000000'
            }
        });
        console.log(`✅ Created MD account: ${mdEmail}`);
    } else {
        console.log('Garki branch not found.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
