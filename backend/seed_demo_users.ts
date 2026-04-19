
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const companies = [
    { name: 'Double King Estate Ltd', alias: 'doubleking' },
    { name: 'Double Grace', alias: 'doublegrace' },
    { name: 'Champions Properties Ltd', alias: 'champions' },
    { name: 'Neft Properties Ltd', alias: 'neft' },
    { name: 'Top Rank Global Project Ltd', alias: 'toprank' },
    { name: 'Esthington Links Ltd', alias: 'esthingtonlinks' },
];

async function main() {
    console.log('=== SEEDING DEMO USERS ===');
    const hashedPassword = await bcrypt.hash('password123', 10);

    for (const c of companies) {
        // Find Company
        const company = await prisma.company.findUnique({ where: { name: c.name } });
        if (!company) {
            console.log(`Skipping ${c.name} (Not found)`);
            continue;
        }

        let branches = await prisma.branch.findMany({ where: { companyId: company.id } });

        // If no branches, create Head Office
        if (branches.length === 0) {
            console.log(`[${c.name}] No branches found. Creating 'Head Office'.`);
            const headOffice = await prisma.branch.create({
                data: {
                    name: 'Head Office',
                    address: 'Corporate Headquarters, Abuja',
                    companyId: company.id
                }
            });
            branches = [headOffice];
        }

        // Ensure Admin for EACH Branch
        for (const branch of branches) {
            // Generate email: branchName@companyAlias.com (e.g. utako@doubleking.com, headoffice@neft.com)
            const branchSlug = branch.name.toLowerCase().replace(/\s+/g, '');
            const email = `${branchSlug}@${c.alias}.com`;

            await prisma.user.upsert({
                where: { email },
                update: {
                    passwordHash: hashedPassword, // Reset password if exists
                    branchId: branch.id,
                    companyId: company.id,
                    role: 'BRANCH_ADMIN'
                },
                create: {
                    email,
                    fullName: `${branch.name} Admin`,
                    passwordHash: hashedPassword,
                    role: 'BRANCH_ADMIN',
                    companyId: company.id,
                    branchId: branch.id,
                    phone: '08000000000'
                }
            });
            console.log(`✅ Created/Updated: ${email} -> [${c.name} - ${branch.name}]`);
        }
    }
    console.log('\nDone! All passwords are: password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
