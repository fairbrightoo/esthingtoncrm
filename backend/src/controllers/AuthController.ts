import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';


const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const AuthController = {
    async login(req: Request, res: Response) {
        try {
            console.log('Login attempt:', req.body);
            let { email, password, passcode, companyId: reqCompanyId, branchId: reqBranchId } = req.body;
            
            let user = null;

            if (passcode) {
                // Passcode login flow
                if (!reqCompanyId) {
                    res.status(400).json({ error: 'Company ID is required for passcode login' });
                    return;
                }
                
                // Find user by passcode, company, and optionally branch
                const whereClause: any = { 
                    mobilePasscode: passcode,
                    companyId: reqCompanyId,
                    isActive: true
                };
                if (reqBranchId) whereClause.branchId = reqBranchId;

                user = await prisma.user.findFirst({
                    where: whereClause,
                    include: {
                        company: true,
                        branch: true
                    }
                });

                if (!user) {
                    res.status(401).json({ error: 'Invalid passcode or you do not have a passcode set' });
                    return;
                }
            } else {
                // Standard Email/Password login flow
                if (email) email = email.trim().replace(/\s+/g, '').toLowerCase();

                user = await prisma.user.findFirst({
                    where: { email: { equals: email, mode: 'insensitive' } },
                    include: {
                        company: true,
                        branch: true
                    }
                });

                if (!user) {
                    res.status(401).json({ error: 'Invalid credentials' });
                    return;
                }

                if (!user.isActive) {
                    res.status(403).json({ error: 'Your account has been suspended. Please contact the administrator.' });
                    return;
                }

                const isValid = await bcrypt.compare(password, user.passwordHash);
                if (!isValid) {
                    res.status(401).json({ error: 'Invalid credentials' });
                    return;
                }
            }

            // Strict Validation for Multi-Tenancy
            if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_CHAIRMAN') {
                // 1. Mandatory Company Check
                if (!reqCompanyId) {
                    res.status(403).json({ error: 'Access denied. Please login via your Company Portal.' });
                    return;
                }
                if (user.companyId && user.companyId !== reqCompanyId) {
                    res.status(403).json({ error: 'You are not authorized to access this workspace.' });
                    return;
                }

                // 2. Mandatory Branch Check for all branch-level staff
                if (user.branchId) {
                    if (reqBranchId && String(user.branchId) !== String(reqBranchId)) {
                        res.status(403).json({ error: 'Invalid credentials for this branch. Please log in from your assigned branch.' });
                        return;
                    }
                }
            }

            // Generate Token
            const token = jwt.sign(
                { userId: user.id, role: user.role, companyId: user.companyId, branchId: user.branchId },
                JWT_SECRET,
                { expiresIn: '1d' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    commissionRate: user.commissionRate,
                    referralCodeId: user.referralCodeId,
                    companyId: user.companyId,
                    branchId: user.branchId,
                    company: user.company,
                    branch: user.branch,
                    esthCoinBalance: user.esthCoinBalance,
                    passwordResetRequired: user.passwordResetRequired
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    patchCommissions: async (req: Request, res: Response) => {
        try {
            const rolesToUpdate = [
                'BRANCH_ADMIN', 'BRANCH_HR', 'GENERAL_MANAGER', 'MANAGING_DIRECTOR',
                'HEAD_BDD', 'BDM', 'TEAM_LEAD', 'GROUP_MANAGING_DIRECTOR',
                'ACCOUNTANT', 'GLOBAL_ACCOUNTANT'
            ];
            
            // Get debug info first
            const beforeUsers = await prisma.user.findMany({
                where: { role: { in: rolesToUpdate } },
                select: { email: true, role: true, commissionRate: true }
            });

            const result = await prisma.user.updateMany({
                where: {
                    role: { in: rolesToUpdate },
                    commissionRate: { lt: 10.0 }
                },
                data: {
                    commissionRate: 10.0
                }
            });
            
            res.json({ 
                message: `Successfully updated ${result.count} management users to 10% commission.`,
                debug: beforeUsers
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
};
