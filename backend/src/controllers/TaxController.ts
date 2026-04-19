import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();

export const TaxController = {
  // Compute estimated VAT and WHT based on revenue collected (VERIFIED standard payments)
  async getComplianceEstimates(req: AuthRequest, res: Response) {
    try {
      const branchId = req.user?.branchId;
      const { month, year } = req.query;

      if (!branchId || !month || !year) {
        return res.status(400).json({ error: "Missing required parameters (month, year)" });
      }

      const m = parseInt(month as string);
      const y = parseInt(year as string);

      const payments = await prisma.payment.findMany({
        where: {
          sale: {
            plot: {
                estate: {
                    managingBranchId: branchId
                }
            }
          },
          status: { in: ['VERIFIED', 'APPROVED'] },
          date: {
            gte: new Date(y, m - 1, 1),
            lt: new Date(y, m, 1)
          }
        }
      });

      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

      // Standard Nigerian Rates (Example)
      const estimatedVat = totalRevenue * 0.075; 
      const estimatedWht = totalRevenue * 0.05;

      const remittances = await prisma.taxRemittance.findMany({
        where: {
          branchId,
          applicablePeriod: `${month}/${year}`
        },
        include: { remittedBy: true }
      });

      res.json({
        totalRevenue,
        estimatedVat,
        estimatedWht,
        remittances
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch tax estimates." });
    }
  },

  async logRemittance(req: AuthRequest, res: Response) {
    try {
      const branchId = req.user?.branchId;
      const { taxType, amount, applicablePeriod, receiptUrl } = req.body;

      if (!taxType || !amount || !applicablePeriod) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const record = await prisma.taxRemittance.create({
        data: {
          companyId: req.user!.companyId!,
          branchId,
          taxType,
          amount: parseFloat(amount),
          applicablePeriod,
          receiptUrl,
          remittedById: req.user!.userId
        }
      });

      res.json(record);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to log remittance." });
    }
  }
};
