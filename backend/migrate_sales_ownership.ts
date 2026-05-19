import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting data migration for Sale marketerId...");
    
    // Find all sales that don't have a marketerId yet
    const sales = await prisma.sale.findMany({
        where: { marketerId: null },
        include: { lead: true }
    });

    console.log(`Found ${sales.length} sales to migrate.`);

    let migrated = 0;
    for (const sale of sales) {
        if (sale.lead.assignedToUserId) {
            await prisma.sale.update({
                where: { id: sale.id },
                data: { marketerId: sale.lead.assignedToUserId }
            });
            migrated++;
        }
    }

    console.log(`Successfully migrated ${migrated} sales.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
