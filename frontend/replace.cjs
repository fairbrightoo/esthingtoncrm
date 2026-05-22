const fs = require('fs');

let content = fs.readFileSync('src/pages/AccountantDashboard.tsx', 'utf8');

// 1. Update the state interface
content = content.replace(
    "const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, type: 'fund'|'commission', id: string, title: string, message: string}>({isOpen: false, type: 'fund', id: '', title: '', message: ''});",
    "const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, type: 'fund'|'commission', id: string, title: string, message: string, commissionType?: 'DIRECT' | 'REFERRAL'}>({isOpen: false, type: 'fund', id: '', title: '', message: ''});"
);

// 2. Update the modal openers
content = content.replace(
    "const openDisburseCommissionModal = (paymentId: string) => {",
    "const openDisburseCommissionModal = (paymentId: string, commissionType: 'DIRECT' | 'REFERRAL' = 'DIRECT') => {"
);
content = content.replace(
    "setConfirmModal({ isOpen: true, type: 'commission', id: paymentId, title: 'Confirm Commission Payout', message: 'Mark this commission as successfully disbursed to the marketer?' });",
    "setConfirmModal({ isOpen: true, type: 'commission', id: paymentId, commissionType, title: 'Confirm Commission Payout', message: `Mark this ${commissionType.toLowerCase()} commission as successfully disbursed?` });"
);

// 3. Update the handle function
content = content.replace(
    "const handleDisburseCommission = async (paymentId: string) => {",
    "const handleDisburseCommission = async (paymentId: string, commissionType: 'DIRECT' | 'REFERRAL') => {"
);
content = content.replace(
    "await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/pay-commission/${paymentId}`, {}, { headers: { Authorization: `Bearer ${token}` } });",
    "await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/pay-commission/${paymentId}`, { type: commissionType }, { headers: { Authorization: `Bearer ${token}` } });"
);

// 4. Update the execute confirmation
content = content.replace(
    "await handleDisburseCommission(confirmModal.id);",
    "await handleDisburseCommission(confirmModal.id, confirmModal.commissionType || 'DIRECT');"
);

// 5. Replace the commission queue rendering logic
const oldTableBody = `                                                    <tbody className="divide-y divide-emerald-50">
                                                        {commissions.length === 0 ? (
                                                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No pending commissions.</td></tr>
                                                        ) : commissions.map(payment => {
                                                            const rate = payment.sale?.marketer?.commissionRate || 5;
                                                            const commissionAmount = ((payment.amount * rate) / 100) - (payment.virtualLoanAmount || 0);
                                                            return (
                                                            <tr key={payment.id} className="hover:bg-emerald-50/30">
                                                                <td className="px-6 py-4 text-gray-500">
                                                                    {new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-medium text-gray-800">{payment.sale?.lead?.fullName || 'N/A'}</div>
                                                                    {payment.sale?.lead?.company && (
                                                                        <div className="text-[10px] text-gray-400 mt-1 flex items-center">
                                                                            Origin: {payment.sale.lead.company.abbreviation} - {payment.sale.lead.branch?.name}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 font-medium text-gray-800">
                                                                    {payment.sale?.marketer?.fullName || 'N/A'}
                                                                    <div className="text-xs text-blue-600 mt-1">{rate}% Rate</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    Plot {payment.sale?.plot?.plotNumber} <br/>
                                                                    <span className="text-xs text-gray-500">{payment.sale?.plot?.estate?.name}</span>
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-gray-600">₦{payment.amount.toLocaleString()}</td>
                                                                <td className="px-6 py-4 font-bold text-emerald-600 font-mono text-lg">₦{commissionAmount.toLocaleString()}</td>
                                                                <td className="px-6 py-4">
                                                                    <button disabled={actionLoading} onClick={() => openDisburseCommissionModal(payment.id)}
                                                                        className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                                                                        Mark Paid
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )})}
                                                    </tbody>`;

