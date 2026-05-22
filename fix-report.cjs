const fs = require('fs');

let content = fs.readFileSync('backend/src/controllers/ReportController.ts', 'utf8');

// 1. Add referrer to include
const targetInclude = `              marketer: { include: { branch: true } },
              payments: {`;
const replaceInclude = `              marketer: { include: { branch: true } },
              referrer: { select: { id: true, fullName: true, email: true } },
              payments: {`;
content = content.replace(targetInclude, replaceInclude);

// 2. Add calculation to map
const targetMap = `        const commissionRate = sale.marketer?.commissionRate || sale.lead.assignedToUser?.commissionRate || 5.0;
        const commissionAccrued = (payment.amount * (commissionRate / 100)) - (payment.virtualLoanAmount || 0);

        return {`;
const replaceMap = `        const commissionRate = sale.marketer?.commissionRate || sale.lead.assignedToUser?.commissionRate || 5.0;
        const commissionAccrued = (payment.amount * (commissionRate / 100)) - (payment.virtualLoanAmount || 0);

        let referrerName = 'N/A';
        let referralCommissionAccrued = 0;
        
        if (sale.referrer) {
            referrerName = sale.referrer.fullName;
            const refRate = sale.referrerCommissionRate || 6.0;
            referralCommissionAccrued = (payment.amount * refRate) / 100;
        }

        return {`;
content = content.replace(targetMap, replaceMap);

// 3. Add to return object
const targetReturn = `          commissionAccrued: commissionAccrued,
          estateName: sale.plot.estate.name,`;
const replaceReturn = `          commissionAccrued: commissionAccrued,
          referrerName: referrerName,
          referralCommissionAccrued: referralCommissionAccrued,
          estateName: sale.plot.estate.name,`;
content = content.replace(targetReturn, replaceReturn);

content = content.replace(/\r?\n/g, '\r\n');
fs.writeFileSync('backend/src/controllers/ReportController.ts', content);
console.log("Updated ReportController.ts!");
