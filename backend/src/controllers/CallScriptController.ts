import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const CallScriptController = {
    // Get scripts for the user's company
    async getScripts(req: Request, res: Response) {
        const user = (req as any).user;
        // User must have companyId in token OR we fetch from DB
        // Assuming middleware puts companyId in user object, checking AuthMiddleware later. 
        // Logic: fetch user from DB to get companyId if missing.

        try {
            const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
            if (!dbUser?.companyId) return res.status(400).json({ error: "User not attached to company" });

            const scripts = await prisma.callScript.findMany({
                where: { companyId: dbUser.companyId },
                orderBy: { title: 'asc' }
            });
            res.json(scripts);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch scripts' });

        }
    },

    // Create Script (Admin Only)
    async createScript(req: Request, res: Response) {
        const user = (req as any).user;
        const { title, content, category } = req.body;

        try {
            const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
            if (!dbUser?.companyId) return res.status(400).json({ error: "User not attached to company" });

            const script = await prisma.callScript.create({
                data: {
                    title,
                    content,
                    category,
                    companyId: dbUser.companyId
                }
            });
            res.json(script);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create script' });
        }
    },

    async updateScript(req: Request, res: Response) {
        const { id } = req.params;
        const { title, content, category } = req.body;
        try {
            const script = await prisma.callScript.update({
                where: { id: String(id) },
                data: { title, content, category }
            });
            res.json(script);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update script' });
        }
    },

    async deleteScript(req: Request, res: Response) {
        const { id } = req.params;
        try {
            await prisma.callScript.delete({ where: { id: String(id) } });
            res.json({ message: 'Script deleted' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete script' });
        }
    }
};
