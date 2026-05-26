import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const TaskController = {
    // Get tasks for the logged-in user
    async getTasks(req: Request, res: Response) {
        const user = (req as any).user;
        try {
            const tasks = await prisma.task.findMany({
                where: { assignedToUserId: user.userId },
                include: { lead: { select: { id: true, fullName: true, phone: true } } },
                orderBy: { dueDate: 'asc' }
            });
            res.json(tasks);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch tasks' });
        }
    },

    // Get all inspections for a branch
    async getBranchInspections(req: Request, res: Response) {
        const branchId = req.params.branchId as string;
        const companyId = req.params.companyId as string;
        try {
            const tasks = await prisma.task.findMany({
                where: {
                    type: 'INSPECTION',
                    assignedToUser: {
                        branchId: branchId !== 'null' ? branchId : undefined,
                        companyId: companyId !== 'null' ? companyId : undefined
                    }
                },
                include: {
                    lead: { select: { id: true, fullName: true, phone: true } },
                    assignedToUser: { select: { id: true, fullName: true, role: true } }
                },
                orderBy: { dueDate: 'desc' }
            });
            res.json(tasks);
        } catch (error) {
            console.error('Get Branch Inspections Error:', error);
            res.status(500).json({ error: 'Failed to fetch inspections' });
        }
    },

    // Create a new task (optionally linked to a lead)
    async createTask(req: Request, res: Response) {
        const user = (req as any).user;
        const { title, description, dueDate, leadId, type } = req.body;

        try {
            const task = await prisma.task.create({
                data: {
                    title,
                    description,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    type: type || 'GENERAL',
                    assignedToUserId: String(user.userId),
                    leadId: leadId ? String(leadId) : null
                }
            });
            res.json(task);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create task' });
        }
    },

    // Update task (e.g. mark as completed)
    async updateTask(req: Request, res: Response) {
        const { id } = req.params;
        const { isCompleted, title, description, dueDate, type } = req.body;

        try {
            const data: any = {};
            if (isCompleted !== undefined) data.isCompleted = isCompleted;
            if (title) data.title = title;
            if (description) data.description = description;
            if (dueDate) data.dueDate = new Date(dueDate);
            if (type) data.type = type;

            const task = await prisma.task.update({
                where: { id: String(id) },
                data
            });
            res.json(task);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update task' });
        }
    },

    async deleteTask(req: Request, res: Response) {
        const { id } = req.params;
        try {
            await prisma.task.delete({ where: { id: String(id) } });
            res.json({ message: 'Task deleted' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete task' });
        }
    }
};
