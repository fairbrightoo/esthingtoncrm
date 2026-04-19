import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    await prisma.user.deleteMany({
        where: { role: 'BRANCH_HR' }
    });

    console.log("Deleted existing HR users.");
    
    // Find Garki branch
    const branch = await prisma.branch.findFirst({
        where: { name: 'Garki' }
    });

    if (!branch) {
        console.log("Could not find Garki Branch!");
        return;
    }

    const hashedPassword = await bcrypt.hash('HR@password123', 10);

    const newHr = await prisma.user.create({
        data: {
            email: 'hr_garki@doubleking.com',
            fullName: 'Garki HR Admin',
            passwordHash: hashedPassword,
            role: 'BRANCH_HR',
            companyId: branch.companyId,
            branchId: branch.id,
            passwordResetRequired: false
        }
    });

    console.log("Created Default HR User:");
    console.log("Email: hr_garki@doubleking.com");
    console.log("Password: HR@password123");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
