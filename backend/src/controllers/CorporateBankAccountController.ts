import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/prisma.js';

export const CorporateBankAccountController = {
  // Global fetch for all active bank accounts (for "Record Payment" dropdown)
  async getGlobalActiveAccounts(req: AuthRequest, res: Response) {
    try {
      const accounts = await prisma.corporateBankAccount.findMany({
        where: { isActive: true },
        orderBy: { companyName: 'asc' }
      });
      res.json(accounts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch global corporate bank accounts' });
    }
  },

  // Branch specific fetch (for Accountant Settings)
  async getBranchAccounts(req: AuthRequest, res: Response) {
    try {
      const branchId = req.user?.branchId;
      if (!branchId) return res.status(403).json({ error: 'Not authorized for a branch' });

      const accounts = await prisma.corporateBankAccount.findMany({
        where: { branchId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(accounts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch branch accounts' });
    }
  },

  // Add new corporate bank account
  async createAccount(req: AuthRequest, res: Response) {
    try {
      const branchId = req.user?.branchId;
      if (!branchId) return res.status(403).json({ error: 'Not authorized for a branch' });

      const { bankName, accountName, accountNumber, companyName } = req.body;

      if (!bankName || !accountName || !accountNumber || !companyName) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const account = await prisma.corporateBankAccount.create({
        data: {
          bankName,
          accountName,
          accountNumber,
          companyName,
          branchId
        }
      });
      res.status(201).json(account);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create corporate bank account' });
    }
  },

  // Update account
  async updateAccount(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { bankName, accountName, accountNumber, companyName, isActive } = req.body;

      const account = await prisma.corporateBankAccount.update({
        where: { id },
        data: {
          bankName,
          accountName,
          accountNumber,
          companyName,
          isActive
        }
      });
      res.json(account);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update corporate bank account' });
    }
  },

  // Delete account
  async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.corporateBankAccount.delete({
        where: { id }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete corporate bank account' });
    }
  }
};
