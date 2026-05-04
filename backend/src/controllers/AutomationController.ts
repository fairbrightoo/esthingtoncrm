import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const AutomationController = {
  /**
   * GET /api/automation/stale-leads
   * Returns leads with no activity for > 7 days.
   */
  async getStaleLeads(req: Request, res: Response) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const staleLeads = await prisma.lead.findMany({
        where: {
          activities: {
            none: {
              timestamp: {
                gte: sevenDaysAgo
              }
            }
          },
          status: 'PROSPECT' // Only checking prospects
        },
        include: {
          assignedToUser: {
            select: {
              fullName: true,
              email: true,
              phone: true
            }
          }
        }
      });

      res.json({
        count: staleLeads.length,
        leads: staleLeads.map(lead => ({
          name: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          marketer: lead.assignedToUser
        }))
      });
    } catch (error) {
      console.error('Error fetching stale leads:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
   * POST /api/webhooks/inbound-activity
   * Receives inbound SMS/WhatsApp from n8n and logs it.
   */
  async handleInboundActivity(req: Request, res: Response) {
    try {
      const { leadEmail, leadPhone, type, notes, direction } = req.body;

      // Find lead by email OR phone
      const lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { email: leadEmail },
            { phone: leadPhone }
          ]
        }
      });

      if (!lead) {
         res.status(404).json({ error: 'Lead not found' });
         return;
      }

      const activity = await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: type || 'WHATSAPP', // Default
          direction: direction || 'INBOUND',
          notes: notes || 'Inbound message received',
          timestamp: new Date()
        }
      });

      res.json({ success: true, activityId: activity.id });
    } catch (error) {
      console.error('Error logging inbound activity:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
   * GET /api/automations/daily-outreach/history
   */
  async getDailyOutreachHistory(req: Request, res: Response) {
    try {
      // @ts-ignore
      const user = req.user;
      
      const dbUser = await prisma.user.findUnique({ where: { id: user.userId }});
      if (!dbUser) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      const history = await prisma.communicationLog.findMany({
        where: {
          providerId: { in: ['AI_BIRTHDAY_CRON', 'AI_REMINDER_CRON'] },
          lead: { companyId: dbUser.companyId || '', ...(dbUser.branchId && dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'MANAGING_DIRECTOR' ? { branchId: dbUser.branchId } : {}) }
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          lead: { select: { fullName: true, phone: true, email: true, company: { select: { name: true } } } }
        }
      });
      res.json(history);
    } catch (error) {
      console.error('Error fetching outreach history:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
   * POST /api/automations/daily-outreach/trigger-test
   */
  async triggerDailyOutreachTest(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userRole = req.user?.role;
      if (userRole !== 'SUPER_ADMIN') {
         // Allow any admin for testing during development, maybe restrict later
         console.log("Triggered by role:", userRole);
      }
      
      const { AutomationService } = await import('../services/AutomationService.js');
      
      // Run sequentially
      await AutomationService.runBirthdayEmails();
      await AutomationService.runDailyAIPaymentReminders();
      
      res.json({ success: true, message: 'Test execution triggered successfully' });
    } catch (error) {
      console.error('Error triggering test:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
