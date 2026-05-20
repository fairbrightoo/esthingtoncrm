const fs = require('fs');

const file = 'backend/src/controllers/ReportController.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/if \(role !== 'SUPER_ADMIN' && role !== 'MANAGING_DIRECTOR' && role !== 'GLOBAL_CHAIRMAN'\) \{([\s\S]*?)whereClause\.sale = \{[\s\S]*?marketer: \{[\s\S]*?branchId: branchId[\s\S]*?\}[\s\S]*?\};[\s\S]*?\}/, `if (role !== 'SUPER_ADMIN' && role !== 'GLOBAL_CHAIRMAN') {
        if (!branchId) return res.status(403).json({ error: 'Not authorized for a branch' });
        whereClause.OR = [
          { sale: { marketer: { branchId: branchId } } },
          { sale: { plot: { estate: { managingBranchId: branchId } } } }
        ];
      }`);

c = c.replace(/plot: \{\s+include: \{ estate: true \}\s+\},/, `plot: {
                include: { estate: { include: { managingBranch: true } } }
              },`);

c = c.replace(/marketer: true,/, `marketer: { include: { branch: true } },`);

c = c.replace(/const commissionRate = sale\.marketer\?\.commissionRate \|\| sale\.lead\.assignedToUser\?\.commissionRate \|\| 5\.0;/, `let saleType = 'Direct Sale';
        if (role !== 'SUPER_ADMIN' && role !== 'GLOBAL_CHAIRMAN' && branchId) {
            const mBranchId = sale.marketer?.branchId;
            const estBranchId = sale.plot.estate.managingBranchId;
            if (mBranchId === branchId && estBranchId !== branchId) saleType = 'Outbound Cross-Sale';
            if (mBranchId !== branchId && estBranchId === branchId) saleType = 'Inbound Cross-Sale';
        }

        const commissionRate = sale.marketer?.commissionRate || sale.lead.assignedToUser?.commissionRate || 5.0;`);

c = c.replace(/accountPaidTo: payment\.accountPaidTo \|\| 'N\/A'\s+\};/, `accountPaidTo: payment.accountPaidTo || 'N/A',
          saleType: saleType,
          managingBranchName: sale.plot.estate.managingBranch?.name || 'Head Office'
        };`);

fs.writeFileSync(file, c);
console.log('ReportController.ts updated');
