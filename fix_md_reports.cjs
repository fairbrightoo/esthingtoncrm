const fs = require('fs');

const file = 'backend/src/controllers/MDReportController.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/const paymentWhere: any = \{\s+status: 'APPROVED',\s+sale: \{ marketer: \{ branchId: branchId as string \} \}\s+\};/g, `const paymentWhere: any = {
                status: 'APPROVED',
                OR: [
                    { sale: { marketer: { branchId: branchId as string } } },
                    { sale: { plot: { estate: { managingBranchId: branchId as string } } } }
                ]
            };`);

c = c.replace(/const saleWhere: any = \{\s+marketer: \{ branchId: branchId as string \}\s+\};/g, `const saleWhere: any = {
                OR: [
                    { marketer: { branchId: branchId as string } },
                    { plot: { estate: { managingBranchId: branchId as string } } }
                ]
            };`);

c = c.replace(/const payments = await prisma\.payment\.findMany\(\{\s+where: paymentWhere,\s+include: \{\s+recordedByUser: true\s+\}\s+\}\);/g, `const payments = await prisma.payment.findMany({
                where: paymentWhere,
                include: {
                    recordedByUser: true,
                    sale: {
                        include: {
                            marketer: { include: { branch: true } },
                            plot: { include: { estate: { include: { managingBranch: true } } } },
                            client: true
                        }
                    }
                }
            });`);

c = c.replace(/const grossRevenue = payments\.reduce\(\(sum, p\) => sum \+ p\.amount, 0\);/g, `let directBranchRevenue = 0;
            let crossBranchGenerated = 0;
            let totalStaffSalesVolume = 0;
            const detailedSalesData: any[] = [];

            payments.forEach(p => {
                const s = p.sale;
                const mBranchId = s.marketer?.branchId;
                const estBranchId = s.plot?.estate?.managingBranchId;
                
                let saleType = 'Direct Sale';
                if (mBranchId === branchId && estBranchId !== branchId) saleType = 'Outbound Cross-Sale';
                if (mBranchId !== branchId && estBranchId === branchId) saleType = 'Inbound Cross-Sale';

                detailedSalesData.push({
                    paymentId: p.id,
                    amount: p.amount,
                    date: p.date,
                    clientName: s.client?.fullName || 'Unknown',
                    marketerName: s.marketer?.fullName || 'Unknown',
                    estateName: s.plot?.estate?.name || 'Unknown',
                    plotNumber: s.plot?.plotNumber || 'Unknown',
                    managingBranchName: s.plot?.estate?.managingBranch?.name || 'Head Office',
                    saleType
                });

                if (estBranchId === branchId) directBranchRevenue += p.amount;
                if (mBranchId === branchId && estBranchId !== branchId) crossBranchGenerated += p.amount;
                if (mBranchId === branchId) totalStaffSalesVolume += p.amount;
            });
            
            const grossRevenue = directBranchRevenue;`);

c = c.replace(/grossRevenue,\s+outstandingDebt,/g, `grossRevenue,
                    directBranchRevenue,
                    crossBranchGenerated,
                    totalStaffSalesVolume,
                    outstandingDebt,`);

c = c.replace(/leaderboard\s+\}\);/g, `leaderboard,
                detailedSalesData
            });`);

fs.writeFileSync(file, c);
console.log('MDReportController updated');
