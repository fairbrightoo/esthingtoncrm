import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';

export const ReportController = {
  async getSalesReport(req: AuthRequest, res: Response) {
    try {
      const branchId = req.user?.branchId;
      const role = req.user?.role;
      const { month, year } = req.query;

      if (!month || !year) {
        return res.status(400).json({ error: "Missing required parameters (month, year)" });
      }

      const m = parseInt(month as string);
      const y = parseInt(year as string);

      // Cycle ends on the 25th.
      // E.g., Report for April (m=4): March 26th (m-1, 26) to April 25th (m, 25).
      let startDateStr;
      let endDateStr;
      
      if (m === 1) {
        startDateStr = `${y - 1}-12-26T00:00:00.000Z`;
      } else {
        startDateStr = `${y}-${(m - 1).toString().padStart(2, '0')}-26T00:00:00.000Z`;
      }
      
      endDateStr = `${y}-${m.toString().padStart(2, '0')}-25T23:59:59.999Z`;

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      const whereClause: any = {
        date: {
          gte: startDate,
          lte: endDate
        }
      };

      if (role !== 'SUPER_ADMIN' && role !== 'MANAGING_DIRECTOR' && role !== 'GLOBAL_CHAIRMAN') {
        if (!branchId) return res.status(403).json({ error: 'Not authorized for a branch' });
        whereClause.sale = {
          lead: {
            branchId: branchId
          }
        };
      }

      const payments = await prisma.payment.findMany({
        where: whereClause,
        include: {
          recordedByUser: true,
          sale: {
            include: {
              plot: {
                include: { estate: true }
              },
              lead: {
                include: { assignedToUser: true }
              },
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

        // Commission Accrued (Using Lead's assigned user commission rate or 5%)
        const commissionRate = sale.lead.assignedToUser?.commissionRate || 5.0;
        const commissionAccrued = payment.amount * (commissionRate / 100);

        return {
          sn: index + 1,
          date: payment.date,
          clientName: sale.lead.fullName,
          description: description,
          amountPaid: payment.amount,
          commissionAccrued: commissionAccrued,
          estateName: sale.plot.estate.name,
          plotSize: sale.plot.size,
          isCornerPiece: sale.isCornerPiece ? 'Yes' : 'No',
          marketerName: sale.lead.assignedToUser?.fullName || 'Unassigned',
          accountPaidTo: payment.accountPaidTo || 'N/A'
        };
      });

      res.json(reportData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate sales report." });
    }
  }
};
