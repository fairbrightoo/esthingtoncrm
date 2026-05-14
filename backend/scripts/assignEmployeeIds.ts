import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany({ include: { branches: true } });
    
    for (const company of companies) {
        // Find users in company who don't have a branch (Head Office)
        const headOfficeUsers = await prisma.user.findMany({
            where: { companyId: company.id, branchId: null },
            orderBy: { createdAt: 'asc' }
        });
        
        let companyCounter = 2; // starting counter for others
        const companyAbbr = company.abbreviation || 'DKEL';

        let gmdCount = 1;

        for (const user of headOfficeUsers) {
            let employeeId = '';
            if (user.role === 'GROUP_MANAGING_DIRECTOR') {
                employeeId = `${companyAbbr}/GMD/${String(gmdCount).padStart(3, '0')}`;
                gmdCount++;
            } else if (user.role === 'SUPER_ADMIN') {
                employeeId = `${companyAbbr}/SA/${String(companyCounter).padStart(3, '0')}`;
                companyCounter++;
            } else {
                employeeId = `${companyAbbr}/${String(companyCounter).padStart(3, '0')}`;
                companyCounter++;
            }
            
            // Check uniqueness
            const existing = await prisma.user.findUnique({ where: { employeeId } });
            if (existing && existing.id !== user.id) {
                employeeId = `${employeeId}-${user.id.substring(0,4)}`;
            }

            await prisma.user.update({ where: { id: user.id }, data: { employeeId } });
        }
        await prisma.company.update({ where: { id: company.id }, data: { employeeCounter: companyCounter } });

        // Branches
        for (const branch of company.branches) {
            const branchUsers = await prisma.user.findMany({
                where: { branchId: branch.id },
                orderBy: { createdAt: 'asc' }
            });
            
            let branchCounter = 3; // 1 and 2 reserved for MD and GM
            const branchAbbr = branch.abbreviation || branch.name.substring(0, 3).toUpperCase();
            
            let mdCount = 1;
            let gmCount = 2;

            for (const user of branchUsers) {
                let employeeId = '';
                if (user.role === 'MANAGING_DIRECTOR') {
                    employeeId = `${companyAbbr}/${branchAbbr}/${String(mdCount).padStart(3, '0')}`;
                    mdCount = mdCount === 1 ? 100 : mdCount + 1; // if multiple MDs, fallback to 100+
                } else if (user.role === 'GENERAL_MANAGER') {
                    employeeId = `${companyAbbr}/${branchAbbr}/${String(gmCount).padStart(3, '0')}`;
                    gmCount = gmCount === 2 ? 100 : gmCount + 1; 
                } else {
                    employeeId = `${companyAbbr}/${branchAbbr}/${String(branchCounter).padStart(3, '0')}`;
                    branchCounter++;
                }
                
                // Check uniqueness
                const existing = await prisma.user.findUnique({ where: { employeeId } });
                if (existing && existing.id !== user.id) {
                    employeeId = `${employeeId}-${user.id.substring(0,4)}`;
                }

                await prisma.user.update({ where: { id: user.id }, data: { employeeId } });
            }
            await prisma.branch.update({ where: { id: branch.id }, data: { employeeCounter: branchCounter } });
        }
    }
    console.log('Employee IDs assigned successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
