import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const defaultBranch = await prisma.branch.findFirst({ where: { name: 'Garki' } });
    if (!defaultBranch) {
        console.log("No Garki Branch found. Checking branches...");
        const branches = await prisma.branch.findMany();
        console.log(branches.map(b => b.name));
        return;
    }

    const { id: branchId, companyId } = defaultBranch;

    const leads = [
        { fullName: "Ismail Lawal", phone: "08123456780", status: "PROSPECT", companyId, branchId },
        { fullName: "Chika Odili", phone: "09087654321", status: "CLIENT", companyId, branchId },
        { fullName: "Amaka Eze", phone: "07088998877", status: "PROSPECT", companyId, branchId },
        { fullName: "Dapo Abiodun", phone: "08011223344", status: "PROSPECT", companyId, branchId },
        { fullName: "Emeka Okafor", phone: "09122334455", status: "CLIENT", companyId, branchId },
    ];

    for (const lead of leads) {
        // Prevent duplicate throws
        const exists = await prisma.lead.findFirst({ where: { phone: lead.phone } });
        if(!exists) await prisma.lead.create({ data: lead });
    }

    console.log("Seeded default mock leads into Garki Branch.");
    
    // Also add to Utako Branch
    const utakoBranch = await prisma.branch.findFirst({ where: { name: 'Utako' } });
    if (utakoBranch) {
        const uLeads = [
            { fullName: "Sani Musa", phone: "08099887766", status: "PROSPECT", companyId: utakoBranch.companyId, branchId: utakoBranch.id },
            { fullName: "Ngozi Obi", phone: "09011223344", status: "PROSPECT", companyId: utakoBranch.companyId, branchId: utakoBranch.id },
            { fullName: "Kalu Orji", phone: "07055443322", status: "PROSPECT", companyId: utakoBranch.companyId, branchId: utakoBranch.id },
        ];
        for (const lead of uLeads) {
            const exists = await prisma.lead.findFirst({ where: { phone: lead.phone } });
            if(!exists) await prisma.lead.create({ data: lead });
        }
        console.log("Seeded mock leads into Utako Branch.");
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
