import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  
  for (const company of companies) {
    if (company.name.toLowerCase().includes('double king')) {
      await prisma.company.update({
        where: { id: company.id },
        data: { smsSenderId: 'Double King' }
      });
      console.log(`Updated ${company.name} with sender ID 'Double King'`);
    } else if (company.name.toLowerCase().includes('neft')) {
        await prisma.company.update({
            where: { id: company.id },
            data: { smsSenderId: 'NEFT' }
        });
        console.log(`Updated ${company.name} with sender ID 'NEFT'`);
    } else if (company.name.toLowerCase().includes('esthington')) {
        // Assuming Esthington might use NEFT or we just leave it if not matched.
        // I will just print it out.
        console.log(`Found ${company.name}, not touching unless requested.`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
