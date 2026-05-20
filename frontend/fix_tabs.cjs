const fs = require('fs');
const file = 'src/pages/AccountantDashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

const targetStr = `                <button
                    onClick={() => setActiveTab('REFUNDS')}
                    className={\`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 \${activeTab === 'REFUNDS' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-800'}\`}
                >
                    <ArrowRightLeft size={16} /> Client Refunds
                </button>
            </div>`;

const newStr = `                <button
                    onClick={() => setActiveTab('REFUNDS')}
                    className={\`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 \${activeTab === 'REFUNDS' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-800'}\`}
                >
                    <ArrowRightLeft size={16} /> Client Refunds
                </button>
                <button
                    onClick={() => setActiveTab('PAYMENTS_COMMISSIONS')}
                    className={\`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 \${activeTab === 'PAYMENTS_COMMISSIONS' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-800'}\`}
                >
                    <CreditCard size={16} /> Payments & Commissions
                </button>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={\`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 \${activeTab === 'HISTORY' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'}\`}
                >
                    <Clock size={16} /> History
                </button>
            </div>`;

if (c.includes(targetStr)) {
    c = c.replace(targetStr, newStr);
    c = c.replace(
        "useState<'DISBURSEMENTS' | 'BUDGETS' | 'REFUNDS'>('DISBURSEMENTS')",
        "useState<'DISBURSEMENTS' | 'BUDGETS' | 'REFUNDS' | 'PAYMENTS_COMMISSIONS' | 'HISTORY'>('DISBURSEMENTS')"
    );
    fs.writeFileSync(file, c);
    console.log("Successfully added tabs!");
} else {
    console.log("Could not find the target string!");
}
