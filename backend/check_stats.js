import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({ where: { fullName: { contains: 'Bethel' } }, include: { ledTeam: { include: { members: true } } } });
    for (const member of user.ledTeam.members) {
        const sales = await prisma.sale.aggregate({ where: { lead: { assignedToUserId: member.id } }, _sum: { totalPaid: true } });
        console.log(member.fullName, 'Sales:', sales._sum.totalPaid);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
