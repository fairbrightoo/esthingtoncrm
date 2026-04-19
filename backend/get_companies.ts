import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  let out = "";
  for (const c of companies) {
    out += `ID: ${c.id} | Name: ${c.name} | SenderID: ${c.smsSenderId}\n`;
  }
  fs.writeFileSync('companies.txt', out);
}

main().catch(console.error).finally(() => prisma.$disconnect());
