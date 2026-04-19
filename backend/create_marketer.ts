import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany();
    const company = companies.find(c => c.name.toLowerCase().includes('double king'));

    if (!company) {
        console.log("JSON_OUTPUT: " + JSON.stringify({ error: "Double King company not found" }));
        return;
    }

    const branches = await prisma.branch.findMany({ where: { companyId: company.id } });
    const branch = branches.find(b => b.name.toLowerCase().includes('garki'));

    if (!branch) {
        console.log("JSON_OUTPUT: " + JSON.stringify({ error: "Garki branch not found" }));
        return;
    }

    // Check for MARKETER
    let marketer = await prisma.user.findFirst({
        where: { role: 'MARKETER', branchId: branch.id }
    });

    if (marketer) {
        const passwordHash = await bcrypt.hash('Marketer@123', 10);
        marketer = await prisma.user.update({
            where: { id: marketer.id },
            data: { passwordHash }
        });
        console.log("JSON_OUTPUT: " + JSON.stringify({ email: marketer.email, password: "Marketer@123", action: "Found and Reset Password" }));
    } else {
        const passwordHash = await bcrypt.hash('Marketer@123', 10);
        marketer = await prisma.user.create({
            data: {
                fullName: 'Test Marketer (Garki)',
                email: 'marketer_garki@doubleking.com',
                passwordHash,
                role: 'MARKETER',
                companyId: company.id,
                branchId: branch.id
            }
        });
        console.log("JSON_OUTPUT: " + JSON.stringify({ email: marketer.email, password: "Marketer@123", action: "Created" }));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
