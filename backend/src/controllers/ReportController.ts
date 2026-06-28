import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';

export const ReportController = {
  async getSalesReport(req: AuthRequest, res: Response) {
    try {
      const branchId = req.user?.branchId;
      const role = req.user?.role;
      const { month, year, startDate: customStartDate, endDate: customEndDate } = req.query;

      let startDate: Date;
      let endDate: Date;

      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate as string);
        endDate = new Date(customEndDate as string);
      } else if (month && year) {
        const m = parseInt(month as string);
        const y = parseInt(year as string);

        let startDateStr;
        let endDateStr;
        
        if (m === 1) {
          startDateStr = `${y - 1}-12-26T00:00:00.000Z`;
        } else {
          startDateStr = `${y}-${(m - 1).toString().padStart(2, '0')}-26T00:00:00.000Z`;
        }
        
        endDateStr = `${y}-${m.toString().padStart(2, '0')}-25T23:59:59.999Z`;

        startDate = new Date(startDateStr);
        endDate = new Date(endDateStr);

        // Cap the endDate at the current date if the cycle is ongoing
        const now = new Date();
        if (endDate > now) {
          endDate = now;
        }
      } else {
        return res.status(400).json({ error: "Missing required parameters (month/year OR startDate/endDate)" });
      }

      const whereClause: any = {
        date: {
          gte: startDate,
          lte: endDate
        }
      };

      if (role !== 'SUPER_ADMIN' && role !== 'GLOBAL_CHAIRMAN') {
        if (!branchId) return res.status(403).json({ error: 'Not authorized for a branch' });
        whereClause.OR = [
          { sale: { marketer: { branchId: branchId } } },
          { sale: { plot: { estate: { managingBranchId: branchId } } } }
        ];
      }

      const payments = await prisma.payment.findMany({
        where: whereClause,
        include: {
          recordedByUser: true,
          sale: {
            include: {
              plot: {
                include: { estate: { include: { branch: true } } }
              },
              lead: {
                include: { assignedToUser: true }
              },
              marketer: { include: { branch: true } },
              referrer: { select: { id: true, fullName: true, email: true } },
              payments: {
                orderBy: { date: 'asc' }
              }
            }
          }
        },
        orderBy: { date: 'asc' }
      });

      const reportData = payments.map((payment, index) => {
        const sale = payment.sale;
        const allPaymentsForSale = sale.payments;
        const paymentIndex = allPaymentsForSale.findIndex(p => p.id === payment.id);
        
        let description = 'CP'; // Continuous Payment
        if (paymentIndex === 0) {
          description = 'NP'; // New Payment
        } else {
          // Calculate total paid up to this payment
          const totalPaidUpToThis = allPaymentsForSale
            .slice(0, paymentIndex + 1)
            .reduce((sum, p) => sum + p.amount, 0);
          
          if (totalPaidUpToThis >= sale.agreedPrice) {
            description = 'FP'; // Final Payment
          }
        }

        // Commission Accrued (Using Sale's marketer commission rate or 5%)
        let saleType = 'Direct Sale';
        if (role !== 'SUPER_ADMIN' && role !== 'GLOBAL_CHAIRMAN' && branchId) {
            const mBranchId = sale.marketer?.branchId;
            const estBranchId = sale.plot.estate.managingBranchId;
            if (mBranchId === branchId && estBranchId !== branchId) saleType = 'Outbound Cross-Sale';
            if (mBranchId !== branchId && estBranchId === branchId) saleType = 'Inbound Cross-Sale';
        }

        const commissionRate = sale.marketer?.commissionRate || sale.lead.assignedToUser?.commissionRate || 5.0;
        const commissionAccrued = (payment.amount * (commissionRate / 100)) - (payment.virtualLoanAmount || 0);

        let referrerName = 'N/A';
        let referralCommissionAccrued = 0;
        
        if (sale.referrer) {
            referrerName = sale.referrer.fullName;
            const refRate = sale.referrerCommissionRate || 6.0;
            referralCommissionAccrued = (payment.amount * refRate) / 100;
        }

        return {
          sn: index + 1,
          date: payment.date,
          clientName: sale.lead.fullName,
          description: description,
          amountPaid: payment.amount,
          virtualLoanAmount: payment.virtualLoanAmount || 0,
          commissionAccrued: commissionAccrued,
          referrerName: referrerName,
          referralCommissionAccrued: referralCommissionAccrued,
          estateName: sale.plot.estate.name,
          plotSize: sale.plot.size,
          isCornerPiece: sale.isCornerPiece ? 'Yes' : 'No',
          marketerName: sale.marketer?.fullName || sale.lead.assignedToUser?.fullName || 'Unassigned',
          accountPaidTo: payment.accountPaidTo || 'N/A',
          saleType: saleType,
          managingBranchName: sale.plot.estate.branch?.name || 'Head Office'
        };
      });

      res.json({
        data: reportData,
        exactStartDate: startDate.toISOString(),
        exactEndDate: endDate.toISOString()
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate sales report." });
    }
  }
};
