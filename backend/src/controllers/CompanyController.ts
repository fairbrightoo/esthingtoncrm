import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { uploadFile } from '../services/StorageService.js';

const prisma = new PrismaClient();

export const CompanyController = {
    /**
     * Get all companies (Public)
     */
    async getAllCompanies(req: Request, res: Response) {
        try {
            const companies = await prisma.company.findMany({
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    themeColor: true,
                    smsSenderId: true,
                    waPhoneNumberId: true,
                    waBusinessAccountId: true,
                    waToken: true,
                    email: true,
                    website: true,
                    address: true,
                    phone: true,
                    signatureUrl: true,
                    managingDirectorName: true
                }
            });
            res.json(companies);
        } catch (error) {
            console.error('Error fetching companies:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    /**
     * Get WhatsApp Templates from Meta (Protected)
     */
    async getWhatsAppTemplates(req: Request, res: Response) {
        const { id } = req.params as any;
        try {
            const company = await prisma.company.findUnique({ where: { id } });
            if (!company || !company.waBusinessAccountId || !company.waToken) {
                return res.status(400).json({ error: 'Company missing Meta WhatsApp Business Account ID or Token' });
            }
            const { WhatsAppService } = await import('../services/WhatsAppService.js');
            const templates = await WhatsAppService.getApprovedTemplates(company.waBusinessAccountId, company.waToken);
            res.json(templates);
        } catch (error: any) {
            console.error('Error fetching WhatsApp templates:', error.message);
            res.status(500).json({ error: error.message || 'Failed to fetch WhatsApp templates' });
        }
    },

    /**
     * Get branches for a company (Public)
     */
    async getBranchesByCompany(req: Request, res: Response) {
        const { companyId } = req.params as any;
        try {
            const branches = await prisma.branch.findMany({
                where: { companyId },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    phone: true,
                    email: true,
                    signatureUrl: true,
                    managerName: true
                }
            });
            res.json(branches);
        } catch (error) {
            console.error('Error fetching branches:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    /**
     * Create a company (Admin only - Protected)
     */
    async createCompany(req: Request, res: Response) {
        const { name, themeColor, smsSenderId, waPhoneNumberId, waBusinessAccountId, waToken, email, website } = req.body as any;
        let logoUrl: string | undefined = undefined;

        try {
            if (req.file) {
                logoUrl = await uploadFile(req.file.buffer, req.file.originalname, 'logos');
            }

            const company = await prisma.company.create({
                data: {
                    name,
                    themeColor,
                    smsSenderId,
                    waPhoneNumberId,
                    waBusinessAccountId,
                    waToken,
                    email,
                    website,
                    ...(logoUrl && { logoUrl })
                }
            });
            res.json(company);
        } catch (error) {
            console.error('Error creating company:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    /**
     * Get users for a specific branch (Public/Protected mixed, but used by authenticated dashboard)
     */
    async getBranchUsers(req: Request, res: Response) {
        const { companyId, branchId } = req.params as any;
        try {
            const users = await prisma.user.findMany({
                where: {
                    companyId,
                    branchId
                },
                select: {
                    id: true,
                    fullName: true,
                    role: true,
                    email: true,
                    phone: true,
                    dateOfBirth: true,
                    bankName: true,
                    accountName: true,
                    accountNumber: true,
                    passportUrl: true,
                    cvUrl: true,
                    agreementUrl: true
                }
            });
            res.json(users);
        } catch (error) {
            console.error('Error fetching branch users:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    },

    /**
     * Update Company details
     */
    async updateCompany(req: Request, res: Response) {
        const { id } = req.params as any;
        const { name, themeColor, smsSenderId, waPhoneNumberId, waBusinessAccountId, waToken, email, website } = req.body;
        let logoUrl: string | undefined = undefined;

        try {
            if (req.file) {
                logoUrl = await uploadFile(req.file.buffer, req.file.originalname, 'logos');
            }

            const company = await prisma.company.update({
                where: { id },
                data: { 
                    name, 
                    themeColor, 
                    smsSenderId,
                    waPhoneNumberId,
                    waBusinessAccountId,
                    waToken,
                    email,
                    website,
                    ...(logoUrl && { logoUrl }) 
                }
            });
            res.json(company);
        } catch (error) {
            console.error('Error updating company:', error);
            res.status(500).json({ error: 'Failed to update company' });
        }
    },

    /**
     * Delete Company (Safe delete - will fail if records exist)
     */
    async deleteCompany(req: Request, res: Response) {
        const { id } = req.params as any;
        try {
            await prisma.company.delete({ where: { id } });
            res.json({ message: 'Company deleted successfully' });
        } catch (error) {
            console.error('Error deleting company:', error);
            res.status(400).json({ error: 'Cannot delete company. It may have associated branches, users, or leads.' });
        }
    },

    /**
     * Create a new Branch
     */
    async createBranch(req: Request, res: Response) {
        const { id } = req.params as any; // Company ID from URL
        const { name, address, phone, email } = req.body;
        try {
            const branch = await prisma.branch.create({
                data: {
                    companyId: id,
                    name,
                    address,
                    phone,
                    email
                }
            });
            res.json(branch);
        } catch (error) {
            console.error('Error creating branch:', error);
            res.status(500).json({ error: 'Failed to create branch' });
        }
    },

    /**
     * Update Branch
     */
    async updateBranch(req: Request, res: Response) {
        const { id } = req.params as any; // Branch ID
        const { name, address, phone, email, managerName } = req.body;
        let signatureUrl: string | undefined = undefined;

        try {
            if (req.file) {
                signatureUrl = await uploadFile(req.file.buffer, req.file.originalname, 'signatures');
            }

            const branch = await prisma.branch.update({
                where: { id },
                data: { 
                    name, 
                    address, 
                    phone, 
                    email,
                    ...(managerName && { managerName }),
                    ...(signatureUrl && { signatureUrl })
                }
            });
            res.json(branch);
        } catch (error) {
            console.error('Error updating branch:', error);
            res.status(500).json({ error: 'Failed to update branch' });
        }
    },

    /**
     * Delete Branch
     */
    async deleteBranch(req: Request, res: Response) {
        const { id } = req.params as any;
        try {
            await prisma.branch.delete({ where: { id } });
            res.json({ message: 'Branch deleted successfully' });
        } catch (error) {
            console.error('Error deleting branch:', error);
            res.status(400).json({ error: 'Cannot delete branch. It may have active users or leads.' });
        }
    },

    /**
     * Get Group MDs
     */
    async getGroupMDs(req: Request, res: Response) {
        const { id } = req.params;
        try {
            const mds = await prisma.user.findMany({
                where: { companyId: id, role: 'GROUP_MANAGING_DIRECTOR' }
            });
            res.json(mds);
        } catch (error) {
            console.error('Error fetching Group MDs:', error);
            res.status(500).json({ error: 'Failed to fetch' });
        }
    },

    /**
     * Create Group Managing Director (GMD)
     */
    async createGroupMD(req: Request, res: Response) {
        const { id } = req.params as any; // companyId
        const { fullName, email, password } = req.body;

        try {
            const existingGMD = await prisma.user.findFirst({
                where: { companyId: id, role: 'GROUP_MANAGING_DIRECTOR' }
            });
            if (existingGMD) {
                return res.status(400).json({ error: 'A Group Managing Director already exists for this company. You can only have one at a time.' });
            }

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const user = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    passwordHash,
                    role: 'GROUP_MANAGING_DIRECTOR',
                    companyId: id,
                    branchId: null
                }
            });

            res.json(user);
        } catch (error) {
            console.error('Error creating Group MD:', error);
            res.status(500).json({ error: 'Failed to create Group MD' });
        }
    },

    /**
     * Create Branch Admin
     */
    async createBranchAdmin(req: Request, res: Response) {
        const { companyId, branchId } = req.params as any;
        const { fullName, email, password } = req.body;

        try {
            // Check if user exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const user = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    passwordHash,
                    role: 'BRANCH_ADMIN',
                    companyId,
                    branchId
                }
            });

            res.json(user);
        } catch (error) {
            console.error('Error creating branch admin:', error);
            res.status(500).json({ error: 'Failed to create admin' });
        }
    },

    /**
     * Create Branch Managing Director (Branch MD)
     */
    async createBranchMD(req: Request, res: Response) {
        const { companyId, branchId } = req.params as any;
        const { fullName, email, password } = req.body;

        try {
            const existingBranchMD = await prisma.user.findFirst({
                where: { branchId, role: 'MANAGING_DIRECTOR' }
            });
            if (existingBranchMD) {
                return res.status(400).json({ error: 'A Managing Director already exists for this branch. You can only have one at a time.' });
            }

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const user = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    passwordHash,
                    role: 'MANAGING_DIRECTOR',
                    companyId,
                    branchId
                }
            });

            res.json(user);
        } catch (error) {
            console.error('Error creating Branch MD:', error);
            res.status(500).json({ error: 'Failed to create Branch MD' });
        }
    },

    /**
     * Create Branch Staff (Marketer/Customer Care)
     */
    async createBranchStaff(req: Request, res: Response) {
        const { companyId, branchId } = req.params as any;
        const { fullName, email, phone, password, role, monthlySalary, commissionRate, dateOfBirth, bankName, accountName, accountNumber } = req.body;

        if (!['MARKETER', 'CUSTOMER_CARE', 'BRANCH_HR'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role for branch staff' });
        }

        try {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const user = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    phone,
                    passwordHash,
                    role, // MARKETER or CUSTOMER_CARE
                    monthlySalary: monthlySalary ? parseFloat(monthlySalary) : 0,
                    commissionRate: commissionRate ? parseFloat(commissionRate) : 5.0,
                    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                    bankName,
                    accountName,
                    accountNumber,
                    companyId,
                    branchId
                }
            });

            // Trigger n8n Webhook (Fire and Forget)
            try {
                const webhookUrl = process.env.N8N_WEBHOOK_STAFF_CREATED || 'http://localhost:5678/webhook/staff-created';
                axios.post(webhookUrl, {
                    event: 'staff.created',
                    user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
                    tempPassword: password // CAUTION: Sending password to webhook for email delivery
                }).catch(err => console.error('Webhook trigger failed (non-blocking):', err.message));
            } catch (e) {
                // Ignore
            }

            res.json(user);
        } catch (error) {
            console.error('Error creating branch staff:', error);
            res.status(500).json({ error: 'Failed to create staff' });
        }
    },

    /**
     * Update User (Admin/Staff)
     */
    async updateUser(req: Request, res: Response) {
        const { id } = req.params as any;
        const { fullName, email, phone, password, monthlySalary, commissionRate, dateOfBirth, bankName, accountName, accountNumber } = req.body;

        try {
            const data: any = { fullName, email, phone };
            if (dateOfBirth !== undefined) {
                data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
            }
            if (bankName !== undefined) {
                data.bankName = bankName;
            }
            if (accountName !== undefined) {
                data.accountName = accountName;
            }
            if (accountNumber !== undefined) {
                data.accountNumber = accountNumber;
            }
            if (monthlySalary !== undefined) {
                data.monthlySalary = parseFloat(monthlySalary) || 0;
            }
            if (commissionRate !== undefined) {
                data.commissionRate = parseFloat(commissionRate) || 0;
            }
            if (password) {
                data.passwordHash = await bcrypt.hash(password, 10);
            }

            const user = await prisma.user.update({
                where: { id },
                data
            });
            res.json(user);
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    },

    /**
     * Delete User
     */
    async deleteUser(req: Request, res: Response) {
        const { id } = req.params as any;
        try {
            await prisma.user.delete({ where: { id } });
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },

    /**
     * Bulk Create Branch Staff (CSV)
     */
    async bulkCreateBranchStaff(req: Request, res: Response) {
        const { companyId, branchId } = req.params as any;

        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        try {
            // Check if csv-parse is available
            const { parse } = require('csv-parse/sync');
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
                    if (!row.full_name || !row.email) {
                        results.failed++;
                        results.errors.push({ row, error: 'Missing name or email' });
                        continue;
                    }

                    // Strict role check
                    const role = row.role?.toUpperCase();
                    if (role && !['MARKETER', 'CUSTOMER_CARE', 'BRANCH_HR'].includes(role)) {
                        results.failed++;
                        results.errors.push({ row, error: 'Invalid role. Must be MARKETER, CUSTOMER_CARE, or BRANCH_HR' });
                        continue;
                    }

                    // Check Duplicates
                    const existing = await prisma.user.findFirst({
                        where: { email: row.email }
                    });

                    if (existing) {
                        results.duplicates.push({ row, reason: 'Staff email exists' });
                        results.failed++;
                        continue;
                    }

                    const defaultPassword = row.password || 'password123';
                    const passwordHash = await bcrypt.hash(defaultPassword, 10);

                    // Create
                    await prisma.user.create({
                        data: {
                            fullName: row.full_name,
                            email: row.email,
                            phone: row.phone || null,
                            passwordHash,
                            role: role || 'MARKETER', // Default to MARKETER
                            dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : null,
                            companyId,
                            branchId
                        }
                    });

                    results.success++;
                } catch (err: any) {
                    results.errors.push({ row, error: err.message });
                    results.failed++;
                }
            }

            res.json(results);

        } catch (error) {
            console.error('Bulk Staff Upload Error:', error);
            res.status(500).json({ error: 'Failed to process CSV' });
        }
    },

    /**
     * Upload Staff Document (Passport, CV, Agreement)
     */
    async uploadStaffDocument(req: Request, res: Response) {
        const { id } = req.params as any;
        const { documentType } = req.body; // 'passport', 'cv', 'agreement'

        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        if (!['passport', 'cv', 'agreement'].includes(documentType)) {
            res.status(400).json({ error: 'Invalid document type. Must be passport, cv, or agreement.' });
            return;
        }

        try {
            const user = await prisma.user.findUnique({ where: { id } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const fileUrl = await uploadFile(req.file.buffer, req.file.originalname, `staff-${documentType}`);

            const updateData: any = {};
            if (documentType === 'passport') updateData.passportUrl = fileUrl;
            if (documentType === 'cv') updateData.cvUrl = fileUrl;
            if (documentType === 'agreement') updateData.agreementUrl = fileUrl;

            const updatedUser = await prisma.user.update({
                where: { id },
                data: updateData
            });

            res.json(updatedUser);
        } catch (error) {
            console.error('Error uploading staff document:', error);
            res.status(500).json({ error: 'Failed to upload document' });
        }
    },

    /**
     * Delete Staff Document
     */
    async deleteStaffDocument(req: Request, res: Response) {
        const { id, documentType } = req.params as any; // 'passport', 'cv', 'agreement'

        if (!['passport', 'cv', 'agreement'].includes(documentType)) {
            res.status(400).json({ error: 'Invalid document type. Must be passport, cv, or agreement.' });
            return;
        }

        try {
            const user = await prisma.user.findUnique({ where: { id } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Determine which URL field to clear and get the file path
            let fileUrl: string | null = null;
            const updateData: any = {};

            if (documentType === 'passport') {
                fileUrl = user.passportUrl;
                updateData.passportUrl = null;
            } else if (documentType === 'cv') {
                fileUrl = user.cvUrl;
                updateData.cvUrl = null;
            } else if (documentType === 'agreement') {
                fileUrl = user.agreementUrl;
                updateData.agreementUrl = null;
            }

            // Remove file from filesystem if it exists
            if (fileUrl) {
                const fileName = fileUrl.replace('/uploads/', '');
                const filePath = path.join(process.cwd(), 'uploads', fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            // Update database
            const updatedUser = await prisma.user.update({
                where: { id },
                data: updateData
            });

            res.json(updatedUser);
        } catch (error) {
            console.error('Error deleting staff document:', error);
            res.status(500).json({ error: 'Failed to delete document' });
        }
    }
};
