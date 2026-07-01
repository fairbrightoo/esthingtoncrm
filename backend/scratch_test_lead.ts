import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({ where: { role: 'SITE_EXPERT' } });
        if (!user) {
            console.log("No SITE_EXPERT found");
            return;
        }

        console.log("Testing with user:", user.fullName, user.role);

        // Test with same payload logic as controller
        const payload = {
            fullName: 'Ifi Tobias Ikechukwu',
            phone: '07036383914',
            email: 'Tobiasikechukwu448@yahoo.com',
            gender: 'Female',
            source: 'Referral',
            status: 'PROSPECT',
            companyId: user.companyId!,
            branchId: user.branchId, // Defaults to creator's branch
            assignedToUserId: user.id
        };
        console.log("Payload:", payload);

        const lead = await prisma.lead.create({
            data: payload
        });
        console.log("Success:", lead.id);

        // Cleanup
        await prisma.lead.delete({ where: { id: lead.id } });
    } catch (e) {
        console.error("Error creating lead:", e);
    }
}
main().finally(() => prisma.$disconnect());
