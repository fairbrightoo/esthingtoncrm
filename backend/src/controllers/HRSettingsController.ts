import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const HRSettingsController = {
    getSettings: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (!user.branchId || !user.companyId) {
                return res.status(400).json({ error: 'User does not belong to a valid branch setup.' });
            }

            let settings = await prisma.hRSettings.findUnique({
                where: { branchId: user.branchId }
            });

            if (!settings) {
                // Initialize default payload
                settings = await prisma.hRSettings.create({
                    data: {
                        branchId: user.branchId,
                        companyId: user.companyId
                    }
                });
            }

            res.json(settings);
        } catch (error) {
            console.error('Failed to fetch HR Settings:', error);
            res.status(500).json({ error: 'Failed to fetch HR settings' });
        }
    },

    updateSettings: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (user.role !== 'BRANCH_HR' && user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_ADMIN') {
                return res.status(403).json({ error: 'Unauthorized to modify HR Settings' });
            }

            const {
                defaultCheckInTime,
                defaultCheckOutTime,
                lateToleranceMinutes,
                annualLeaveDays,
                sickLeaveDays,
                maternityLeaveDays,
                lateDeductionFee,
                standardPensionRate,
                standardTaxRate,
                onboardingChecklist
            } = req.body;

            const updated = await prisma.hRSettings.upsert({
                where: { branchId: user.branchId },
                update: {
                    defaultCheckInTime,
                    defaultCheckOutTime,
                    lateToleranceMinutes: parseInt(lateToleranceMinutes) || 15,
                    annualLeaveDays: parseInt(annualLeaveDays) || 20,
                    sickLeaveDays: parseInt(sickLeaveDays) || 10,
                    maternityLeaveDays: parseInt(maternityLeaveDays) || 90,
                    lateDeductionFee: parseFloat(lateDeductionFee) || 0,
                    standardPensionRate: parseFloat(standardPensionRate) || 0,
                    standardTaxRate: parseFloat(standardTaxRate) || 0,
                    onboardingChecklist
                },
                create: {
                    branchId: user.branchId,
                    companyId: user.companyId,
                    defaultCheckInTime,
                    defaultCheckOutTime,
                    lateToleranceMinutes: parseInt(lateToleranceMinutes) || 15,
                    annualLeaveDays: parseInt(annualLeaveDays) || 20,
                    sickLeaveDays: parseInt(sickLeaveDays) || 10,
                    maternityLeaveDays: parseInt(maternityLeaveDays) || 90,
                    lateDeductionFee: parseFloat(lateDeductionFee) || 0,
                    standardPensionRate: parseFloat(standardPensionRate) || 0,
                    standardTaxRate: parseFloat(standardTaxRate) || 0,
                    onboardingChecklist
                }
            });

            res.json({ success: true, data: updated, message: 'HR settings updated successfully' });
        } catch (error) {
            console.error('Failed to update HR settings:', error);
            res.status(500).json({ error: 'Server error updating HR settings' });
        }
    }
};
