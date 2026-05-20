const fs = require('fs');
const file = 'src/pages/AccountantDashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace("import { getPaymentTypeLabel } from './ManagingDirectorDashboard';\n", '');

const funcStr = `
export const getPaymentTypeLabel = (payment: any) => {
    if (!payment.sale || !payment.sale.plot) return { text: 'N/A', bg: 'bg-gray-100', textCol: 'text-gray-600', border: 'border-gray-200' };
    const price = payment.sale.agreedPrice || 0;
    const isOutright = payment.amount >= price;
    if (isOutright) return { text: 'New Sale (Outright)', bg: 'bg-green-100', textCol: 'text-green-700', border: 'border-green-300' };
    
    // Check if it's the first payment for this sale
    // We would ideally need to check if there are prior payments, but assuming for now:
    // If amount is small, and there's a virtual loan or it's just continuous
    if (payment.amount < price) return { text: 'New Sale (Installment)', bg: 'bg-purple-100', textCol: 'text-purple-700', border: 'border-purple-300' };
    
    return { text: 'Continuous Payment', bg: 'bg-blue-100', textCol: 'text-blue-700', border: 'border-blue-300' };
};
`;

c = c.replace('export const AccountantDashboard', funcStr + '\nexport const AccountantDashboard');

fs.writeFileSync(file, c);
console.log('Fixed getPaymentTypeLabel');
