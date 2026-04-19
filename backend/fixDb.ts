import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    await prisma.user.updateMany({ data: { isActive: true } });
    console.log('Fixed DB isActive flags');
}
run().catch(console.error).finally(() => prisma.$disconnect());
