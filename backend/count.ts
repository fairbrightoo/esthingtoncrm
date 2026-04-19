import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log("Users:", await prisma.user.count());
    console.log("Leads:", await prisma.lead.count());
    console.log("Estates:", await prisma.estate.count());
}
main();