const newTableBody = `                                                    <tbody className="divide-y divide-emerald-50">
                                                        {commissions.length === 0 ? (
                                                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No pending commissions.</td></tr>
                                                        ) : commissions.flatMap(payment => {
                                                            const rows = [];
                                                            
                                                            // 1. Direct Commission
                                                            if (payment.isCommissionPaid === false) {
                                                                const rate = payment.sale?.marketer?.commissionRate || 5;
                                                                const commissionAmount = ((payment.amount * rate) / 100) - (payment.virtualLoanAmount || 0);
                                                                rows.push(
                                                                    <tr key={\`\${payment.id}-direct\`} className="hover:bg-emerald-50/30">
                                                                        <td className="px-6 py-4 text-gray-500">
                                                                            {new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <div className="font-medium text-gray-800">{payment.sale?.lead?.fullName || 'N/A'}</div>
                                                                            {payment.sale?.lead?.company && (
                                                                                <div className="text-[10px] text-gray-400 mt-1 flex items-center">
                                                                                    Origin: {payment.sale.lead.company.abbreviation} - {payment.sale.lead.branch?.name}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-6 py-4 font-medium text-gray-800">
                                                                            {payment.sale?.marketer?.fullName || 'N/A'}
                                                                            <div className="text-xs text-blue-600 mt-1">{rate}% Rate</div>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            Plot {payment.sale?.plot?.plotNumber} <br/>
                                                                            <span className="text-xs text-gray-500">{payment.sale?.plot?.estate?.name}</span>
                                                                        </td>
                                                                        <td className="px-6 py-4 font-mono text-gray-600">₦{payment.amount.toLocaleString()}</td>
                                                                        <td className="px-6 py-4 font-bold text-emerald-600 font-mono text-lg">₦{commissionAmount.toLocaleString()}</td>
                                                                        <td className="px-6 py-4">
                                                                            <button disabled={actionLoading} onClick={() => openDisburseCommissionModal(payment.id, 'DIRECT')}
                                                                                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                                                                                Mark Paid
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }

                                                            // 2. Referral Commission
                                                            if (payment.sale?.referrerId && payment.isReferralCommissionPaid === false) {
                                                                const rate = payment.sale?.marketer?.referrerCommissionRate || payment.sale?.referrerCommissionRate || 6;
                                                                const commissionAmount = (payment.amount * rate) / 100;
                                                                rows.push(
                                                                    <tr key={\`\${payment.id}-referral\`} className="hover:bg-indigo-50/30 bg-indigo-50/10">
                                                                        <td className="px-6 py-4 text-gray-500">
                                                                            {new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <div className="font-medium text-gray-800">{payment.sale?.lead?.fullName || 'N/A'}</div>
                                                                            {payment.sale?.lead?.company && (
                                                                                <div className="text-[10px] text-gray-400 mt-1 flex items-center">
                                                                                    Origin: {payment.sale.lead.company.abbreviation} - {payment.sale.lead.branch?.name}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-6 py-4 font-medium text-gray-800">
                                                                            {payment.sale?.referrer?.fullName || 'N/A'} <span className="px-2 py-0.5 ml-2 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">REFERRER</span>
                                                                            <div className="text-xs text-indigo-600 mt-1">{rate}% Rate</div>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            Plot {payment.sale?.plot?.plotNumber} <br/>
                                                                            <span className="text-xs text-gray-500">{payment.sale?.plot?.estate?.name}</span>
                                                                        </td>
                                                                        <td className="px-6 py-4 font-mono text-gray-600">₦{payment.amount.toLocaleString()}</td>
                                                                        <td className="px-6 py-4 font-bold text-indigo-600 font-mono text-lg">₦{commissionAmount.toLocaleString()}</td>
                                                                        <td className="px-6 py-4">
                                                                            <button disabled={actionLoading} onClick={() => openDisburseCommissionModal(payment.id, 'REFERRAL')}
                                                                                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                                                                                Mark Paid
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }

                                                            return rows;
                                                        })}
                                                    </tbody>`;

content = content.replace(oldTableBody, newTableBody);

content = content.replace(/\r?\n/g, '\r\n');
fs.writeFileSync('src/pages/AccountantDashboard.tsx', content);
console.log("Replaced accountant dashboard table!");
