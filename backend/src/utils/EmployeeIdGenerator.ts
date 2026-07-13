import prisma from '../config/prisma.js';

export async function generateEmployeeId(companyId: string, branchId: string | null, role: string): Promise<string> {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error("Company not found");
    const compAbbr = company.abbreviation || 'COMP';

    if (role === 'GROUP_MANAGING_DIRECTOR') {
        const gmdCount = await prisma.user.count({
            where: { companyId, role: 'GROUP_MANAGING_DIRECTOR' }
        });
        return `${compAbbr}/GMD/${String(gmdCount + 1).padStart(3, '0')}`;
    }

    if (branchId) {
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch) throw new Error("Branch not found");
        const branchAbbr = branch.abbreviation || branch.name.substring(0, 3).toUpperCase();
        
        if (role === 'MANAGING_DIRECTOR') {
            const mdCount = await prisma.user.count({ where: { branchId, role: 'MANAGING_DIRECTOR' }});
            const num = mdCount === 0 ? 1 : 100 + mdCount;
            return `${compAbbr}/${branchAbbr}/MD/${String(num).padStart(3, '0')}`;
        }
        
        if (role === 'GENERAL_MANAGER') {
            const gmCount = await prisma.user.count({ where: { branchId, role: 'GENERAL_MANAGER' }});
            const num = gmCount === 0 ? 1 : 100 + gmCount;
            return `${compAbbr}/${branchAbbr}/GM/${String(num).padStart(3, '0')}`;
        }
        
        const updatedBranch = await prisma.branch.update({ 
            where: { id: branchId }, 
            data: { employeeCounter: { increment: 1 } },
            select: { employeeCounter: true }
        });
        const counter = updatedBranch.employeeCounter - 1;
        return `${compAbbr}/${branchAbbr}/${String(counter).padStart(3, '0')}`;
    } else {
        const updatedCompany = await prisma.company.update({ 
            where: { id: companyId }, 
            data: { employeeCounter: { increment: 1 } },
            select: { employeeCounter: true }
        });
        const counter = updatedCompany.employeeCounter - 1;
        
        if (role === 'SUPER_ADMIN') {
            return `${compAbbr}/SA/${String(counter).padStart(3, '0')}`;
        }
        
        return `${compAbbr}/${String(counter).padStart(3, '0')}`;
    }
}
