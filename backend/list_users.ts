import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function renderUsers() {
    const users = await prisma.user.findMany({
        include: { company: true, branch: true }
    });

    const lines = users.map(u => {
        const companyName = u.company ? u.company.name : 'Global';
        const branchName = u.branch ? u.branch.name : 'HQ';
        return `${u.email}  |  ${u.role}  |  ${companyName} (${branchName})`;
    });

    fs.writeFileSync('users.txt', '=== CURRENT ESTHINGTON ACCOUNTS ===\n\n' + lines.join('\n'));
    console.log("DONE");
}

renderUsers();
