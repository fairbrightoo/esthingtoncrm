import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    const template = await prisma.documentTemplate.findFirst({
        where: { type: 'PROVISIONAL_ALLOCATION' }
    });
    if (template) {
        fs.writeFileSync('temp_template.html', template.content);
    }
}
main().finally(() => prisma.$disconnect());
