import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const sales = await prisma.sale.findMany({
    where: { lead: { phone: { in: ['08065683461', '09032838589', '+2348065683461', '+2349032838589'] } } },
    include: { lead: true, marketer: true }
  });
  console.log(JSON.stringify(sales, null, 2));
}
run().finally(() => prisma.$disconnect());
