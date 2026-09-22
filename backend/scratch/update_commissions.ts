import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting commission rate update...");

    const rolesToUpdate = [
        'BRANCH_ADMIN', 
        'BRANCH_HR', 
        'GENERAL_MANAGER', 
        'MANAGING_DIRECTOR', 
        'HEAD_BDD', 
        'BDM', 
        'TEAM_LEAD',
        'GROUP_MANAGING_DIRECTOR',
        'ACCOUNTANT',
        'GLOBAL_ACCOUNTANT'
    ];

    const result = await prisma.user.updateMany({
        where: {
            role: { in: rolesToUpdate },
            commissionRate: { lte: 5.0 }
        },
        data: {
            commissionRate: 10.0
        }
    });

    console.log(`Updated ${result.count} users in management roles with commission <= 5% to 10%`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
