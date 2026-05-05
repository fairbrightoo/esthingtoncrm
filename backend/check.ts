import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.findFirst({
    where: { name: 'Garki' },
    include: { users: true, leads: true }
  });
  console.log('Branch:', branch?.name);
  console.log('Staff count:', branch?.users?.length);
  console.log('Lead count:', branch?.leads?.length);
}

main().finally(() => prisma.$disconnect());
