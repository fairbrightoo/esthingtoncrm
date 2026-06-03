import prisma from './src/config/prisma.js';

async function main() {
    console.log('Migrating Corner Piece Plots...');
    const estates = await prisma.estate.findMany();
    
    for (const estate of estates) {
        const cornerPiecePrice = estate.cornerPiecePrice || 1000000;
        
        // Find all corner piece plots in this estate
        const plots = await prisma.plot.findMany({
            where: {
                estateId: estate.id,
                isCornerPiece: true
            }
        });
        
        for (const plot of plots) {
            // Check if price already looks like it has a surcharge (optional heuristic, but we'll assume it doesn't since this logic was added just now)
            // To be safe, we just update it.
            await prisma.plot.update({
                where: { id: plot.id },
                data: {
                    price: plot.price + cornerPiecePrice
                }
            });
            console.log(`Updated plot ${plot.plotNumber} price from ${plot.price} to ${plot.price + cornerPiecePrice}`);
        }
    }
    console.log('Migration Complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
