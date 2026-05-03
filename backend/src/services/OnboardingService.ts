import { parse } from 'csv-parse/sync';
import bcrypt from 'bcryptjs';
import { AutomationService } from './AutomationService.js';
import prisma from '../config/prisma.js';


interface OnboardingRow {
    full_name: string;
    phone_number: string;
    email: string;
    role?: string;
    monthly_salary?: string;
    commission_rate?: string;
    assigned_branch?: string; // Branch Name
    date_of_birth?: string; // YYYY-MM-DD
}

export const OnboardingService = {
    async processBulkUpload(fileBuffer: Buffer, companyId: string) {
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
                            { phone: row.phone_number } // Assuming phone is on User model too? Yes
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

                // Find branch if provided
                let branchId = null;
                if (row.assigned_branch) {
                    const branch = await prisma.branch.findFirst({
                        where: { name: row.assigned_branch, companyId }
                    });
                    if (branch) branchId = branch.id;
                }

                // Default role and mapping logic
                const roleValue = row.role ? row.role.toUpperCase() : 'MARKETER';
                const monthlySalary = row.monthly_salary ? parseFloat(row.monthly_salary) : 0;
                const commissionRate = row.commission_rate ? parseFloat(row.commission_rate) : 5.0;

                // Create User
                const newUser = await prisma.user.create({
                    data: {
                        fullName: row.full_name,
                        email: row.email,
                        phone: row.phone_number,
                        passwordHash,
                        companyId,
                        branchId,
                        role: roleValue,
                        monthlySalary,
                        commissionRate,
                        dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : null,
                        passwordResetRequired: true
                    }
                });

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
