import prisma from './src/config/prisma.js';

async function main() {
    const broadcasts = await prisma.dashboardBroadcast.findMany();
    const logs = await prisma.globalBroadcastLog.findMany();
    console.log("Broadcasts:", broadcasts.length);
    console.log("Logs:", logs.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
