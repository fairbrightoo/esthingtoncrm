import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';


export const PayrollController = {
  // Compute or Retrieve Payroll for a specific month/year
  async getBranchPayroll(req: AuthRequest, res: Response) {
    try {
      let branchId = req.user?.branchId;
      const role = req.user?.role;
      const isGlobalRole = role && ['SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR', 'GLOBAL_ACCOUNTANT'].includes(role);
      if (isGlobalRole && req.query.branchId !== undefined) {
          branchId = req.query.branchId as string;
      }
      const { month, year } = req.query;

      if ((!branchId && !isGlobalRole) || !month || !year) {
        return res.status(400).json({ error: "Missing required parameters (month, year)" });
      }

      const m = parseInt(month as string);
      const y = parseInt(year as string);

      // Get Active Staff
      const staffWhere: any = {
        isActive: true,
        role: { not: 'MANAGING_DIRECTOR' }
      };
      if (branchId) {
        staffWhere.branchId = branchId;
      }

      const staffList = await prisma.user.findMany({
        where: staffWhere
      });

      // Get HR Settings for late deduction
      let defaultLateFee = 0;
      let hrSettingsMap: Record<string, number> = {};

      if (branchId) {
          const hrSettings = await prisma.hRSettings.findUnique({
            where: { branchId }
          });
          defaultLateFee = hrSettings?.lateDeductionFee || 0;
          hrSettingsMap[branchId] = defaultLateFee;
      }

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

          // Determine late fee for this staff's branch
          let staffLateFee = defaultLateFee;
          if (!branchId && staff.branchId) {
              if (hrSettingsMap[staff.branchId] !== undefined) {
                  staffLateFee = hrSettingsMap[staff.branchId];
              } else {
                  const s = await prisma.hRSettings.findUnique({ where: { branchId: staff.branchId } });
                  staffLateFee = s?.lateDeductionFee || 0;
                  hrSettingsMap[staff.branchId] = staffLateFee;
              }
          }

          const lateDays = attendances.filter(a => a.status === 'LATE').length;
          const deductions = lateDays * staffLateFee;
          const baseSalary = staff.monthlySalary || 0;
          const netPay = Math.max(0, baseSalary - deductions);

          record = await prisma.payrollRecord.create({
            data: {
              staffId: staff.id,
              companyId: staff.companyId!,
              branchId: (branchId || staff.branchId) as string,
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
          const { month, year, branchId: reqBranchId } = req.body;
          let branchId = req.user?.branchId;
          const role = req.user?.role;
          
          if (role && ['SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GROUP_MANAGING_DIRECTOR', 'GLOBAL_ACCOUNTANT'].includes(role) && reqBranchId) {
              branchId = reqBranchId as string;
          }
          
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
