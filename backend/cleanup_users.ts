
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up obsolete users...');

    // Delete the incorrect 'esthington.com' user
    const deleted = await prisma.user.deleteMany({
        where: {
            email: 'headoffice@esthington.com'
        }
    });

    console.log(`Deleted ${deleted.count} obsolete user(s).`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
