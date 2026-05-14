import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { generateEmployeeId } from '../utils/EmployeeIdGenerator.js';


export const GlobalUserController = {
    // 1. Fetch all users systematically for the Global Table
    getAllUsers: async (req: Request, res: Response) => {
        try {
            const { role, companyId, branchId } = req.query;

            const where: any = {};
            if (role && role !== 'ALL') where.role = role;
            if (companyId && companyId !== 'ALL') where.companyId = companyId;
            if (branchId && branchId !== 'ALL') where.branchId = branchId;

            const users = await prisma.user.findMany({
                where,
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    role: true,
                    isActive: true, // Requires schema update
                    monthlySalary: true,
                    commissionRate: true,
                    createdAt: true,
                    company: { select: { id: true, name: true } },
                    branch: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json({ success: true, count: users.length, data: users });
        } catch (error) {
            console.error('Failed to parse global users:', error);
            res.status(500).json({ error: 'Failed to parse global users' });
        }
    },

    // 2. The God-Mode Update Command
    updateUser: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const {
                role,
                companyId,
                branchId,
                monthlySalary,
                commissionRate,
                isActive
            } = req.body;

            // Enforce logic checks before allowing mutations
            const updateData: any = {};

            if (role) updateData.role = role as string;
            if (companyId !== undefined) updateData.companyId = companyId === 'REMOVE' ? null : companyId;
            if (branchId !== undefined) updateData.branchId = branchId === 'REMOVE' ? null : branchId;
            if (monthlySalary !== undefined) updateData.monthlySalary = parseFloat(monthlySalary) || 0;
            if (commissionRate !== undefined) updateData.commissionRate = parseFloat(commissionRate) || 0;
            if (isActive !== undefined) updateData.isActive = typeof isActive === 'string' ? isActive === 'true' : Boolean(isActive);
            if (req.body.password) {
                updateData.passwordHash = await bcrypt.hash(req.body.password, 10);
            }

            const updatedUser = await prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    fullName: true,
                    role: true,
                    isActive: true,
                    monthlySalary: true,
                    commissionRate: true,
                    company: { select: { name: true } },
                    branch: { select: { name: true } }
                }
            });

            res.json({ success: true, data: updatedUser, message: 'User updated successfully' });
        } catch (error) {
            console.error('Failed to update system user:', error);
            res.status(500).json({ error: 'Failed to execute system user update' });
        }
    },

    // 3. User Password Update
    changePassword: async (req: Request, res: Response) => {
        try {
            const { userId, currentPassword, newPassword } = req.body;

            // Technically, we should derive userId from `req.user` in real scenario, 
            // but since frontend passes it and auth checks token, this serves the purpose.
            if (!userId || !currentPassword || !newPassword) {
                res.status(400).json({ error: 'Missing required password fields.' });
                return;
            }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                res.status(404).json({ error: 'User not found.' });
                return;
            }

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                res.status(401).json({ error: 'Incorrect current password.' });
                return;
            }

            // Hash new password securely
            const salt = await bcrypt.genSalt(10);
            const hashedNewPassword = await bcrypt.hash(newPassword, salt);

            // Commit the update
            await prisma.user.update({
                where: { id: userId },
                data: { passwordHash: hashedNewPassword }
            });

            res.json({ success: true, message: 'Password updated successfully!' });
        } catch (error) {
            console.error('Failed to change password:', error);
            res.status(500).json({ error: 'An error occurred while upgrading securing.' });
        }
    },

    // 4. God-Mode Impersonation
    impersonateUser: async (req: Request, res: Response) => {
        try {
            const reqUser = (req as any).user;
            // Verify requesting user is SUPER_ADMIN
            if (!reqUser || reqUser.role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Unauthorized: Only Super Admins can impersonate users.' });
            }

            const targetUserId = req.params.id as string;
            
            // Cannot impersonate yourself (pointless)
            if (reqUser.userId === targetUserId) {
                return res.status(400).json({ error: 'Cannot impersonate yourself.' });
            }

            // Fetch target user complete with payload needed for JWT and frontend
            const targetUser = await prisma.user.findUnique({
                where: { id: targetUserId },
                include: {
                    company: true,
                    branch: true
                }
            }) as any;

            if (!targetUser) {
                return res.status(404).json({ error: 'Target user not found.' });
            }

            if (!targetUser.isActive) {
                return res.status(403).json({ error: 'Target user account is suspended.' });
            }

            // Construct exact same JWT token structure as AuthController.login
            const tokenPayload = {
                userId: targetUser.id,
                email: targetUser.email,
                role: targetUser.role,
                companyId: targetUser.companyId,
                branchId: targetUser.branchId
            };

            const token = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '24h' }
            );

            // Construct user object to return
            const userForFrontend = {
                id: targetUser.id,
                email: targetUser.email,
                fullName: targetUser.fullName,
                role: targetUser.role,
                companyId: targetUser.companyId,
                branchId: targetUser.branchId,
                company: targetUser.company,
                branch: targetUser.branch
            };

            res.status(200).json({
                message: `Successfully impersonating ${targetUser.fullName}`,
                token,
                user: userForFrontend
            });

        } catch (error) {
            console.error('Failed to impersonate user:', error);
            res.status(500).json({ error: 'An error occurred while attempting to impersonate.' });
        }
    },

    // 4. Global Chairman Management
    getGlobalChairman: async (req: Request, res: Response) => {
        try {
            const chairman = await prisma.user.findFirst({
                where: { role: 'GLOBAL_CHAIRMAN' },
                select: { id: true, fullName: true, email: true, role: true }
            });
            res.json(chairman);
        } catch (error) {
            console.error('Failed to get Global Chairman:', error);
            res.status(500).json({ error: 'Failed to fetch Global Chairman' });
        }
    },

    saveGlobalChairman: async (req: Request, res: Response) => {
        try {
            const { fullName, email, password } = req.body;
            if (!email || !fullName) {
                return res.status(400).json({ error: 'Email and full name are required' });
            }

            let chairman = await prisma.user.findFirst({
                where: { role: 'GLOBAL_CHAIRMAN' }
            });

            const bcrypt = (await import('bcryptjs')).default;
            let passwordHash = chairman ? chairman.passwordHash : null;
            
            if (password) {
                passwordHash = await bcrypt.hash(password, 10);
            }

            if (!chairman) {
                // We need the HQ Company to link the Chairman to.
                let hqCompany = await prisma.company.findUnique({ where: { name: 'Esthington Group HQ' } });
                if (!hqCompany) {
                    hqCompany = await prisma.company.create({
                        data: {
                            name: 'Esthington Group HQ',
                            themeColor: '#0f172a' // Esthington Corporate Slate
                        }
                    });
                }
                
                if (!passwordHash) return res.status(400).json({ error: 'Password is required for new Chairman' });

                const employeeId = await generateEmployeeId(hqCompany.id, null, 'GLOBAL_CHAIRMAN');
                chairman = await prisma.user.create({
                    data: {
                        employeeId,
                        fullName,
                        email,
                        role: 'GLOBAL_CHAIRMAN',
                        passwordHash,
                        companyId: hqCompany.id,
                        isActive: true
                    }
                });
            } else {
                chairman = await prisma.user.update({
                    where: { id: chairman.id },
                    data: { fullName, email, ...(passwordHash && { passwordHash }) }
                });
            }

            if (password) {
                // Send Email only if password was provided/updated
                const { EmailService } = await import('../services/EmailService.js');
                const html = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #1e3a8a; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0;">Welcome to Esthington Global Command Center</h2>
                    </div>
                    <div style="padding: 30px;">
                        <p>Dear <strong>${chairman.fullName}</strong>,</p>
                        <p>Your Global Chairman credentials have been securely provisioned. You can now access your master command center to oversee all subsidiaries and operations.</p>
                        
                        <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="margin: 0 0 10px 0;"><strong>Your Private Credentials:</strong></p>
                            <p style="margin: 5px 0;"><strong>Role:</strong> Global Chairman</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                        </div>
                        
                        <p style="margin-top: 25px;">Please log in through the master Company Portal. For maximum security, we recommend that you navigate to your Profile Settings and change your password immediately after logging in.</p>
                        
                        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Best regards,<br>Esthington Group Intelligence</p>
                    </div>
                </div>
                `;
                await EmailService.send(email, 'Your Global Chairman Secure Credentials', html);
            }

            res.json({ success: true, message: 'Global Chairman saved successfully' });
        } catch (error) {
            console.error('Failed to save Global Chairman:', error);
            res.status(500).json({ error: 'Failed to save Global Chairman' });
        }
    },

    deleteGlobalChairman: async (req: Request, res: Response) => {
        try {
            const chairman = await prisma.user.findFirst({
                where: { role: 'GLOBAL_CHAIRMAN' }
            });
            if (!chairman) return res.status(404).json({ error: 'Global Chairman not found' });

            const deletedEmail = `${chairman.email}.deleted.${Date.now()}`;
            await prisma.user.update({ 
                where: { id: chairman.id },
                data: {
                    isActive: false,
                    email: deletedEmail,
                    role: 'DELETED_GLOBAL_CHAIRMAN'
                }
            });
            res.json({ success: true, message: 'Global Chairman removed' });
        } catch (error) {
            console.error('Failed to delete Global Chairman:', error);
            res.status(500).json({ error: 'Failed to delete Global Chairman' });
        }
    }
};
