
import { Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma.js';
import { uploadFile } from '../services/StorageService.js';


export const LeadController = {
    // Public Widget Lead Generation Endpoint
    async receiveWidgetLead(req: Request, res: Response) {
        try {
            const { fullName, phone, email, source, companyId, branchId } = req.body;

            if (!fullName || !phone || !companyId) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            // Verify company exists
            const company = await prisma.company.findUnique({ where: { id: companyId } });
            if (!company) {
                return res.status(404).json({ error: 'Company not found' });
            }

            // Simple de-duplication based on phone
            const phoneSuffix = phone.slice(-10);
            const existingLead = await prisma.lead.findFirst({
                where: { phone: { contains: phoneSuffix } }
            });

            if (existingLead) {
                return res.status(200).json({ message: 'Lead already exists', lead: existingLead });
            }

            // Optionally auto-assign to Customer Care User of that company
            let targetUserId = null;
            const ccr = await prisma.user.findFirst({
                where: { companyId, role: 'CUSTOMER_CARE' }
            });
            if (ccr) targetUserId = ccr.id;

            const newLead = await prisma.lead.create({
                data: {
                    fullName,
                    phone,
                    email: email || null,
                    source: source || 'LANDING_PAGE',
                    status: 'PROSPECT',
                    companyId,
                    branchId: branchId || null,
                    assignedToUserId: targetUserId
                }
            });

            // Zero-minute AI greeting
            if (newLead.whatsappOptIn && company.waToken && company.waPhoneNumberId) {
                setTimeout(async () => {
                    try {
                        const { AIConciergeService } = await import('../services/AIConciergeService.js');
                        const { WhatsAppService } = await import('../services/WhatsAppService.js');
                        // Prod the AI to generate a contextual welcome message
                        const userContext = `System Action: A new user named ${newLead.fullName} just submitted the website inquiry form. Give them a short, professional welcome message.`;
                        const aiReply = await AIConciergeService.handleIncomingMessage(newLead.id, userContext, company.id);
                        if (aiReply) {
                            await WhatsAppService.sendText(newLead.phone, aiReply, company.waPhoneNumberId!, company.waToken!);
                        }
                    } catch (e) {
                         console.error("Failed to send zero-minute AI greeting", e);
                    }
                }, 1000);
            }

            return res.status(201).json({ message: 'Lead created successfully', lead: newLead });
        } catch (error) {
            console.error('Widget Lead Error:', error);
            // Always return 200/500 appropriately without crashing caller
            return res.status(500).json({ error: 'Failed to process lead' });
        }
    },

    // Get all leads (Filtered by Role)
    
    // Super Admin: Global Clients Database
    async getGlobalClients(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const { companyId, branchId } = req.query;
            
            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });

            // STRICT ROLE CHECK: Only SUPER_ADMIN
            if (!user || user.role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Access denied. Only Super Admin can view global clients.' });
            }

            let whereClause: any = {};
            if (companyId && companyId !== 'ALL') {
                whereClause.companyId = String(companyId);
            }
            if (branchId && branchId !== 'ALL') {
                whereClause.branchId = String(branchId);
            }

            const leads = await prisma.lead.findMany({
                where: whereClause,
                include: {
                    company: { select: { name: true } },
                    branch: { select: { name: true } },
                    assignedToUser: { select: { fullName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(leads);
        } catch (error) {
            console.error('Global Clients Error:', error);
            res.status(500).json({ error: 'Failed to fetch global clients' });
        }
    },

    async getLeads(req: Request, res: Response) {
        // @ts-ignore - User attached by authMiddleware
        const tokenUser = req.user;
        const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });

        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        const { status, search, source, scope, page, limit } = req.query;

        try {
            let whereClause: any = {
                companyId: user.companyId // Always restricted to company
            };

            // Role-Based Filters
            if (scope === 'my' || ['MARKETER', 'TEAM_LEAD', 'BDM', 'HEAD_BDD', 'SITE_EXPERT', 'ICT_ORACLE', 'BRANCH_HR', 'ACCOUNTANT'].includes(user.role)) {
                // Drop companyId restriction to allow cross-company leads to appear
                delete whereClause.companyId;

                whereClause.AND = [
                    ...(whereClause.AND || []),
                    {
                        OR: [
                            { assignedToUserId: user.id },
                            { sales: { some: { marketerId: user.id } } }
                        ]
                    }
                ];
            } else if (scope === 'cross-sales') {
                if (user.branchId) {
                    // Drop companyId restriction to allow cross-company clients to appear
                    delete whereClause.companyId;
                    
                    whereClause.branchId = { not: user.branchId };
                    whereClause.AND = [
                        ...(whereClause.AND || []),
                        { sales: { some: { marketer: { branchId: user.branchId } } } }
                    ];
                }
            } else if (user.role === 'BRANCH_ADMIN' || user.role === 'CUSTOMER_CARE') {
                if (user.branchId) {
                    whereClause.branchId = user.branchId;
                }
            }
            // SUPER_ADMIN and MANAGING_DIRECTOR see all in company (already set)

            // Status Filter
            if (status && status !== 'ALL') {
                whereClause.status = status;
            }

            // Search (Name, Email, Phone)
            if (search) {
                whereClause.AND = [
                    ...(whereClause.AND || []),
                    {
                        OR: [
                            { fullName: { contains: String(search) } },
                            { email: { contains: String(search) } },
                            { phone: { contains: String(search) } }
                        ]
                    }
                ];
            }

            const takeLimit = limit ? parseInt(limit as string) : 5000;
            const skipOffset = page && limit ? (parseInt(page as string) - 1) * takeLimit : 0;

            const leads = await prisma.lead.findMany({
                where: whereClause,
                include: {
                    assignedToUser: {
                        select: { id: true, fullName: true, email: true }
                    },
                    branch: { select: { name: true } },
                    company: { select: { abbreviation: true, name: true } },
                    activities: {
                        take: 1,
                        orderBy: { timestamp: 'desc' }
                    }
                },
                orderBy: { updatedAt: 'desc' },
                skip: skipOffset,
                take: takeLimit
            });

            if (page && limit) {
                const totalCount = await prisma.lead.count({ where: whereClause });
                return res.json({
                    leads,
                    totalCount,
                    totalPages: Math.ceil(totalCount / takeLimit),
                    currentPage: parseInt(page as string)
                });
            }

            // SQLite might need manual validation if case-insensitive search is required, 
            // but for MVP this is fine.

            res.json(leads);
        } catch (error) {
            console.error('Get Leads Error:', error);
            res.status(500).json({ error: 'Failed to fetch leads' });
        }
    },

    // Global Search for Branch Admins / GMs to facilitate cross-selling
    async globalSearchByPhone(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const { phone } = req.query;

            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
            if (!user || !['BRANCH_ADMIN', 'GENERAL_MANAGER', 'MANAGING_DIRECTOR', 'SUPER_ADMIN'].includes(user.role)) {
                return res.status(403).json({ error: 'Access denied. Only branch administrators can perform global searches.' });
            }

            if (!phone || String(phone).length < 5) {
                return res.status(400).json({ error: 'Please provide a valid phone number.' });
            }

            const leads = await prisma.lead.findMany({
                where: { phone: { contains: String(phone) } },
                include: {
                    assignedToUser: { select: { id: true, fullName: true, email: true } },
                    company: { select: { name: true } },
                    branch: { select: { name: true } }
                },
                take: 10
            });

            res.json(leads);
        } catch (error) {
            console.error('Global Search Error:', error);
            res.status(500).json({ error: 'Failed to search leads globally' });
        }
    },

    // Get Single Lead
    async getLeadById(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const { id } = req.params as { id: string };

            const lead = await prisma.lead.findUnique({
                where: { id },
                include: {
                    assignedToUser: {
                        select: { id: true, fullName: true, email: true }
                    }
                }
            });

            if (!lead) {
                res.status(404).json({ error: 'Lead not found' });
                return;
            }

            // Security: Check Company Access
            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
            if (!user || user.companyId !== lead.companyId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            res.json(lead);
        } catch (error) {
            console.error('Get Lead Error:', error);
            res.status(500).json({ error: 'Failed to fetch lead' });
        }
    },

    // Create Lead (Manual - mainly for Admins/CC, Marketers usually use bulk or landing page)
    async createLead(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });

            if (!user) {
                res.status(401).json({ error: 'User not found' });
                return;
            }

            const { fullName, phone, email, gender, source, assignedToUserId, dateOfBirth, address, occupation, nextOfKinName, nextOfKinPhone, whatsappOptIn } = req.body;


            // Integrity Check: Email/Phone Uniqueness Global
            const existing = await prisma.lead.findFirst({
                where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] }
            });

            if (existing) {
                res.status(400).json({ error: 'Lead with this email or phone already exists.' });
                return;
            }

            if (!user.companyId) {
                res.status(400).json({ error: 'User does not belong to a company.' });
                return;
            }

            const lead = await prisma.lead.create({
                data: {
                    fullName: String(fullName),
                    phone: String(phone),
                    email: email ? String(email) : null,
                    gender: gender ? String(gender) : null,
                    source: source ? String(source) : null, // New Field
                    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                    address: address ? String(address) : null,
                    occupation: occupation ? String(occupation) : null,
                    nextOfKinName: nextOfKinName ? String(nextOfKinName) : null,
                    nextOfKinPhone: nextOfKinPhone ? String(nextOfKinPhone) : null,
                    whatsappOptIn: whatsappOptIn !== undefined ? Boolean(whatsappOptIn) : true,
                    status: 'PROSPECT',
                    companyId: user.companyId,
                    branchId: user.branchId, // Defaults to creator's branch
                    // If creator is Marketer, assign to self. If Admin, use provided ID or self.
                    assignedToUserId: assignedToUserId ? String(assignedToUserId) : user.id
                }
            });

            // Trigger n8n Webhook (Fire and Forget)
            try {
                const webhookUrl = process.env.N8N_WEBHOOK_LEAD_CREATED || 'http://localhost:5678/webhook/lead-created';
                axios.post(webhookUrl, {
                    event: 'lead.created',
                    lead: lead,
                    createdBy: user.id
                }).catch(err => console.error('Webhook trigger failed (non-blocking):', err.message));
            } catch (e) {
                // Ignore sync errors
            }

            res.json(lead);
        } catch (error) {
            console.error('Create Lead Error:', error);
            res.status(500).json({ error: 'Failed to create lead' });
        }
    },

    // Assign/Re-assign Lead
    async assignLead(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { id } = req.params as { id: string };
            const { assignedToUserId } = req.body;

            // Check permissions (Only Admins/CC can reassign)
            if (user.role === 'MARKETER') {
                res.status(403).json({ error: 'Marketers cannot re-assign leads.' });
                return;
            }

            // Verify Target User exists and is in same branch/company
            const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
            const targetUser = await prisma.user.findUnique({ where: { id: assignedToUserId } });

            if (!dbUser || !targetUser) {
                res.status(404).json({ error: 'User not found.' });
                return;
            }
            if (targetUser.companyId !== dbUser.companyId) { // Strict Company Check
                res.status(400).json({ error: 'Cannot assign to user in different company.' });
                return;
            }
            // For now, let's enforce Branch check if the Current User is a Branch Admin
            if (dbUser.role === 'BRANCH_ADMIN' && targetUser.branchId !== dbUser.branchId) {
                res.status(400).json({ error: 'Cannot assign to user in different branch.' });
                return;
            }

            const updatedLead = await prisma.lead.update({
                where: { id },
                data: { assignedToUserId }
            });

            res.json(updatedLead);
        } catch (error) {
            console.error('Assign Lead Error:', error);
            res.status(500).json({ error: 'Failed to assign lead' });
        }
    },

    // Update Lead Details
    async updateLead(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { id } = req.params as { id: string };
            const { fullName, phone, email, gender, source, dateOfBirth, address, occupation, nextOfKinName, nextOfKinPhone, whatsappOptIn, govtIdType } = req.body;

            // Fetch the lead to check existence and permissions
            const lead = await prisma.lead.findUnique({ where: { id } });
            if (!lead) {
                res.status(404).json({ error: 'Lead not found.' });
                return;
            }

            // Optional: Role-based permissions. For now, we assume anyone who can view it can edit it.
            // Check uniqueness of phone & email. Exclude this lead's ID.
            const existing = await prisma.lead.findFirst({
                where: {
                    id: { not: id },
                    OR: [
                        ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
                        ...(phone ? [{ phone }] : [])
                    ]
                }
            });

            if (existing) {
                res.status(400).json({ error: 'Another lead with this email or phone already exists.' });
                return;
            }

            const updateData: any = {};
            if (fullName !== undefined && fullName !== '') updateData.fullName = String(fullName);
            if (phone !== undefined && phone !== '') updateData.phone = String(phone);
            if (email !== undefined) updateData.email = email ? String(email) : null;
            if (gender !== undefined) updateData.gender = gender ? String(gender) : null;
            if (source !== undefined) updateData.source = source ? String(source) : null;
            if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
            if (address !== undefined) updateData.address = address ? String(address) : null;
            if (occupation !== undefined) updateData.occupation = occupation ? String(occupation) : null;
            if (nextOfKinName !== undefined) updateData.nextOfKinName = nextOfKinName ? String(nextOfKinName) : null;
            if (nextOfKinPhone !== undefined) updateData.nextOfKinPhone = nextOfKinPhone ? String(nextOfKinPhone) : null;
            if (whatsappOptIn !== undefined) updateData.whatsappOptIn = Boolean(whatsappOptIn);
            if (govtIdType !== undefined) updateData.govtIdType = govtIdType ? String(govtIdType) : null;

            // Handle KYC Files
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            
                        if (files?.profilePicture?.[0]) {
                updateData.profilePictureUrl = await uploadFile(files.profilePicture[0].buffer, files.profilePicture[0].originalname, 'kyc/passports');
            }
            if (files?.govtId?.[0]) {
                updateData.govtIdUrl = await uploadFile(files.govtId[0].buffer, files.govtId[0].originalname, 'kyc/ids');
            }

            // Audit Trail Logic
            const auditNotes: string[] = [];
            if (updateData.phone && updateData.phone !== lead.phone) {
                auditNotes.push(`Phone changed from ${lead.phone || 'None'} to ${updateData.phone}`);
            }
            if (updateData.email !== undefined && updateData.email !== lead.email) {
                auditNotes.push(`Email changed from ${lead.email || 'None'} to ${updateData.email || 'None'}`);
            }
            if (updateData.fullName && updateData.fullName !== lead.fullName) {
                auditNotes.push(`Name changed from ${lead.fullName} to ${updateData.fullName}`);
            }

            const updatedLead = await prisma.lead.update({
                where: { id },
                data: updateData
            });

            if (auditNotes.length > 0) {
                await prisma.activity.create({
                    data: {
                        leadId: id,
                        type: 'LEAD_UPDATED',
                        direction: 'SYSTEM',
                        notes: auditNotes.join(' | '),
                        createdByUserId: user.userId
                    }
                });
            }

            res.json(updatedLead);
        } catch (error) {
            console.error('Update Lead Error:', error);
            res.status(500).json({ error: 'Failed to update lead' });
        }
    },

    // Delete Lead
    async deleteLead(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { id } = req.params as { id: string };

            // Fetch the lead to verify existence
            const lead = await prisma.lead.findUnique({ where: { id } });
            if (!lead) {
                res.status(404).json({ error: 'Lead not found.' });
                return;
            }

            // Only allow Branch Admins and Super Admins to delete leads (or Marketers if they created it?)
            // Let's enforce that Super Admins and Branch Admins can delete. Marketers cannot.
            if (user.role === 'MARKETER') {
                res.status(403).json({ error: 'Marketers are not allowed to delete leads.' });
                return;
            }

            // Because of referential integrity, we must delete related records first or use cascading deletes.
            // Assuming cascading deletes are not fully configured for all relations, we manually clean up:
            await prisma.$transaction([
                prisma.activity.deleteMany({ where: { leadId: id } }),
                prisma.communicationLog.deleteMany({ where: { leadId: id } }),
                prisma.task.deleteMany({ where: { leadId: id } }),
                // We shouldn't delete Sales, but if a lead has sales, maybe deletion should be blocked?
                // Let's block deletion if there is an ongoing/completed sale.
            ]);

            const salesCount = await prisma.sale.count({ where: { leadId: id } });
            if (salesCount > 0) {
                res.status(400).json({ error: 'Cannot delete a lead that has associated sales. Please re-assign or archive them instead.' });
                return;
            }

            // Now delete the lead
            await prisma.lead.delete({ where: { id } });

            res.json({ success: true, message: 'Lead deleted successfully' });
        } catch (error) {
            console.error('Delete Lead Error:', error);
            res.status(500).json({ error: 'Failed to delete lead. Ensure all related data is removed.' });
        }
    },

    // Toggle Verification Status
    async toggleVerification(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { id } = req.params as { id: string };

            // Only Branch Admin or Customer Care can verify
            if (user.role === 'MARKETER') {
                res.status(403).json({ error: 'Marketers cannot verify leads.' });
                return;
            }

            // Get current status to toggle
            const lead = await prisma.lead.findUnique({ where: { id } });
            if (!lead) {
                res.status(404).json({ error: 'Lead not found' });
                return;
            }

            const updatedLead = await prisma.lead.update({
                where: { id },
                data: { isVerified: !lead.isVerified }
            });

            res.json(updatedLead);
        } catch (error) {
            console.error('Toggle Verification Error:', error);
            res.status(500).json({ error: 'Failed to verify lead' });
            res.status(500).json({ error: 'Failed to verify lead' });
        }
    },

    // Bulk Upload Leads (CSV)
    async bulkCreate(req: Request, res: Response) {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // @ts-ignore
        const tokenUser = req.user;

        try {
            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });

            if (!user) {
                res.status(401).json({ error: 'User not found' });
                return;
            }

            if (!user.companyId) {
                res.status(400).json({ error: 'User does not belong to a company.' });
                return;
            }

            const rows = parse(req.file.buffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            const results = {
                total: rows.length,
                success: 0,
                failed: 0,
                duplicates: [] as any[],
                errors: [] as any[]
            };

            for (const row of rows) {
                try {
                    // Basic Validation
                    if (!row.full_name || (!row.email && !row.phone)) {
                        results.failed++;
                        results.errors.push({ row, error: 'Missing name or contact info' });
                        continue;
                    }

                    // Check Duplicates (Global uniqueness for now, or per company?)
                    // Schema implies global uniqueness on email/phone usually, let's check.
                    // Actually our createLead checks global.
                    const existing = await prisma.lead.findFirst({
                        where: {
                            OR: [
                                ...(row.email ? [{ email: { equals: row.email, mode: 'insensitive' as const } }] : []),
                                ...(row.phone ? [{ phone: row.phone }] : [])
                            ]
                        }
                    });

                    if (existing) {
                        results.duplicates.push({ row, reason: 'Lead exists' });
                        results.failed++;
                        continue;
                    }

                    // Create
                    await prisma.lead.create({
                        data: {
                            fullName: row.full_name,
                            email: row.email || undefined,
                            phone: row.phone || "N/A", // Schema might require phone? Let's assume validation caught empty.
                            status: 'PROSPECT', // Default
                            companyId: user.companyId,
                            branchId: user.branchId, // Inherit uploader's branch.
                            assignedToUserId: ['MARKETER', 'TEAM_LEAD', 'BDM', 'HEAD_BDD', 'SITE_EXPERT', 'ICT_ORACLE', 'ACCOUNTANT'].includes(user.role) ? user.id : null
                        }
                    });

                    results.success++;
                } catch (err) {
                    // @ts-ignore
                    results.errors.push({ row, error: err.message });
                    results.failed++;
                }
            }

            res.json(results);

        } catch (error) {
            console.error('Bulk Lead Upload Error:', error);
            res.status(500).json({ error: 'Failed to process CSV' });
        }
    }
};
