import prisma from './src/config/prisma.js';

async function findSale() {
    const payment = await prisma.payment.findFirst({
        where: { status: 'APPROVED' },
        include: { sale: true }
    });
    console.log(payment);
}
findSale();
