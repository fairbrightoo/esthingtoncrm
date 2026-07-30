import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Only specific roles can edit or map plots
const canEditMappings = (user: any) => {
    const roles = ['SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GLOBAL_MANAGING_DIRECTOR', 'MANAGING_DIRECTOR', 'BRANCH_ADMIN'];
    return roles.includes(user.role);
};

export const PhysicalPlotController = {
    // 1. Bulk Upload Physical Plots
    async bulkUpload(req: Request, res: Response) {
        try {
            const estateId = req.params.estateId as string;
            const { plots } = req.body;
            const user = (req as any).user;

            if (!canEditMappings(user)) {
                return res.status(403).json({ error: "Unauthorized to upload physical plots" });
            }

            const createdPlots = [];
            for (const plot of plots) {
                const { physicalPlotNumber, size, isCornerPiece, coordinates } = plot;
                
                // Upsert to handle updates if re-uploaded
                const upserted = await prisma.physicalPlot.upsert({
                    where: {
                        estateId_physicalPlotNumber: {
                            estateId,
                            physicalPlotNumber
                        }
                    },
                    update: {
                        size: parseFloat(size) || 0,
                        isCornerPiece: isCornerPiece === 'Yes' || isCornerPiece === true,
                        coordinates: coordinates || null,
                    },
                    create: {
                        estateId,
                        physicalPlotNumber,
                        size: parseFloat(size) || 0,
                        isCornerPiece: isCornerPiece === 'Yes' || isCornerPiece === true,
                        coordinates: coordinates || null,
                        status: 'AVAILABLE'
                    }
                });
                createdPlots.push(upserted);
            }

            return res.status(200).json({ message: "Upload successful", count: createdPlots.length });
        } catch (error) {
            console.error("Bulk Upload Error:", error);
            return res.status(500).json({ error: "Failed to upload physical plots" });
        }
    },

    // 2. Add or Edit Single Plot
    async savePlot(req: Request, res: Response) {
        try {
            const estateId = req.params.estateId as string;
            const { id, physicalPlotNumber, size, isCornerPiece, coordinates } = req.body;
            const user = (req as any).user;

            if (!canEditMappings(user)) {
                return res.status(403).json({ error: "Unauthorized to edit physical plots" });
            }

            let plot;
            if (id) {
                plot = await prisma.physicalPlot.update({
                    where: { id },
                    data: { physicalPlotNumber, size, isCornerPiece, coordinates }
                });
            } else {
                plot = await prisma.physicalPlot.create({
                    data: { estateId, physicalPlotNumber, size, isCornerPiece, coordinates, status: 'AVAILABLE' }
                });
            }

            return res.status(200).json(plot);
        } catch (error) {
            console.error("Save Plot Error:", error);
            return res.status(500).json({ error: "Failed to save physical plot" });
        }
    },

    // 3. Get All Physical Plots
    async getPhysicalPlots(req: Request, res: Response) {
        try {
            const estateId = req.params.estateId as string;

            const plots = await prisma.physicalPlot.findMany({
                where: { estateId },
                include: {
                    mappedSystemPlot: {
                        include: {
                            sales: {
                                include: { lead: true }
                            }
                        }
                    }
                },
                orderBy: { physicalPlotNumber: 'asc' }
            });

            return res.status(200).json(plots);
        } catch (error) {
            console.error("Get Plots Error:", error);
            return res.status(500).json({ error: "Failed to fetch physical plots" });
        }
    },

    // 4. Get Unmapped System Plots
    async getUnmappedSystemPlots(req: Request, res: Response) {
        try {
            const estateId = req.params.estateId as string;

            const plots = await prisma.plot.findMany({
                where: {
                    estateId,
                    physicalPlot: null, // No physical plot assigned
                    status: { in: ['SOLD', 'RESERVED', 'INSTALLMENT_ACTIVE'] }
                },
                include: {
                    sales: {
                        include: { lead: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return res.status(200).json(plots);
        } catch (error) {
            console.error("Get Unmapped Plots Error:", error);
            return res.status(500).json({ error: "Failed to fetch unmapped plots" });
        }
    },

    // 5. Map System Plot to Physical Plot
    async mapPlot(req: Request, res: Response) {
        try {
            const estateId = req.params.estateId as string;
            const physicalPlotId = req.params.physicalPlotId as string;
            const { systemPlotId } = req.body;
            const user = (req as any).user;

            if (!canEditMappings(user)) {
                return res.status(403).json({ error: "Unauthorized to map plots" });
            }

            // Verify both plots exist and sizes match
            const physicalPlot = await prisma.physicalPlot.findUnique({ where: { id: physicalPlotId } });
            const systemPlot = await prisma.plot.findUnique({ where: { id: systemPlotId } });

            if (!physicalPlot || !systemPlot) {
                return res.status(404).json({ error: "Plot not found" });
            }

            if (physicalPlot.size !== systemPlot.size) {
                return res.status(400).json({ error: `Size mismatch: Physical plot is ${physicalPlot.size}sqm, but system plot is ${systemPlot.size}sqm` });
            }

            if (physicalPlot.status === 'ALLOCATED' && physicalPlot.mappedSystemPlotId !== systemPlotId) {
                return res.status(400).json({ error: "Physical plot is already allocated" });
            }

            // Map it!
            await prisma.physicalPlot.update({
                where: { id: physicalPlotId },
                data: {
                    status: 'ALLOCATED',
                    mappedSystemPlotId: systemPlotId
                }
            });

            return res.status(200).json({ message: "Successfully mapped plot" });
        } catch (error) {
            console.error("Map Plot Error:", error);
            return res.status(500).json({ error: "Failed to map plot" });
        }
    },

    // 6. Unmap Plot
    async unmapPlot(req: Request, res: Response) {
        try {
            const estateId = req.params.estateId as string;
            const physicalPlotId = req.params.physicalPlotId as string;
            const user = (req as any).user;

            if (!canEditMappings(user)) {
                return res.status(403).json({ error: "Unauthorized to unmap plots" });
            }

            await prisma.physicalPlot.update({
                where: { id: physicalPlotId },
                data: {
                    status: 'AVAILABLE',
                    mappedSystemPlotId: null
                }
            });

            return res.status(200).json({ message: "Successfully unmapped plot" });
        } catch (error) {
            console.error("Unmap Plot Error:", error);
            return res.status(500).json({ error: "Failed to unmap plot" });
        }
    }
};
