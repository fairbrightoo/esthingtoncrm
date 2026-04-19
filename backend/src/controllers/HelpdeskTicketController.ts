import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const HelpdeskTicketController = {
    // 1. Create a new ticket
    async create(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const { title, description, priority, category, leadId } = req.body;

            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
            if (!user || !user.companyId || !user.branchId) {
                return res.status(403).json({ error: "User is missing complete company/branch profiles required to generate tickets." });
            }

            const ticket = await prisma.helpdeskTicket.create({
                data: {
                    title,
                    description,
                    priority: priority || 'MEDIUM',
                    category: category || 'GENERAL',
                    status: 'OPEN',
                    creatorId: user.id,
                    companyId: user.companyId,
                    branchId: user.branchId,
                    leadId: leadId || null
                },
                include: {
                    creator: { select: { fullName: true } },
                    lead: { select: { fullName: true, phone: true } }
                }
            });

            res.status(201).json(ticket);
        } catch (error) {
            console.error("Create Ticket Error:", error);
            res.status(500).json({ error: "Failed to create helpdesk ticket" });
        }
    },

    // 2. Get all tickets for a specific branch (or globally if super admin)
    async getAll(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });

            if (!user) return res.status(401).json({ error: "User not found" });

            const whereClause: any = {};
            if (user.role !== 'SUPER_ADMIN') {
                if (!user.companyId || !user.branchId) {
                    return res.status(400).json({ error: "User is missing company or branch assignment" });
                }
                whereClause.companyId = user.companyId;
                whereClause.branchId = user.branchId;
            }

            const tickets = await prisma.helpdeskTicket.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: { select: { fullName: true } },
                    lead: { select: { fullName: true, phone: true } }
                }
            });

            res.json(tickets);
        } catch (error) {
            console.error("Fetch Tickets Error:", error);
            res.status(500).json({ error: "Failed to fetch helpdesk tickets" });
        }
    },

    // 3. Update Status Priority
    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status, priority, category } = req.body;

            const updateData: any = {};
            if (status) updateData.status = status;
            if (priority) updateData.priority = priority;
            if (category) updateData.category = category;

            const ticket = await prisma.helpdeskTicket.update({
                where: { id },
                data: updateData,
                include: {
                    creator: { select: { fullName: true } },
                    lead: { select: { fullName: true, phone: true } }
                }
            });

            res.json(ticket);
        } catch (error) {
            console.error("Update Ticket Error:", error);
            res.status(500).json({ error: "Failed to update ticket" });
        }
    },

    // 4. Delete Ticket
    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await prisma.helpdeskTicket.delete({ where: { id } });
            res.json({ success: true });
        } catch (error) {
            console.error("Delete Ticket Error:", error);
            res.status(500).json({ error: "Failed to delete ticket" });
        }
    }
};
