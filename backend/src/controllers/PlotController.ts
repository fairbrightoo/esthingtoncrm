import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

// Helper to create acronym from string, ignoring common fluff words like "Bedroom", "with"
function generateAcronym(text: string): string {
    const ignoredWords = ['bedroom', 'with', 'and', 'the', 'of', 'in', 'detached', 'bq']; // We'll keep detached but wait, user had FDD = Fully Detached Duplex. 
    // Wait, "4 Bedroom Fully Detached Duplex" -> 4FDD.
    // "5 Bedroom Semi-Detached Duplex with detached BQ" -> 5SDD.
    
    let words = text.split(/[\s-]+/);
    let acronym = '';

    for (const word of words) {
        if (!word) continue;
        
        // If it's a number (like 4 or 5), append it directly
        if (/^\d+$/.test(word)) {
            acronym += word;
            continue;
        }

        const lowerWord = word.toLowerCase();
        
        // Skip ignored words
        if (['bedroom', 'with', 'attached', 'detached', 'bq', 'and'].includes(lowerWord)) {
            // Except if doing Fully Detached Duplex (FDD), the word is "Detached". 
            // The user rule: 
            // 4 Bedroom Fully Detached Duplex -> 4FDD
            // 5 Bedroom Semi-Detached Duplex with detached BQ -> 5SDD
            
            // Wait, so we keep F (Fully), D (Detached), D (Duplex)? Yes. 
            // Let's refine the ignore list:
            if (['bedroom', 'with', 'attached', 'bq', 'and'].includes(lowerWord)) {
                continue; 
            }
        }
        
        // If it starts with a letter, take the first letter
        if (/^[a-zA-Z]/.test(word)) {
            acronym += word.charAt(0).toUpperCase();
        }
    }
    return acronym;
}

