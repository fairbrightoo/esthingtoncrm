import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=========================================");
    console.log("   ESTHINGTON CRM - TEST DATA WIPER     ");
    console.log("=========================================");

    try {
        // 1. Identify Test Entities
        const testUsers = await prisma.user.findMany({
            where: { fullName: { startsWith: '[TEST]' } }
        });
        const testUserIds = testUsers.map(u => u.id);

        const testLeads = await prisma.lead.findMany({
            where: {
                OR: [
                    { fullName: { startsWith: '[TEST]' } },
                    { assignedToId: { in: testUserIds.length > 0 ? testUserIds : ['NONE'] } }
                ]
            }
        });
        const testLeadIds = testLeads.map(l => l.id);

        const testEstates = await prisma.estate.findMany({
            where: { name: { startsWith: '[TEST]' } }
        });
        const testEstateIds = testEstates.map(e => e.id);

        console.log(`Found ${testUsers.length} Test Users`);
        console.log(`Found ${testLeads.length} Test Leads`);
        console.log(`Found ${testEstates.length} Test Estates`);

        if (testUserIds.length === 0 && testLeadIds.length === 0 && testEstateIds.length === 0) {
            console.log("No test data found. Exiting gracefully.");
            return;
        }

        console.log("\nStarting Deep Cascade Deletion...");

        // ==========================================
        // LEVEL 1: Deepest Children (Payments, Logs)
        // ==========================================
        
        // Delete Payments linked to Test Users OR Test Leads
        const paymentsDeleted = await prisma.payment.deleteMany({
            where: {
                OR: [
                    { recordedById: { in: testUserIds.length > 0 ? testUserIds : ['NONE'] } },
                    { sale: { leadId: { in: testLeadIds.length > 0 ? testLeadIds : ['NONE'] } } }
                ]
            }
        });
        console.log(`- Deleted ${paymentsDeleted.count} Payments`);

        // Delete Activities and Tasks
        const activitiesDeleted = await prisma.activity.deleteMany({
            where: {
                OR: [
                    { userId: { in: testUserIds.length > 0 ? testUserIds : ['NONE'] } },
                    { leadId: { in: testLeadIds.length > 0 ? testLeadIds : ['NONE'] } }
                ]
            }
        });
        console.log(`- Deleted ${activitiesDeleted.count} Activities`);

        const tasksDeleted = await prisma.task.deleteMany({
            where: {
                OR: [
                    { assignedToId: { in: testUserIds.length > 0 ? testUserIds : ['NONE'] } },
                    { leadId: { in: testLeadIds.length > 0 ? testLeadIds : ['NONE'] } }
                ]
            }
        });
        console.log(`- Deleted ${tasksDeleted.count} Tasks`);

        // Communication Logs
        const logsDeleted = await prisma.communicationLog.deleteMany({
            where: {
                OR: [
                    { userId: { in: testUserIds.length > 0 ? testUserIds : ['NONE'] } },
                    { leadId: { in: testLeadIds.length > 0 ? testLeadIds : ['NONE'] } }
                ]
            }
        });
        console.log(`- Deleted ${logsDeleted.count} Communication Logs`);

        // ==========================================
        // LEVEL 2: Sales and HR/Admin Records
        // ==========================================
        
        const salesDeleted = await prisma.sale.deleteMany({
            where: {
                OR: [
                    { marketerId: { in: testUserIds.length > 0 ? testUserIds : ['NONE'] } },
                    { leadId: { in: testLeadIds.length > 0 ? testLeadIds : ['NONE'] } },
                    { plot: { estateId: { in: testEstateIds.length > 0 ? testEstateIds : ['NONE'] } } }
                ]
            }
        });
        console.log(`- Deleted ${salesDeleted.count} Sales`);

        const attendanceDeleted = await prisma.attendance.deleteMany({
            where: { userId: { in: testUserIds.length > 0 ? testUserIds : ['NONE'] } }
        });
        console.log(`- Deleted ${attendanceDeleted.count} Attendances`);

        // ==========================================
        // LEVEL 3: Core Entities (Plots, Leads)
        // ==========================================

        const plotsDeleted = await prisma.plot.deleteMany({
            where: { estateId: { in: testEstateIds.length > 0 ? testEstateIds : ['NONE'] } }
        });
        console.log(`- Deleted ${plotsDeleted.count} Plots`);

        const leadsDeleted = await prisma.lead.deleteMany({
            where: { id: { in: testLeadIds.length > 0 ? testLeadIds : ['NONE'] } }
        });
        console.log(`- Deleted ${leadsDeleted.count} Leads`);

        // Note: For other HR fields like Payroll, Requisitions, we should delete them too to ensure User deletion works
        if (testUserIds.length > 0) {
            await prisma.payrollRecord.deleteMany({ where: { OR: [ { staffId: { in: testUserIds } }, { processedById: { in: testUserIds } } ] } });
            await prisma.requisition.deleteMany({ where: { OR: [ { requestedById: { in: testUserIds } }, { approvedById: { in: testUserIds } }, { disbursedById: { in: testUserIds } } ] } });
            await prisma.leaveRequest.deleteMany({ where: { OR: [ { staffId: { in: testUserIds } }, { hrApproverId: { in: testUserIds } }, { mdApproverId: { in: testUserIds } } ] } });
            await prisma.refundRequest.deleteMany({ where: { OR: [ { marketerId: { in: testUserIds } }, { branchAdminId: { in: testUserIds } }, { approvedById: { in: testUserIds } }, { disbursedById: { in: testUserIds } } ] } });
            await prisma.appraisal.deleteMany({ where: { OR: [ { staffId: { in: testUserIds } }, { reviewerId: { in: testUserIds } } ] } });
            await prisma.disciplinaryQuery.deleteMany({ where: { OR: [ { issuerId: { in: testUserIds } }, { targetStaffId: { in: testUserIds } } ] } });
            await prisma.performanceAward.deleteMany({ where: { userId: { in: testUserIds } } });
            
            await prisma.executiveMemo.deleteMany({ where: { OR: [ { senderId: { in: testUserIds } }, { recipientId: { in: testUserIds } } ] } });
            await prisma.helpdeskTicket.deleteMany({ where: { createdById: { in: testUserIds } } });
            await prisma.companyDocument.deleteMany({ where: { uploadedById: { in: testUserIds } } });
            await prisma.taxRemittance.deleteMany({ where: { remittedById: { in: testUserIds } } });
            await prisma.gMDirectMessage.deleteMany({ where: { OR: [ { senderId: { in: testUserIds } }, { recipientId: { in: testUserIds } } ] } });
            await prisma.branchBroadcast.deleteMany({ where: { authorId: { in: testUserIds } } });
            await prisma.hRRecommendation.deleteMany({ where: { OR: [ { authorId: { in: testUserIds } }, { targetStaffId: { in: testUserIds } } ] } });
        }

        // ==========================================
        // LEVEL 4: Top Level Entities (Users, Estates)
        // ==========================================

        const estatesDeleted = await prisma.estate.deleteMany({
            where: { id: { in: testEstateIds.length > 0 ? testEstateIds : ['NONE'] } }
        });
        console.log(`- Deleted ${estatesDeleted.count} Estates`);

        const usersDeleted = await prisma.user.deleteMany({
            where: { id: { in: testUserIds.length > 0 ? testUserIds : ['NONE'] } }
        });
        console.log(`- Deleted ${usersDeleted.count} Users`);

        console.log("\n=========================================");
        console.log("   WIPE COMPLETE. SYSTEM CLEAN.         ");
        console.log("=========================================\n");

    } catch (error) {
        console.error("\n❌ ERROR DURING WIPE:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
