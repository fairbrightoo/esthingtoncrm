import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    try {
        const dateFilter: any = {};
        
        const allCompanies = await prisma.company.findMany({
            include: { branches: true }
        });

        const companyMap = new Map();
        allCompanies.forEach(c => {
            const branchMap = new Map();
            c.branches.forEach(b => {
                branchMap.set(b.id, { id: b.id, name: b.name, revenue: 0, leads: 0, clients: new Set() });
            });
            companyMap.set(c.id, { 
                id: c.id, 
                name: c.name, 
                themeColor: c.themeColor || '#000000', 
                revenue: 0, 
                leads: 0, 
                clients: new Set(), 
                branches: branchMap 
            });
        });

        const payments = await prisma.payment.findMany({
            where: {
                status: 'APPROVED',
                ...(dateFilter.gte && { date: dateFilter })
            },
            include: {
                sale: {
                    include: { lead: { select: { id: true, companyId: true, branchId: true } } }
                }
            }
        });

        payments.forEach(p => {
            const cid = p.sale.lead.companyId;
            const bid = p.sale.lead.branchId;
            const leadId = p.sale.lead.id;

            if (companyMap.has(cid)) {
                const comp = companyMap.get(cid);
                comp.revenue += p.amount;
                comp.clients.add(leadId);

                if (bid && comp.branches.has(bid)) {
                    const br = comp.branches.get(bid);
                    br.revenue += p.amount;
                    br.clients.add(leadId);
                }
            }
        });

        const leads = await prisma.lead.findMany({
            where: dateFilter.gte ? { createdAt: dateFilter } : {},
            select: { id: true, companyId: true, branchId: true }
        });

        leads.forEach(l => {
            const cid = l.companyId;
            const bid = l.branchId;

            if (companyMap.has(cid)) {
                const comp = companyMap.get(cid);
                comp.leads += 1;

                if (bid && comp.branches.has(bid)) {
                    const br = comp.branches.get(bid);
                    br.leads += 1;
                }
            }
        });

        let globalRevenue = 0;
        let globalLeads = 0;
        const globalClientsSet = new Set();
        
        const companyStats = Array.from(companyMap.values()).map(comp => {
            globalRevenue += comp.revenue;
            globalLeads += comp.leads;
            comp.clients.forEach((c: any) => globalClientsSet.add(c));
        
            const branchStats = Array.from(comp.branches.values()).map((br: any) => ({
                id: br.id,
                name: br.name,
                revenue: br.revenue,
                leads: br.leads,
                clients: br.clients.size,
                conversionRate: br.leads > 0 ? ((br.clients.size / br.leads) * 100).toFixed(1) : 0
            }));
        
            return {
                id: comp.id,
                name: comp.name,
                themeColor: comp.themeColor,
                revenue: comp.revenue,
                leads: comp.leads,
                clients: comp.clients.size,
                conversionRate: comp.leads > 0 ? ((comp.clients.size / comp.leads) * 100).toFixed(1) : 0,
                branches: branchStats
            };
        });

        const summary = {
            revenue: globalRevenue,
            leads: globalLeads,
            clients: globalClientsSet.size,
            conversionRate: globalLeads > 0 ? ((globalClientsSet.size / globalLeads) * 100).toFixed(1) : 0
        };

        const recentActivities = await prisma.activity.findMany({
            take: 10,
            orderBy: { timestamp: 'desc' },
            include: {
                createdByUser: {
                    select: {
                        fullName: true,
                        role: true,
                    }
                },
                lead: { select: { fullName: true } }
            }
        });

        const leadsByCompany = companyStats.map((c: any) => ({
            name: c.name,
            value: c.leads,
            color: c.themeColor
        }));

        const result = {
            summary,
            companies: companyStats,
            charts: { leadsByCompany },
            recentActivities
        };
        
        console.log(JSON.stringify(result, null, 2).substring(0, 100));
        console.log("SUCCESS TEST");
    } catch(e: any) {
        console.error("FAILED", e);
    }
}
test();
