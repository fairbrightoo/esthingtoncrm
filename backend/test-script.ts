import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Testing Global Analytics Logic...");
        
        let dateFilter: any = {};
        
        const allCompanies = await prisma.company.findMany({
            include: { branches: true }
        });
        
        console.log("Companies:", allCompanies.length);

        const payments = await prisma.payment.findMany({
            where: {
                status: 'APPROVED',
                ...(dateFilter.gte && { date: dateFilter })
            },
            include: {
                sale: {
                    include: { lead: { select: { id: true, companyId: true, branchId: true } } }
                }
            }
        });
        
        console.log("Payments:", payments.length);

        const leads = await prisma.lead.findMany({
            where: dateFilter.gte ? { createdAt: dateFilter } : {},
            select: { id: true, companyId: true, branchId: true }
        });
        
        console.log("Leads:", leads.length);

        const recentActivities = await prisma.activity.findMany({
            take: 10,
            orderBy: { timestamp: 'desc' },
            include: {
                createdByUser: {
                    select: {
                        fullName: true,
                        role: true,
                    }
                },
                lead: { select: { fullName: true } }
            }
        });
        
        console.log("Activities:", recentActivities.length);
        console.log("SUCCESS");
    } catch (e: any) {
        console.error("ERROR CAUGHT", e.message);
    }
}

run();
