import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { uploadFile } from '../services/StorageService.js';
import prisma from '../config/prisma.js';


export const EstateController = {
    // 1. Create a new Estate (Branch Admin)
    createEstate: async (req: Request, res: Response) => {
        try {
            const { name, location, documentSearchNumber, cornerPiecePrice } = req.body;
            const user = (req as any).user;

            if (!user.companyId || !user.branchId) {
                return res.status(400).json({ error: "Missing company or branch association for this user." });
            }

            let searchDocumentUrl = null;
            let siteLayoutUrl = null;

            if (req.files) {
                const files = req.files as { [fieldname: string]: Express.Multer.File[] };
                if (files['searchDocument'] && files['searchDocument'][0]) {
                    const file = files['searchDocument'][0];
                    searchDocumentUrl = await uploadFile(file.buffer, file.originalname, 'estates');
                }

                if (files['siteLayout'] && files['siteLayout'][0]) {
                    const file = files['siteLayout'][0];
                    siteLayoutUrl = await uploadFile(file.buffer, file.originalname, 'estates');
                }
            }

            const estate = await prisma.estate.create({
                data: {
                    name,
                    location,
                    documentSearchNumber: documentSearchNumber || null,
                    searchDocumentUrl,
                    siteLayoutUrl,
                    cornerPiecePrice: cornerPiecePrice !== undefined ? Number(cornerPiecePrice) : undefined,
                    companyId: user.companyId,
                    managingBranchId: user.branchId
                }
            });

            res.status(201).json(estate);
        } catch (error) {
            console.error("Create Estate Error:", error);
            res.status(500).json({ error: "Failed to create estate" });
        }
    },

    // 1.5 Update Estate (Branch Admin)
    updateEstate: async (req: Request, res: Response) => {
        try {
            const { id } = req.params as { id: string };
            const { name, location, documentSearchNumber, cornerPiecePrice } = req.body;

            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (location !== undefined) updateData.location = location;
            if (documentSearchNumber !== undefined) updateData.documentSearchNumber = documentSearchNumber || null;
            if (cornerPiecePrice !== undefined) updateData.cornerPiecePrice = Number(cornerPiecePrice);

            if (req.files) {
                const files = req.files as { [fieldname: string]: Express.Multer.File[] };
                if (files['searchDocument'] && files['searchDocument'][0]) {
                    const file = files['searchDocument'][0];
                    updateData.searchDocumentUrl = await uploadFile(file.buffer, file.originalname, 'estates');
                }

                if (files['siteLayout'] && files['siteLayout'][0]) {
                    const file = files['siteLayout'][0];
                    updateData.siteLayoutUrl = await uploadFile(file.buffer, file.originalname, 'estates');
                }
            }

            const estate = await prisma.estate.update({
                where: { id },
                data: updateData
            });

            res.json(estate);
        } catch (error) {
            console.error("Update Estate Error:", error);
            res.status(500).json({ error: "Failed to update estate" });
        }
    },

    // 2. Get All Estates (Global Marketplace Visibility)
    getEstates: async (req: Request, res: Response) => {
        try {
            // Note: We intentionally do NOT filter by companyId. 
            // All estates are globally visible.
            const estates = await prisma.estate.findMany({
                include: {
                    company: { select: { name: true, themeColor: true } },
                    branch: { select: { name: true } },
                    plots: {
                        select: { status: true, prototype: true, size: true } // Fetch status, prototype, and size for breakdown
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Calculate aggregations dynamically for the frontend
            const formattedEstates = estates.map(estate => {
                const totalPlots = estate.plots.length;
                const availablePlotsList = estate.plots.filter(p => p.status === 'AVAILABLE');
                const availablePlots = availablePlotsList.length;
                
                const breakdownMap: Record<string, number> = {};
                availablePlotsList.forEach(p => {
                    let type = p.prototype || 'Unknown Type';
                    if (p.size) {
                        type += ` (${p.size}sqm)`;
                    }
                    breakdownMap[type] = (breakdownMap[type] || 0) + 1;
                });
                const plotBreakdown = Object.entries(breakdownMap).map(([size, count]) => ({ size, count }));

                return {
                    id: estate.id,
                    name: estate.name,
                    location: estate.location,
                    companyId: estate.companyId,
                    managingBranchId: estate.managingBranchId,
                    managingCompany: estate.company.name,
                    companyTheme: estate.company.themeColor,
                    managingBranch: estate.branch.name,
                    documentSearchNumber: estate.documentSearchNumber,
                    searchDocumentUrl: estate.searchDocumentUrl,
                    siteLayoutUrl: estate.siteLayoutUrl,
                    createdAt: estate.createdAt,
                    totalPlots,
                    availablePlots,
                    plotBreakdown
                };
            });

            res.json(formattedEstates);
        } catch (error) {
            console.error("Get Estates Error:", error);
            res.status(500).json({ error: "Failed to fetch estates" });
        }
    },

    // 3. Delete Estate (Admin)
    deleteEstate: async (req: Request, res: Response) => {
        try {
            const { id } = req.params as { id: string };

            // Check if there are generated plots, block deletion if any plots are SOLD or RESERVED
            const runningPlots = await prisma.plot.count({
                where: {
                    estateId: id,
                    status: { in: ['SOLD', 'RESERVED'] }
                }
            });

            if (runningPlots > 0) {
                return res.status(400).json({ error: "Cannot delete an estate that has reserved or sold plots." });
            }

            // Safe to delete related plots that are just 'AVAILABLE'
            await prisma.plot.deleteMany({ where: { estateId: id } });
            await prisma.estate.delete({ where: { id } });

            res.json({ message: "Estate and its empty plots deleted successfully" });
        } catch (error) {
            console.error("Delete Estate Error:", error);
            res.status(500).json({ error: "Failed to delete estate" });
        }
    },

    // 4. Stream Secure PDF to Bypass IDM Checkers
    streamSecurePdf: async (req: Request, res: Response) => {
        try {
            const { filePath } = req.body;
            if (!filePath) return res.status(400).json({ error: "File path is required" });

            if (filePath.startsWith('http')) {
                const response = await axios.get(filePath, { responseType: 'stream' });
                res.setHeader('Content-Type', 'application/pdf');
                response.data.pipe(res);
                return;
            }

            // Security: limit directory traversal
            const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
            const absolutePath = path.join(process.cwd(), normalizedPath);

            if (!fs.existsSync(absolutePath)) {
                res.status(404).json({ error: "Secure file not found" });
                return;
            }

            // By explicitly providing application/pdf but through a POST route, 
            // the Client handles interpretation naturally via Blobs while bypassing extensions blocks.
            res.setHeader('Content-Type', 'application/pdf');
            res.sendFile(absolutePath);
        } catch (error) {
            console.error("Stream PDF Error:", error);
            res.status(500).json({ error: "Failed to stream layout securely" });
        }
    }
};
