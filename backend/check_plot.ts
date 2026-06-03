import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const plot = await prisma.plot.findFirst({
        where: { plotNumber: 'D002' },
        include: {
            sales: {
                include: {
                    lead: true,
                    marketer: true
                }
            }
        }
    });
    console.log(JSON.stringify(plot, null, 2));
}

run().finally(() => prisma.$disconnect());