export const PlotController = {
    // 1. Bulk Generate Plots (Admin)
    generatePlots: async (req: Request, res: Response) => {
        try {
            const { estateId } = req.params as { estateId: string };
            const { prototype, size, price, quantity, isCornerPiece } = req.body;

            const estate = await prisma.estate.findUnique({
                where: { id: estateId },
                include: { company: true }
            });

            if (!estate) return res.status(404).json({ error: "Estate not found" });

            // 1. Estate Acronym
            const estateAcr = estate.name.split(' ').map((w: string) => {
                if (!w) return '';
                return w.charAt(0).toUpperCase();
            }).join('');

            // 2. Date string
            const date = new Date();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(2);
            const dateStr = `/${month}/${year}`;

            // 3. Prototype Acronym
            let protoAcr = generateAcronym(prototype);

            // Fetch the highest sequence number for this prototype + size in this estate
            const existingPlotsCount = await prisma.plot.count({
                where: { estateId, prototype, size: Number(size) }
            });

            let startIndex = existingPlotsCount + 1;
            let plotsToCreate = [];
            
            const finalPrice = isCornerPiece ? Number(price) + (estate.cornerPiecePrice || 1000000) : Number(price);
            const sizeStr = isCornerPiece ? `${size}CP` : `${size}`;

            for (let i = 0; i < Number(quantity); i++) {
                const seqStr = String(startIndex + i).padStart(4, '0');
                const plotNumber = `${estateAcr}${dateStr}-${protoAcr}-${sizeStr}-${seqStr}`;

                plotsToCreate.push({
                    estateId,
                    plotNumber,
                    prototype,
                    size: Number(size),
                    price: finalPrice,
                    isCornerPiece: isCornerPiece === true,
                    status: 'AVAILABLE'
                });
            }

            const result = await prisma.plot.createMany({
                data: plotsToCreate
            });

            res.status(201).json({ message: `Successfully generated ${result.count} plots`, count: result.count });
        } catch (error) {
            console.error("Generate Plots Error:", error);
            res.status(500).json({ error: "Failed to generate plots" });
        }
    },

    // 2. Get Plots for an Estate (Admin View)
    getEstatePlots: async (req: Request, res: Response) => {
        try {
            const { estateId } = req.params as { estateId: string };
            const plots = await prisma.plot.findMany({
                where: { estateId },
                orderBy: { plotNumber: 'asc' }
            });
            res.json(plots);
        } catch (error) {
            console.error("Get Estate Plots Error:", error);
            res.status(500).json({ error: "Failed to fetch plots" });
        }
    },

    // 3. Toggle Corner Piece (Admin)
    toggleCornerPiece: async (req: Request, res: Response) => {
        try {
            const { plotId } = req.params as { plotId: string };
            const { isCornerPiece } = req.body;

            const plot = await prisma.plot.findUnique({ 
                where: { id: plotId },
                include: { estate: true }
            });
            if (!plot) return res.status(404).json({ error: "Plot not found" });

            const oldPlotNumber = plot.plotNumber;
            let newPlotNumber = oldPlotNumber;
            let newPrice = plot.price;
            const cpPrice = plot.estate?.cornerPiecePrice || 1000000;

            const sizeString = String(plot.size);

            if (isCornerPiece) {
                // Add CP if it doesn't have it
                if (!newPlotNumber.includes(`${sizeString}CP-`)) {
                    newPlotNumber = newPlotNumber.replace(`-${sizeString}-`, `-${sizeString}CP-`);
                }
                // Add price if toggling from false to true
                if (!plot.isCornerPiece) {
                    newPrice += cpPrice;
                }
            } else {
                // Remove CP if it has it
                if (newPlotNumber.includes(`${sizeString}CP-`)) {
                    newPlotNumber = newPlotNumber.replace(`-${sizeString}CP-`, `-${sizeString}-`);
                }
                // Subtract price if toggling from true to false
                if (plot.isCornerPiece) {
                    newPrice -= cpPrice;
                }
            }

            const updatedPlot = await prisma.plot.update({
                where: { id: plotId },
                data: {
                    isCornerPiece: Boolean(isCornerPiece),
                    plotNumber: newPlotNumber,
                    price: newPrice
                }
            });

            res.json(updatedPlot);
        } catch (error) {
            console.error("Toggle CP Error:", error);
            res.status(500).json({ error: "Failed to update corner piece status" });
        }
    },

    // 4. Get All Available Plots (Global Marketplace for Agents)
    getAvailablePlots: async (req: Request, res: Response) => {
        try {
            // Group globally accessible available plots
            // We usually include the Estate info so the frontend can display: "Double King Villa - 4 Bedroom (500sqm) - DKV/02/26-0001"
            const plots = await prisma.plot.findMany({
                where: { status: 'AVAILABLE' },
                include: {
                    estate: {
                        select: { name: true, location: true, managingBranchId: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(plots);
        } catch (error) {
            console.error("Get Available Plots Error:", error);
            res.status(500).json({ error: "Failed to fetch available properties" });
        }
    },

    // 5. Update Plot Details & Track Price History (Admin/MD)
    updatePlot: async (req: Request, res: Response) => {
        try {
            const { plotId } = req.params as { plotId: string };
            const { price, size, prototype, status } = req.body;
            const user = (req as any).user;

            const existingPlot = await prisma.plot.findUnique({ where: { id: plotId } });
            if (!existingPlot) return res.status(404).json({ error: "Plot not found" });

            const updates: any = {};
            if (size !== undefined) updates.size = Number(size);
            if (prototype !== undefined) updates.prototype = prototype;
            if (status !== undefined) updates.status = status;

            let updatedPlot;

            // If price changes, create a history record transactionally
            if (price !== undefined && Number(price) !== existingPlot.price) {
                updates.price = Number(price);

                updatedPlot = await prisma.$transaction([
                    prisma.plot.update({
                        where: { id: plotId },
                        data: updates
                    }),
                    prisma.plotPriceHistory.create({
                        data: {
                            plotId,
                            oldPrice: existingPlot.price,
                            newPrice: Number(price),
                            changedBy: user?.id
                        }
                    })
                ]);
                res.json(updatedPlot[0]);
            } else {
                updatedPlot = await prisma.plot.update({
                    where: { id: plotId },
                    data: updates
                });
                res.json(updatedPlot);
            }
        } catch (error) {
            console.error("Update Plot Error:", error);
            res.status(500).json({ error: "Failed to update plot details" });
        }
    },

    // 5.5 Bulk Update Plot Prices & Track History
    updateBulkPlotPrices: async (req: Request, res: Response) => {
        try {
            const { estateId } = req.params as { estateId: string };
            const { prototype, size, newPrice } = req.body;
            const user = (req as any).user;

            if (!prototype || !size || !newPrice) return res.status(400).json({ error: "Prototype, size and newPrice are required." });

            const numericSize = Number(size);
            const numericNewPrice = Number(newPrice);

            // Fetch all plots targeting this prototype and size within the estate
            const targetedPlots = await prisma.plot.findMany({
                where: {
                    estateId,
                    prototype,
                    size: numericSize
                },
                include: { estate: true }
            });

            if (targetedPlots.length === 0) {
                return res.json({ message: "No plots found for this size.", updatedCount: 0 });
            }

            const historyLogs: any[] = [];
            const updatePromises: any[] = [];

            for (const plot of targetedPlots) {
                const cpPrice = plot.estate?.cornerPiecePrice || 1000000;
                const finalPrice = plot.isCornerPiece ? numericNewPrice + cpPrice : numericNewPrice;

                if (plot.price !== finalPrice) {
                    historyLogs.push({
                        plotId: plot.id,
                        oldPrice: plot.price,
                        newPrice: finalPrice,
                        changedBy: user?.id
                    });

                    updatePromises.push(
                        prisma.plot.update({
                            where: { id: plot.id },
                            data: { price: finalPrice }
                        })
                    );
                }
            }

            if (updatePromises.length === 0) {
                return res.json({ message: "No plots required pricing updates.", updatedCount: 0 });
            }

            // Execute Prisma Transaction synchronously
            await prisma.$transaction([
                ...updatePromises,
                prisma.plotPriceHistory.createMany({
                    data: historyLogs
                })
            ]);

            res.json({ message: "Plots valuation updated successfully.", updatedCount: updatePromises.length });
        } catch (error) {
            console.error("Bulk Price Update Error:", error);
            res.status(500).json({ error: "Failed to process bulk valuation update." });
        }
    },

    // 6. Get Price History for a Plot
    getPlotHistory: async (req: Request, res: Response) => {
        try {
            const { plotId } = req.params as { plotId: string };
            const history = await prisma.plotPriceHistory.findMany({
                where: { plotId },
                orderBy: { changedAt: 'desc' }
            });
            res.json(history);
        } catch (error) {
            console.error("Get Plot History Error:", error);
            res.status(500).json({ error: "Failed to fetch plot history" });
        }
    },

    // 7. Add Individual Legacy Plot (Manual entry)
    addLegacyPlot: async (req: Request, res: Response) => {
        try {
            const { estateId } = req.params as { estateId: string };
            const { plotNumber, prototype, size, price, isCornerPiece } = req.body;

            const existing = await prisma.plot.findUnique({ where: { plotNumber } });
            if (existing) return res.status(400).json({ error: "A plot with this exact Plot Number already exists." });

            const plot = await prisma.plot.create({
                data: {
                    estateId,
                    plotNumber,
                    prototype,
                    size: Number(size),
                    price: Number(price),
                    isCornerPiece: Boolean(isCornerPiece),
                    status: 'AVAILABLE'
                }
            });

            res.status(201).json(plot);
        } catch (error) {
            console.error("Add Legacy Plot Error:", error);
            res.status(500).json({ error: "Failed to create legacy plot" });
        }
    },

    // 8. Bulk Import Legacy Plots (CSV Array mapped in UI)
    importBulkPlots: async (req: Request, res: Response) => {
        try {
            const { estateId } = req.params as { estateId: string };
            const { plots } = req.body; // array of { plotNumber, prototype, size, price, isCornerPiece }

            if (!Array.isArray(plots)) return res.status(400).json({ error: "Expected an array of plots" });

            const preparedPlots = plots.map(p => ({
                estateId,
                plotNumber: p.plotNumber,
                prototype: p.prototype || "Standard Plot",
                size: Number(p.size) || 0,
                price: Number(p.price) || 0,
                isCornerPiece: Boolean(p.isCornerPiece),
                status: 'AVAILABLE'
            }));

            // Filter out any plot numbers that already exist
            const newPlotNumbers = preparedPlots.map(p => p.plotNumber);
            const existingPlots = await prisma.plot.findMany({
                where: { plotNumber: { in: newPlotNumbers } },
                select: { plotNumber: true }
            });
            const existingSet = new Set(existingPlots.map(p => p.plotNumber));
            const safeToCreate = preparedPlots.filter(p => !existingSet.has(p.plotNumber));

            const result = await prisma.plot.createMany({
                data: safeToCreate
            });

            res.status(201).json({
                message: `Successfully imported ${result.count} plots.`,
                count: result.count,
                skipped: existingPlots.length
            });
        } catch (error) {
            console.error("Bulk Import Plots Error:", error);
            res.status(500).json({ error: "Failed to import plots" });
        }
    }
};
