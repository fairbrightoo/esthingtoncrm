import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // find company Double King Estate Ltd
    const companies = await prisma.company.findMany();
    const company = companies.find(c => c.name.toLowerCase().includes('double king'));

    if (!company) {
        console.log("JSON_OUTPUT: " + JSON.stringify({ error: "Double King company not found" }));
        return;
    }

    // find Garki branch
    const branches = await prisma.branch.findMany({ where: { companyId: company.id } });
    const branch = branches.find(b => b.name.toLowerCase().includes('garki'));

    if (!branch) {
        console.log("JSON_OUTPUT: " + JSON.stringify({ error: "Garki branch not found" }));
        return;
    }

    // Check for MD
    let md = await prisma.user.findFirst({
        where: { role: 'MANAGING_DIRECTOR', branchId: branch.id }
    });

    if (md) {
        // If it exists, update the password to be safe so the user can definitely log in
        const passwordHash = await bcrypt.hash('MD@password123', 10);
        md = await prisma.user.update({
            where: { id: md.id },
            data: { passwordHash }
        });
        console.log("JSON_OUTPUT: " + JSON.stringify({ email: md.email, password: "MD@password123", action: "Found and Reset Password" }));
    } else {
        const passwordHash = await bcrypt.hash('MD@password123', 10);
        md = await prisma.user.create({
            data: {
                fullName: 'Managing Director (Garki)',
                email: 'md_garki@doubleking.com',
                passwordHash,
                role: 'MANAGING_DIRECTOR',
                companyId: company.id,
                branchId: branch.id
            }
        });
        console.log("JSON_OUTPUT: " + JSON.stringify({ email: md.email, password: "MD@password123", action: "Created" }));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
