import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();

export const PayrollController = {
  // Compute or Retrieve Payroll for a specific month/year
  async getBranchPayroll(req: AuthRequest, res: Response) {
    try {
      const branchId = req.user?.branchId;
      const { month, year } = req.query;

      if (!branchId || !month || !year) {
        return res.status(400).json({ error: "Missing required parameters (month, year)" });
      }

      const m = parseInt(month as string);
      const y = parseInt(year as string);

      // Get Active Staff
      const staffList = await prisma.user.findMany({
        where: { branchId, isActive: true }
      });

      // Get HR Settings for late deduction
      const hrSettings = await prisma.hRSettings.findUnique({
        where: { branchId }
      });
      const lateFee = hrSettings?.lateDeductionFee || 0;

      const payrollRecords = [];

      for (const staff of staffList) {
        // Find existing record
        let record = await prisma.payrollRecord.findFirst({
          where: { staffId: staff.id, month: m, year: y }
        });

        if (!record) {
          // Calculate if not exist
          const attendances = await prisma.attendance.findMany({
            where: {
              userId: staff.id,
              date: {
                gte: new Date(y, m - 1, 1),
                lt: new Date(y, m, 1)
              }
            }
          });

          const lateDays = attendances.filter(a => a.status === 'LATE').length;
          const deductions = lateDays * lateFee;
          const baseSalary = staff.monthlySalary || 0;
          const netPay = Math.max(0, baseSalary - deductions);

          record = await prisma.payrollRecord.create({
            data: {
              staffId: staff.id,
              companyId: staff.companyId!,
              branchId: branchId,
              month: m,
              year: y,
              baseSalary,
              deductions,
              netPay
            }
          });
        }
        
        // Return structured data for UI table
        payrollRecords.push({
          ...record,
          staffName: staff.fullName,
          staffRole: staff.role
        });
      }

      res.json(payrollRecords);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate payroll." });
    }
  },

  async disbursePayroll(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const record = await prisma.payrollRecord.update({
                // @ts-ignore
        where: { id },
        data: { 
          status: 'PAID', 
          paidAt: new Date(),
          processedById: req.user?.userId 
        }
      });
      res.json(record);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to disburse payroll." });
    }
  },
  
  async disburseAllPending(req: AuthRequest, res: Response) {
      try {
          const { month, year } = req.body;
          const branchId = req.user?.branchId;
          
          await prisma.payrollRecord.updateMany({
                // @ts-ignore
              where: { month: parseInt(month), year: parseInt(year), status: 'PENDING', branchId },
              data: {
                  status: 'PAID',
                  paidAt: new Date(),
                  processedById: req.user?.userId
              }
          });
          res.json({ success: true, message: "Mass disbursement successful." });
      } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Mass disbursement failed." });
      }
  }
};
