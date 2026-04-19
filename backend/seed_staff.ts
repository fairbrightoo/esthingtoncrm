import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('=== SEEDING DEMO STAFF ===');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const garkiBranch = await prisma.branch.findFirst({ where: { name: 'Garki' } });
    if (garkiBranch) {
        const staffList = [
            { email: 'staff1@garki.com', fullName: 'John Marketer', role: 'MARKETER' },
            { email: 'staff2@garki.com', fullName: 'Jane Sales', role: 'MARKETER' },
            { email: 'staff3@garki.com', fullName: 'Peter Prospect', role: 'MARKETER' }
        ];

        for (const staff of staffList) {
            await prisma.user.upsert({
                where: { email: staff.email },
                update: {},
                create: {
                    ...staff,
                    passwordHash: hashedPassword,
                    branchId: garkiBranch.id,
                    companyId: garkiBranch.companyId
                }
            });
        }
        console.log(`✅ Seeded ${staffList.length} staff to Garki branch.`);
    }

    const utakoBranch = await prisma.branch.findFirst({ where: { name: 'Utako' } });
    if (utakoBranch) {
        const staffList = [
            { email: 'staff1@utako.com', fullName: 'Michael Seller', role: 'MARKETER' },
            { email: 'staff2@utako.com', fullName: 'Sarah Closer', role: 'MARKETER' }
        ];

        for (const staff of staffList) {
            await prisma.user.upsert({
                where: { email: staff.email },
                update: {},
                create: {
                    ...staff,
                    passwordHash: hashedPassword,
                    branchId: utakoBranch.id,
                    companyId: utakoBranch.companyId
                }
            });
        }
        console.log(`✅ Seeded ${staffList.length} staff to Utako branch.`);
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
