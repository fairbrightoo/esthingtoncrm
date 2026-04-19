import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function run() {
  const c = await prisma.company.findFirst({ where: { name: 'Double King Estate Ltd' }});
  const b = await prisma.branch.findFirst({ where: { companyId: c!.id, name: 'Garki' }});
  if (!c || !b) return console.log('Company or branch not found');

  const pw = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'accountant_garki@doubleking.com' },
    update: {},
    create: {
      email: 'accountant_garki@doubleking.com',
      fullName: 'Accountant (Garki)',
      passwordHash: pw,
      role: 'ACCOUNTANT',
      companyId: c.id,
      branchId: b.id,
      dateOfBirth: new Date()
    }
  });
  console.log('Accountant created:', user.email);
}
run();
