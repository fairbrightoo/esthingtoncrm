import prisma from './src/config/prisma.js';

async function main() {
    const broadcasts = await prisma.dashboardBroadcast.findMany();
    for (const b of broadcasts) {
        const existing = await prisma.globalBroadcastLog.findFirst({
            where: { title: b.title, createdAt: b.createdAt }
        });
        if (!existing) {
            await prisma.globalBroadcastLog.create({
                data: {
                    title: b.title,
                    content: b.content,
                    audienceType: b.audienceType,
                    targetId: b.targetId,
                    deliveryType: 'DASHBOARD',
                    authorId: b.authorId,
                    successCount: 1,
                    failedCount: 0,
                    createdAt: b.createdAt
                }
            });
            console.log('Synced broadcast:', b.title);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
