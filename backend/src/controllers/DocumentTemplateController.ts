import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export const DocumentTemplateController = {
    async getTemplates(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            let companyId = user.companyId;

            // Allow any user to fetch templates of a specific company (crucial for cross-company property sales document generation)
            if (req.query.companyId) {
                companyId = req.query.companyId as string;
            }

            const templates = await prisma.documentTemplate.findMany({
                where: { companyId }
            });

            res.json(templates);
        } catch (error) {
            console.error('Fetch Templates Error:', error);
            res.status(500).json({ error: 'Failed to fetch document templates' });
        }
    },

    async saveTemplate(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            let companyId = user.companyId;
            
            // Super Admin can save to other companies
            if (user.role === 'SUPER_ADMIN' && req.query.companyId) {
                companyId = req.query.companyId as string;
            }

            const { type, content } = req.body;

            // Upsert the template (Create if it doesn't exist, update if it does)
            const template = await prisma.documentTemplate.upsert({
                where: {
                    companyId_type: {
                        companyId,
                        type
                    }
                },
                update: {
                    content
                },
                create: {
                    companyId,
                    type,
                    content
                }
            });

            res.json(template);
        } catch (error) {
            console.error('Save Template Error:', error);
            res.status(500).json({ error: 'Failed to save document template' });
        }
    }
};
