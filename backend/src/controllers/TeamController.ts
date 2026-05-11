import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const TeamController = {
    // 1. Get all teams for a specific branch (Head BDD or Super Admin)
    async getTeams(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { branchId, companyId, role, userId } = req.user;

            let filter: any = { companyId };
            if (branchId) filter.branchId = branchId;

            // If BDM, only return their teams
            if (role === 'BDM') {
                filter.bdmId = userId;
            }

            const teams = await prisma.team.findMany({
                where: filter,
                include: {
                    teamLead: { select: { id: true, fullName: true, phone: true } },
                    bdm: { select: { id: true, fullName: true, phone: true } },
                    _count: {
                        select: { members: true }
                    }
                }
            });

            res.json(teams);
        } catch (error) {
            console.error("Failed to fetch teams", error);
            res.status(500).json({ error: 'Failed to fetch teams' });
        }
    },

    // 2. Create a new team (Head BDD or Super Admin)
    async createTeam(req: Request, res: Response) {
        try {
            // @ts-ignore
            const { branchId, companyId } = req.user;
            const { name, teamLeadId, bdmId, themeColor } = req.body;

            if (!name) return res.status(400).json({ error: 'Team name is required' });

            const newTeam = await prisma.team.create({
                data: {
                    name,
                    companyId,
                    branchId,
                    teamLeadId: teamLeadId || null,
                    bdmId: bdmId || null
                }
            });

            // If team lead was assigned, update their user role
            if (teamLeadId) {
                await prisma.user.update({
                    where: { id: teamLeadId },
                    data: { role: 'TEAM_LEAD', teamId: newTeam.id }
                });
            }

            // If BDM was assigned, ensure their role is BDM
            if (bdmId) {
                await prisma.user.update({
                    where: { id: bdmId },
                    data: { role: 'BDM' }
                });
            }

            res.status(201).json(newTeam);
        } catch (error) {
            console.error("Failed to create team", error);
            res.status(500).json({ error: 'Failed to create team' });
        }
    },

    // 3. Update Team (Assign members, change leaders)
    async updateTeam(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string };
            const { name, teamLeadId, bdmId, memberIdsToAdd, memberIdsToRemove } = req.body;

            const existingTeam = await prisma.team.findUnique({ where: { id } });
            if (!existingTeam) return res.status(404).json({ error: 'Team not found' });

            // 1. Handle Team Lead Change
            if (teamLeadId && teamLeadId !== existingTeam.teamLeadId) {
                // Demote old team lead back to marketer if they exist
                if (existingTeam.teamLeadId) {
                    await prisma.user.update({
                        where: { id: existingTeam.teamLeadId },
                        data: { role: 'MARKETER' }
                    });
                }
                // Promote new team lead
                await prisma.user.update({
                    where: { id: teamLeadId },
                    data: { role: 'TEAM_LEAD', teamId: id }
                });
            }

            // 2. Handle BDM Change
            if (bdmId && bdmId !== existingTeam.bdmId) {
                 await prisma.user.update({
                    where: { id: bdmId },
                    data: { role: 'BDM' }
                });
            }

            // 3. Update Team Meta
            const updatedTeam = await prisma.team.update({
                where: { id },
                data: {
                    name: name || undefined,
                    teamLeadId: teamLeadId || undefined,
                    bdmId: bdmId || undefined
                }
            });

            // 4. Handle Members
            if (memberIdsToAdd && memberIdsToAdd.length > 0) {
                await prisma.user.updateMany({
                    where: { id: { in: memberIdsToAdd } },
                    data: { teamId: id }
                });
            }

            if (memberIdsToRemove && memberIdsToRemove.length > 0) {
                 await prisma.user.updateMany({
                    where: { id: { in: memberIdsToRemove } },
                    data: { teamId: null }
                });
            }

            res.json(updatedTeam);
        } catch (error) {
            console.error("Failed to update team", error);
            res.status(500).json({ error: 'Failed to update team' });
        }
    },

    // 4. Get specific team members (For Team Lead or BDM)
    async getTeamMembers(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }; // Team ID
            
            const members = await prisma.user.findMany({
                where: { teamId: id },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    role: true,
                    createdAt: true
                }
            });

            // Quick lookup of their current month sales for the roster
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            
            const membersWithStats = await Promise.all(members.map(async (member) => {
                const payments = await prisma.payment.findMany({
                    where: { recordedByUserId: member.id, status: 'APPROVED', date: { gte: startOfMonth } },
                    select: { amount: true }
                });

                const leads = await prisma.lead.count({
                    where: { assignedToUserId: member.id, createdAt: { gte: startOfMonth } }
                });

                const clients = await prisma.lead.count({
                    where: { assignedToUserId: member.id, status: 'CLIENT', createdAt: { gte: startOfMonth } }
                });

                return {
                    ...member,
                    monthlySales: payments.reduce((sum, p) => sum + p.amount, 0),
                    leadsGenerated: leads,
                    clientsConverted: clients,
                    conversionRate: leads > 0 ? ((clients / leads) * 100).toFixed(1) : 0
                };
            }));

            res.json(membersWithStats);
        } catch (error) {
            console.error("Failed to fetch team members", error);
            res.status(500).json({ error: 'Failed to fetch team members' });
        }
    }
};
