import { parse } from 'csv-parse/sync';
import bcrypt from 'bcryptjs';
import { AutomationService } from './AutomationService.js';
import prisma from '../config/prisma.js';
import { generateEmployeeId } from '../utils/EmployeeIdGenerator.js';


interface OnboardingRow {
    full_name: string;
    email: string;
    phone: string;
    date_of_birth?: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    next_of_kin_name?: string;
    next_of_kin_phone?: string;
    monthly_salary?: string;
    commission_rate?: string;
    role?: string;
    registered_via_referral?: string;
}

import { EmailService } from './EmailService.js';

export const OnboardingService = {
    async processBulkUpload(fileBuffer: Buffer, companyId: string, targetBranchId: string | null, frontendUrl: string) {
        const rows = parse(fileBuffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        }) as OnboardingRow[];

        const results = {
            total: rows.length,
            success: 0,
            failed: 0,
            duplicates: [] as any[],
            errors: [] as any[]
        };

        for (const row of rows) {
            try {
                // Validation: Check global uniqueness
                const existingUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: row.email },
                            { phone: row.phone }
                        ]
                    }
                });

                if (existingUser) {
                    results.duplicates.push({ row, reason: 'User with email/phone already exists' });
                    results.failed++;
                    continue;
                }

                // Generate temp password
                const tempPassword = Math.random().toString(36).slice(-8);
                const passwordHash = await bcrypt.hash(tempPassword, 10);

                // Retrieve branch using companyId context and the branch ID mapping
                // Since this route is triggered via /api/companies/:companyId/branches/:branchId/users, the controller passes it? Wait, OnboardingController currently only passes companyId.
                // Actually we just fetch the uploading user's branch from OnboardingService or Controller.
                // Wait, if it's Branch Admin, they upload it from BranchUsers.tsx, which hits OnboardingController.
                // We'll leave branchId as is or expect it to be passed.
                // Actually OnboardingService.processBulkUpload doesn't receive branchId right now.
                // I will add branchId as an argument to processBulkUpload, and pass it from OnboardingController.

                // Default role and mapping logic
                const roleValue = row.role ? row.role.toUpperCase() : 'MARKETER';
                const monthlySalary = row.monthly_salary ? parseFloat(row.monthly_salary) : 0;
                const commissionRate = row.commission_rate ? parseFloat(row.commission_rate) : 5.0;

                // Create User
                const employeeId = await generateEmployeeId(companyId, targetBranchId, roleValue);
                const newUser = await prisma.user.create({
                    data: {
                        employeeId,
                        fullName: row.full_name,
                        email: row.email,
                        phone: row.phone,
                        passwordHash,
                        companyId,
                        branchId: targetBranchId,
                        role: roleValue,
                        monthlySalary,
                        commissionRate,
                        bankName: row.bank_name || null,
                        accountNumber: row.account_number || null,
                        accountName: row.account_name || null,
                        nextOfKinName: row.next_of_kin_name || null,
                        nextOfKinPhone: row.next_of_kin_phone || null,
                        dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : null,
                        passwordResetRequired: true
                    }
                });

                // Fetch Company details to get the Company Name for the email
                const company = await prisma.company.findUnique({ where: { id: companyId } });
                const companyName = company?.name || 'Esthington CRM';

                // Construct Login URL
                const loginUrl = `${frontendUrl}/login?companyId=${companyId}${targetBranchId ? `&branchId=${targetBranchId}` : ''}`;

                // Send Welcome Email
                await EmailService.sendWelcomeEmail(
                    newUser.email,
                    newUser.fullName,
                    companyName,
                    newUser.role,
                    loginUrl,
                    tempPassword
                );

                // Trigger Automation
                await AutomationService.triggerMarketerCreated({
                    name: newUser.fullName,
                    email: newUser.email,
                    tempToken: tempPassword
                });

                results.success++;
            } catch (error) {
                console.error('Error processing row:', row, error);
                results.errors.push({ row, error: (error as Error).message });
                results.failed++;
            }
        }

        return results;
    }
};
