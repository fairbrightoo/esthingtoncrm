import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const companies = [
    { name: 'Double King Estate Ltd', themeColor: '#1e3a8a' }, // Blue
    { name: 'Double Grace', themeColor: '#059669' }, // Green
    { name: 'Champions Properties Ltd', themeColor: '#b91c1c' }, // Red
    { name: 'Neft Properties Ltd', themeColor: '#d97706' }, // Amber
    { name: 'Top Rank Global Project Ltd', themeColor: '#7c3aed' }, // Purple
    { name: 'Esthington Links Ltd', themeColor: '#db2777' }, // Pink
];

async function main() {
    console.log('Start seeding...');

    // 1. Seed Companies
    for (const c of companies) {
        const company = await prisma.company.upsert({
            where: { name: c.name },
            update: {},
            create: {
                name: c.name,
                themeColor: c.themeColor,
            },
        });
        console.log(`Created/Found company: ${company.name}`);

        // 2. Seed Branches (Double King Only)
        if (c.name === 'Double King Estate Ltd') {
            // Ensure branches exist
            // await prisma.branch.deleteMany({ where: { companyId: company.id } }); // Dangerous for existing data

            const branches = ['Utako', 'Garki', 'Gwarimpa', 'Kuje'];

            for (const bName of branches) {
                let branch = await prisma.branch.findFirst({
                    where: { name: bName, companyId: company.id }
                });

                if (!branch) {
                    branch = await prisma.branch.create({
                        data: {
                            name: bName,
                            address: `123 ${bName} District, Abuja`,
                            companyId: company.id
                        }
                    });
                }

                // Create Branch Admin for 'Garki'
                if (bName === 'Garki') {
                    const hashedPassword = await bcrypt.hash('password123', 10);
                    await prisma.user.upsert({
                        where: { email: 'garki@doubleking.com' },
                        update: {}, // Don't update if exists
                        create: {
                            email: 'garki@doubleking.com',
                            fullName: 'Garki Branch Manager',
                            passwordHash: hashedPassword,
                            role: 'BRANCH_ADMIN',
                            companyId: company.id,
                            branchId: branch.id,
                            phone: '08001234567'
                        }
                    });
                    console.log(' - Created Branch Admin: garki@doubleking.com');
                }
            }
            console.log(` - Refreshed branches for Double King`);
        }
    }

    // 3. Create Super Admin User (Linked to Esthington Links Ltd)
    const esthingtonCompany = await prisma.company.findUnique({ where: { name: 'Esthington Links Ltd' } });

    if (esthingtonCompany) {
        const adminEmail = 'admin@esthington.com';
        // Hash password 'password123'
        const hashedPassword = await bcrypt.hash('password123', 10);

        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
                email: adminEmail,
                fullName: 'Super Administrator',
                passwordHash: hashedPassword,
                role: 'SUPER_ADMIN',
                companyId: esthingtonCompany.id,
                phone: '08000000000'
            }
        });
        console.log(`Created Super Admin: ${admin.email} (password123)`);
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
