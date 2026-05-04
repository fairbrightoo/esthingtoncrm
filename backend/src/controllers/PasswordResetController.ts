import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { EmailService } from '../services/EmailService.js';

export const PasswordResetController = {
    async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: "Email is required" });
            }

            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                // Return success even if user doesn't exist to prevent email enumeration
                return res.status(200).json({ message: "If an account exists with that email, a reset link has been sent." });
            }

            // Generate a secure token
            const resetToken = crypto.randomBytes(32).toString('hex');
            // Token expires in 1 hour
            const resetTokenExpiry = new Date(Date.now() + 3600000);

            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken, resetTokenExpiry }
            });

            // Send email
            const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
            // Render frontend URL if deployed
            const actualFrontendUrl = frontendUrl.includes('localhost') && process.env.NODE_ENV === 'production' 
                ? 'https://esthington-os-frontend.onrender.com' 
                : frontendUrl;

            let resetLink = `${actualFrontendUrl}/reset-password?token=${resetToken}`;
            if (user.companyId) resetLink += `&companyId=${user.companyId}`;
            if (user.branchId) resetLink += `&branchId=${user.branchId}`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1e293b; margin-bottom: 20px;">Password Reset Request</h2>
                    <p style="color: #334155; line-height: 1.6;">Hello ${user.fullName},</p>
                    <p style="color: #334155; line-height: 1.6;">We received a request to reset your workspace password. If you didn't make this request, you can safely ignore this email.</p>
                    <p style="color: #334155; line-height: 1.6;">Click the button below to set a new password. This link will expire in 1 hour.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="color: #334155; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #64748b; font-size: 14px; background: #f8fafc; padding: 10px; border-radius: 4px;">${resetLink}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">Protected by Esthington Security</p>
                </div>
            `;

            await EmailService.send(
                user.email,
                "Reset Your Password",
                html
            );

            res.status(200).json({ message: "If an account exists with that email, a reset link has been sent." });
        } catch (error: any) {
            console.error("Forgot Password Error:", error);
            res.status(500).json({ error: "Failed to process request" });
        }
    },

    async resetPassword(req: Request, res: Response) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                return res.status(400).json({ error: "Token and new password are required" });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ error: "Password must be at least 8 characters long" });
            }

            const user = await prisma.user.findFirst({
                where: {
                    resetToken: token,
                    resetTokenExpiry: {
                        gt: new Date()
                    }
                }
            });

            if (!user) {
                return res.status(400).json({ error: "Invalid or expired reset token" });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPassword, salt);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordHash,
                    resetToken: null,
                    resetTokenExpiry: null,
                    passwordResetRequired: false
                }
            });

            res.status(200).json({ message: "Password has been successfully reset" });
        } catch (error: any) {
            console.error("Reset Password Error:", error);
            res.status(500).json({ error: "Failed to reset password" });
        }
    }
};
