import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log("=== SUPER ADMINS ===");
    const users = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        include: { company: true }
    });
    for(const u of users) {
        console.log(`Email: ${u.email} | Role: ${u.role} | Company: ${u.company?.name || 'N/A'}`);
    }
}
main();
