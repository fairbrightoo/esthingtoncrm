import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log("=== ALL USERS ===");
    const users = await prisma.user.findMany({
        include: { branch: true, company: true }
    });
    for(const u of users) {
        console.log(`Email: ${u.email} | Role: ${u.role} | Branch: ${u.branch?.name} | Company: ${u.company?.name}`);
    }
}
main();
