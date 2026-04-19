import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const companies = [
    { name: 'Double King Estate Ltd', themeColor: '#1e3a8a' }, // Blue
    { name: 'Double Grace', themeColor: '#059669' }, // Green
    { name: 'Champions Properties Ltd', themeColor: '#b91c1c' }, // Red
    { name: 'Neft Properties Ltd', themeColor: '#d97706' }, // Amber
    { name: 'Top Rank Global Project Ltd', themeColor: '#7c3aed' }, // Purple
    { name: 'Esthington Links Ltd', themeColor: '#db2777' }, // Pink
];
async function main() {
    console.log('Start seeding...');
    for (const c of companies) {
        // Upsert companies to ensure they exist but don't duplicate unique names
        const company = await prisma.company.upsert({
            where: { name: c.name },
            update: {},
            create: {
                name: c.name,
                themeColor: c.themeColor,
            },
        });
        console.log(`Created/Found company: ${company.name} (${company.id})`);
        // Specifically for Double King Estate Ltd, add branches
        if (c.name === 'Double King Estate Ltd') {
            const branches = ['Utako', 'Garki', 'Gwarimpa', 'Kuje'];
            for (const bName of branches) {
                await prisma.branch.create({
                    data: {
                        name: bName,
                        address: `123 ${bName} District, Abuja`,
                        companyId: company.id
                    }
                });
                console.log(` - Added branch: ${bName}`);
            }
        }
    }
    console.log('Seeding finished.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map