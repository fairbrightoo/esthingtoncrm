import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const email = undefined;
        console.log("Testing with email:", email);
        const existing = await prisma.lead.findFirst({
            where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone: '123' }] }
        });
        console.log("Success:", existing?.id);
    } catch (e) {
        console.error("Error with undefined:", e);
    }

    try {
        const email2 = null;
        console.log("Testing with email:", email2);
        const existing2 = await prisma.lead.findFirst({
            where: { OR: [{ email: { equals: email2, mode: 'insensitive' } }, { phone: '123' }] }
        });
        console.log("Success:", existing2?.id);
    } catch (e) {
        console.error("Error with null:", e);
    }
}
main().finally(() => prisma.$disconnect());
