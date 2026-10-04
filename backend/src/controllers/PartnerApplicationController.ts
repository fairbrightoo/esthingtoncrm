import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { EmailService } from '../services/EmailService.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const PartnerApplicationController = {
    // PUBLIC endpoint to submit application
    submitApplication: async (req: Request, res: Response) => {
        try {
            const { fullName, email, phone, companyName, documentsUrl, referralCode, branchId } = req.body;

            // Check if application already exists
            const existing = await prisma.partnerApplication.findUnique({ where: { email } });
            if (existing) {
                return res.status(400).json({ error: "An application with this email already exists." });
            }

            let referralCodeId = null;
            let assignedCompanyId = null;
            let assignedBranchId = branchId || null;
            let targetCompanyName = "Esthington Group";
            let targetBranchName = "";

            // Handle referral code scenario
            if (referralCode) {
                const code = await prisma.referralCode.findUnique({
                    where: { code: referralCode.trim().toUpperCase() },
                    include: { creator: { include: { company: true, branch: true } } }
                });
                if (!code || !code.isActive) {
                    return res.status(400).json({ error: "Invalid referral code." });
                }
                referralCodeId = code.id;
                assignedCompanyId = code.creator.companyId;
                assignedBranchId = code.creator.branchId;
                targetCompanyName = code.creator.company?.name || targetCompanyName;
                targetBranchName = code.creator.branch?.name || "";
            } 
            // Handle direct branch link scenario
            else if (branchId) {
                const branch = await prisma.branch.findUnique({
                    where: { id: branchId },
                    include: { company: true }
                });
                if (!branch) {
                    return res.status(400).json({ error: "Invalid branch ID." });
                }
                assignedCompanyId = branch.companyId;
                targetCompanyName = branch.company?.name || targetCompanyName;
                targetBranchName = branch.name;
            }

            const app = await prisma.partnerApplication.create({
                data: {
                    fullName,
                    email,
                    phone,
                    companyName,
                    documentsUrl,
                    referralCodeId,
                    assignedCompanyId,
                    assignedBranchId
                }
            });

            // Send Received Email
            const entityName = targetBranchName ? `${targetCompanyName}, ${targetBranchName} branch` : targetCompanyName;
            const subject = `Partner Application Received - ${entityName}`;
            const html = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Thank you for your interest!</h2>
                    <p>Dear ${fullName},</p>
                    <p>Thank you for your interest in partnering with <strong>${entityName}</strong>.</p>
                    <p>Your application has been received successfully and is currently under review. Please allow up to 3 business days for processing.</p>
                    <p>We will contact you via email with the final decision.</p>
                    <br>
                    <p>Best regards,<br>${entityName} Team</p>
                </div>
            `;
            await EmailService.send(email, subject, html);

            res.status(201).json({ message: "Application submitted successfully", application: app });
        } catch (error) {
            console.error("Submit Application Error:", error);
            res.status(500).json({ error: "Failed to submit application." });
        }
    },

    // PROTECTED endpoint to get applications
    getApplications: async (req: Request, res: Response) => {
        try {
            // @ts-ignore
            const { role, companyId, branchId } = req.user;
            let filter = {};

            // MD/HR sees their branch, GMD/Global HR sees all
            if (role === 'MANAGING_DIRECTOR' || role === 'BRANCH_HR') {
                filter = { assignedBranchId: branchId };
            } else if (role === 'GMD' || role === 'GLOBAL_HR') {
                filter = {};
            }

            let applications = await prisma.partnerApplication.findMany({
                where: filter,
                orderBy: { createdAt: 'desc' }
            });
            
            // manually fetch referral codes to avoid schema relation requirements
            const appsWithCodes = await Promise.all(applications.map(async (app) => {
                if (app.referralCodeId) {
                    const code = await prisma.referralCode.findUnique({
                        where: { id: app.referralCodeId },
                        include: { creator: true }
                    });
                    return { ...app, referralCode: code };
                }
                return app;
            }));

            res.json(appsWithCodes);
        } catch (error) {
            console.error("Fetch Applications Error:", error);
            res.status(500).json({ error: "Failed to fetch applications." });
        }
    },

    // PROTECTED endpoint HR Vet
    vetApplication: async (req: Request, res: Response) => {
        try {
            // @ts-ignore
            const userId = req.user.userId;
            const id = req.params.id as string;

            const app = await prisma.partnerApplication.update({
                where: { id },
                data: {
                    vettedByHR: true,
                    vettedByUserId: userId,
                    status: 'VETTED'
                }
            });
            res.json(app);
        } catch (error) {
            console.error("Vet Application Error:", error);
            res.status(500).json({ error: "Failed to vet application." });
        }
    },

    // PROTECTED endpoint MD Approve
    approveApplication: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const { commissionRate, manualUplineId } = req.body;

            const app = await prisma.partnerApplication.findUnique({
                where: { id }
            });

            if (!app) return res.status(404).json({ error: "Application not found" });
            if (app.status === 'APPROVED') return res.status(400).json({ error: "Already approved" });

            let finalCommission = commissionRate;
            let referredById = null;

            if (app.referralCodeId) {
                const code = await prisma.referralCode.findUnique({
                    where: { id: app.referralCodeId },
                    include: { creator: true }
                });
                if (code) {
                    finalCommission = code.percentage;
                    referredById = code.creator.id;
                }
            } else {
                if (!finalCommission) {
                    return res.status(400).json({ error: "Commission rate is required for direct partners." });
                }
                if (manualUplineId) {
                    referredById = manualUplineId;
                } else if (app.assignedBranchId) {
                    // Assign to MD of the branch by default
                    const md = await prisma.user.findFirst({
                        where: { branchId: app.assignedBranchId, role: 'MANAGING_DIRECTOR', isActive: true }
                    });
                    if (md) referredById = md.id;
                }
            }

            const rawPassword = crypto.randomBytes(4).toString('hex');
            const passwordHash = await bcrypt.hash(rawPassword, 10);

            // Create User (PARTNER)
            const newUser = await prisma.user.create({
                data: {
                    fullName: app.fullName,
                    email: app.email,
                    phone: app.phone,
                    role: 'PARTNER',
                    passwordHash,
                    companyId: app.assignedCompanyId,
                    branchId: app.assignedBranchId,
                    referredById,
                    referralCodeId: app.referralCodeId,
                    commissionRate: finalCommission,
                    isActive: true,
                    passwordResetRequired: true
                }
            });

            // Update app status
            await prisma.partnerApplication.update({
                where: { id },
                data: { status: 'APPROVED', commissionRate: finalCommission }
            });

            // Send Welcome Email
            const subject = "Congratulations! Partner Application Approved";
            const html = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome to the Partnership!</h2>
                    <p>Dear ${app.fullName},</p>
                    <p>Congratulations! Your application to partner with us has been officially <strong>APPROVED</strong>.</p>
                    <p>Your designated commission rate is <strong>${finalCommission}%</strong>.</p>
                    <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; border: 1px solid #E5E7EB;">
                        <h3>Your Login Credentials:</h3>
                        <p><strong>Email:</strong> ${app.email}</p>
                        <p><strong>Temporary Password:</strong> ${rawPassword}</p>
                    </div>
                    <p><strong>How to Login:</strong></p>
                    <ol>
                        <li>Visit our portal.</li>
                        <li>Select your Company and Branch (if applicable).</li>
                        <li>Enter the email and temporary password above.</li>
                    </ol>
                    <p style="color: #92400E;"><em>Please ensure you reset your password immediately upon your first login.</em></p>
                    <br>
                    <p>Best regards,<br>Management Team</p>
                </div>
            `;
            await EmailService.send(app.email, subject, html);

            // Notify Upline if assigned
            if (referredById) {
                const upline = await prisma.user.findUnique({ where: { id: referredById } });
                if (upline && upline.email) {
                    const uplineSubject = "New Partner Added to Your Downline!";
                    const uplineHtml = `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Great News!</h2>
                            <p>Dear ${upline.fullName},</p>
                            <p>A new partner, <strong>${app.fullName}</strong>, has just been approved and officially assigned to your downline network!</p>
                            <p>You can track their activities and view them in your Network Activity dashboard.</p>
                            <br>
                            <p>Keep up the great work!</p>
                        </div>
                    `;
                    await EmailService.send(upline.email, uplineSubject, uplineHtml).catch(e => console.error("Failed to send upline email:", e));
                }
            }

            res.json({ message: "Approved successfully", user: newUser });
        } catch (error) {
            console.error("Approve Application Error:", error);
            res.status(500).json({ error: "Failed to approve application." });
        }
    },

    // PROTECTED endpoint MD Reject
    rejectApplication: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const app = await prisma.partnerApplication.update({
                where: { id },
                data: { status: 'REJECTED' }
            });

            // Send Rejection Email
            const subject = "Update on your Partner Application";
            const html = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <p>Dear ${app.fullName},</p>
                    <p>Thank you for your interest in partnering with us. After reviewing your submission, we are currently unable to approve your application.</p>
                    <p>This may be due to incomplete documentation or incorrect information provided during registration.</p>
                    <p>Please reach out to our management team for guidance on how to correct your submission so we can proceed with your approval.</p>
                    <br>
                    <p>Best regards,<br>Management Team</p>
                </div>
            `;
            await EmailService.send(app.email, subject, html);

            res.json(app);
        } catch (error) {
            console.error("Reject Application Error:", error);
            res.status(500).json({ error: "Failed to reject application." });
        }
    }
};
