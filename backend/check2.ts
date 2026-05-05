import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findFirst({ where: { role: 'BRANCH_ADMIN' } });
  console.log('Branch Admin:', JSON.stringify(u, null, 2));
}

main().finally(() => prisma.$disconnect());
