import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';


const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const AuthController = {
    async login(req: Request, res: Response) {
        try {
            console.log('Login attempt:', req.body);
            const { email, password } = req.body;

            const user = await prisma.user.findUnique({
                where: { email },
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

            // Strict Validation for Multi-Tenancy
            // Strict Validation for Multi-Tenancy
            const reqCompanyId = req.body.companyId;
            const reqBranchId = req.body.branchId;

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
                    passwordResetRequired: user.passwordResetRequired
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
