import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('Injecting Esthington Group HQ and Global Chairman...');

    // 1. Create or find HQ Company
    let hqCompany = await prisma.company.findUnique({
        where: { name: 'Esthington Group HQ' }
    });

    if (!hqCompany) {
        hqCompany = await prisma.company.create({
            data: {
                name: 'Esthington Group HQ',
                email: 'chairman@esthington.com',
                phone: '+2340000000000',
                address: 'Esthington HQ, Global',
                themeColor: '#111827', // Premium dark theme
                managingDirectorName: 'Global Chairman'
            }
        });
        console.log('Created HQ Company:', hqCompany.id);
    } else {
        console.log('HQ Company already exists:', hqCompany.id);
    }

    // 2. Create HQ Branch (for any branch-specific relationships that might be needed, though Chairman leads can just use companyId)
    let hqBranch = await prisma.branch.findFirst({
        where: { name: 'Group HQ Branch', companyId: hqCompany.id }
    });

    if (!hqBranch) {
        hqBranch = await prisma.branch.create({
            data: {
                name: 'Group HQ Branch',
                companyId: hqCompany.id,
                email: 'chairman@esthington.com',
                managerName: 'Global Chairman'
            }
        });
        console.log('Created HQ Branch:', hqBranch.id);
    }

    // 3. Create or find Global Chairman User
    let chairman = await prisma.user.findUnique({
        where: { email: 'chairman@esthington.com' }
    });

    if (!chairman) {
        const passwordHash = await bcrypt.hash('esthington2026', 10);
        chairman = await prisma.user.create({
            data: {
                email: 'chairman@esthington.com',
                fullName: 'Global Chairman',
                role: 'GLOBAL_CHAIRMAN',
                passwordHash,
                isActive: true,
                companyId: hqCompany.id,
                branchId: hqBranch.id
            }
        });
        console.log('Created Global Chairman User:', chairman.email, 'Password: esthington2026');
    } else {
        console.log('Global Chairman User already exists:', chairman.email);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
