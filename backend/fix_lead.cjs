const fs = require('fs');
const file = 'src/controllers/LeadController.ts';
let c = fs.readFileSync(file, 'utf8');

const newMethod = `
    // Super Admin: Global Clients Database
    async getGlobalClients(req: Request, res: Response) {
        try {
            // @ts-ignore
            const tokenUser = req.user;
            const { companyId, branchId } = req.query;
            
            const user = await prisma.user.findUnique({ where: { id: tokenUser.userId } });

            // STRICT ROLE CHECK: Only SUPER_ADMIN
            if (!user || user.role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Access denied. Only Super Admin can view global clients.' });
            }

            let whereClause: any = {};
            if (companyId && companyId !== 'ALL') {
                whereClause.companyId = String(companyId);
            }
            if (branchId && branchId !== 'ALL') {
                whereClause.branchId = String(branchId);
            }

            const leads = await prisma.lead.findMany({
                where: whereClause,
                include: {
                    company: { select: { name: true } },
                    branch: { select: { name: true } },
                    assignedToUser: { select: { fullName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(leads);
        } catch (error) {
            console.error('Global Clients Error:', error);
            res.status(500).json({ error: 'Failed to fetch global clients' });
        }
    },
`;

if (!c.includes('getGlobalClients')) {
    c = c.replace(/async getLeads\(req: Request, res: Response\) \{/, newMethod + '\n    async getLeads(req: Request, res: Response) {');
    fs.writeFileSync(file, c);
    console.log('Added getGlobalClients to LeadController.ts');
} else {
    console.log('getGlobalClients already exists');
}
