import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const res = await prisma.payment.updateMany({
        where: { method: 'BANK_TRANSFER' },
        data: { method: 'TRANSFER' }
    });
    console.log(`Updated ${res.count} payments.`);
}

run().finally(() => prisma.$disconnect());
