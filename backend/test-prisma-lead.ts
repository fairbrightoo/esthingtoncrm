import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    try {
        const lead = await prisma.lead.create({
            data: {
                fullName: String("Mr. Abubakar Mukhtar"),
                phone: String("0705 565 5553"),
                email: "" ? String("") : null,
                gender: "Male" ? String("Male") : null,
                source: "Walk-in" ? String("Walk-in") : null,
                dateOfBirth: undefined ? new Date(undefined as any) : null,
                address: undefined ? String(undefined) : null,
                occupation: undefined ? String(undefined) : null,
                nextOfKinName: undefined ? String(undefined) : null,
                nextOfKinPhone: undefined ? String(undefined) : null,
                whatsappOptIn: true !== undefined ? Boolean(true) : true,
                status: 'PROSPECT',
                companyId: "some-company-id",
                branchId: "some-branch-id" || null,
                assignedToUserId: undefined ? String(undefined) : "some-user-id"
            }
        });
        console.log("Success:", lead);
    } catch (e) {
        console.error("Prisma Error:", e);
    }
}

run();
