import { Request, Response } from 'express';
import prisma from '../config/prisma.js';


export const EventController = {
    // Get both Birthdays (next 30 days) and Holidays (future)
    async getUpcomingEvents(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = user.companyId;
            const branchId = user.branchId;

            // 1. Fetch upcoming company holidays (from today onwards)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const holidays = await prisma.holiday.findMany({
                where: {
                    companyId: companyId,
                    date: {
                        gte: today
                    }
                },
                orderBy: {
                    date: 'asc'
                }
            });

            // 2. Fetch all users in the specific branch (or company if you want HR to see everyone, but usually branch) who have a dateOfBirth
            const users = await prisma.user.findMany({
                where: {
                    companyId: companyId,
                    branchId: branchId ? branchId : undefined,
                    dateOfBirth: { not: null }
                },
                select: {
                    id: true,
                    fullName: true,
                    role: true,
                    dateOfBirth: true,
                    branch: { select: { name: true } }
                }
            });

            // Calculate which birthdays are coming up in the next 30 days
            const upcomingBirthdays = [];
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();

            for (const staff of users) {
                if (!staff.dateOfBirth) continue;
                
                const dob = new Date(staff.dateOfBirth);
                
                // Set the birth date to the current year to calculate upcoming
                let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());
                
                // If it already passed this year, their next birthday is next year
                if (nextBirthday < today) {
                    nextBirthday = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
                }

                // Calculate difference in days
                const diffTime = nextBirthday.getTime() - currentDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // If within the next 30 days, we consider it "upcoming"
                if (diffDays >= 0 && diffDays <= 30) {
                    upcomingBirthdays.push({
                        ...staff,
                        nextBirthday,
                        daysAway: diffDays
                    });
                }
            }

            // Sort birthdays by closest first
            upcomingBirthdays.sort((a, b) => a.daysAway - b.daysAway);

            res.json({
                holidays,
                upcomingBirthdays
            });

        } catch (error) {
            console.error('Fetch Events Error:', error);
            res.status(500).json({ error: 'Failed to fetch upcoming events' });
        }
    },

    async getClientBirthdays(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = user.companyId;
            const branchId = user.branchId;

            const clients = await prisma.lead.findMany({
                where: {
                    companyId: companyId,
                    branchId: branchId ? branchId : undefined,
                    status: 'CLIENT',
                    dateOfBirth: { not: null }
                },
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    dateOfBirth: true,
                    assignedToUser: { select: { fullName: true } }
                }
            });

            const upcomingBirthdays = [];
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const client of clients) {
                if (!client.dateOfBirth) continue;
                
                const dob = new Date(client.dateOfBirth);
                let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate());
                
                if (nextBirthday < today) {
                    nextBirthday = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
                }

                const diffTime = nextBirthday.getTime() - currentDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays >= 0 && diffDays <= 30) {
                    upcomingBirthdays.push({
                        ...client,
                        nextBirthday,
                        daysAway: diffDays
                    });
                }
            }

            upcomingBirthdays.sort((a, b) => a.daysAway - b.daysAway);

            res.json({ upcomingBirthdays });

        } catch (error) {
            console.error('Fetch Client Birthdays Error:', error);
            res.status(500).json({ error: 'Failed to fetch upcoming client birthdays' });
        }
    },

    async createHoliday(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const companyId = user.companyId;
            const { name, date } = req.body;

            if (user.role !== 'BRANCH_HR' && user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_ADMIN') {
                return res.status(403).json({ error: 'Unauthorized to add holidays' });
            }

            const holiday = await prisma.holiday.create({
                data: {
                    name,
                    date: new Date(date),
                    companyId: companyId
                }
            });

            res.json(holiday);
        } catch (error) {
            console.error('Create Holiday Error:', error);
            res.status(500).json({ error: 'Failed to create holiday' });
        }
    },

    async deleteHoliday(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { id } = req.params as { id: string };

            if (user.role !== 'BRANCH_HR' && user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_ADMIN') {
                return res.status(403).json({ error: 'Unauthorized to delete holidays' });
            }

            await prisma.holiday.delete({
                where: { id }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Delete Holiday Error:', error);
            res.status(500).json({ error: 'Failed to delete holiday' });
        }
    }
};
