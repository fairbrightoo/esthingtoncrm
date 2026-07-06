import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    try {
        const branch = await prisma.branch.findFirst({ where: { name: { contains: "double king utako", mode: 'insensitive' } } });
        if (!branch) {
            console.log("Branch not found");
            return;
        }
        console.log("Branch:", branch);

        const users = await prisma.user.findMany({ where: { branchId: branch.id, role: 'SITE_EXPERT' } });
        console.log("SITE_EXPERTs at branch:", users);

        if (users.length > 0) {
            const user = users[0];
            try {
                const lead = await prisma.lead.create({
                    data: {
                        fullName: "Ugwuoke Daniel Otti 3",
                        phone: "0806 086 4038",
                        email: "ugwuokedaniel4@gmail.com",
                        source: "Walk-in",
                        gender: "Male",
                        whatsappOptIn: true,
                        status: 'PROSPECT',
                        companyId: user.companyId!,
                        branchId: user.branchId || null,
                        assignedToUserId: user.id
                    }
                });
                console.log("Successfully created lead!", lead.id);
            } catch (createErr) {
                console.error("Prisma create error for this specific user:", createErr);
            }
        }
    } catch(e) {
        console.error("error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
