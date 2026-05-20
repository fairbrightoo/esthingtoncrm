const fs = require('fs');
const file = 'src/pages/AccountantDashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/Client Refunds\s*<\/button>\s*<\/div>/, `Client Refunds
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
            </div>`);

c = c.replace(/useState\<'DISBURSEMENTS' \| 'BUDGETS' \| 'REFUNDS'\>\('DISBURSEMENTS'\)/, 
"useState<'DISBURSEMENTS' | 'BUDGETS' | 'REFUNDS' | 'PAYMENTS_COMMISSIONS' | 'HISTORY'>('DISBURSEMENTS')");

c = c.replace(/\{disbursements\.length === 0 \? \(/g, "{disbursements.filter(req => req.status !== 'DISBURSED').length === 0 ? (");
c = c.replace(/disbursements\.map\(req => \{/g, "disbursements.filter(req => req.status !== 'DISBURSED').map(req => {");

fs.writeFileSync(file, c);
console.log("Fixed with Regex!");
