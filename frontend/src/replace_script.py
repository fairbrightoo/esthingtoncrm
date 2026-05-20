import sys

content = open('c:\\\\Users\\\\fairb\\\\OneDrive\\\\Documents\\\\esthingtoncrm\\\\frontend\\\\src\\\\pages\\\\AccountantDashboard.tsx', 'r', encoding='utf-8').read()

if 'Eye,' not in content:
    content = content.replace('lucide-react\';', 'Eye, FileText, AlertCircle, lucide-react\';')

# The block to remove is from Section 1.5 to end of Commission Queue
start_str = '{/* Section 1.5: Pending MD-Approval Payments */}'
start_idx = content.find(start_str)

new_content = content[:start_idx] + '''
                            </>
                        )}
                        
                        {activeTab === 'PAYMENTS_COMMISSIONS' && (
                            <>
                                {loading ? (
                                    <div className="flex justify-center p-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Pending MD-Approval Payments */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden mb-8">
                                            <div className="px-6 py-5 border-b border-indigo-100 bg-indigo-50/50 flex justify-between items-center">
                                                <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Pending MD-Approval Payments
                                                </h3>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-indigo-50/20 text-gray-400 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Client / Product</th>
                                                            <th className="px-6 py-4">Amount & Details</th>
                                                            <th className="px-6 py-4">Recorded By</th>
                                                            <th className="px-6 py-4 text-center">Proof of Payment</th>
                                                            <th className="px-6 py-4">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {pendingPayments.length === 0 ? (
                                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No staff-reported payments awaiting approval.</td></tr>
                                                        ) : pendingPayments.map(p => (
                                                            <tr key={p.id} className="hover:bg-indigo-50/30">
                                                                <td className="px-6 py-4">
                                                                    <div className="font-medium text-gray-900">{p.sale?.lead?.fullName || 'Unknown Client'}</div>
                                                                    <div className="text-sm text-gray-500 mt-1">{p.sale?.plot?.prototype || 'Unknown Property'}</div>
                                                                    <div className="text-xs text-gray-400">
                                                                        {p.sale?.plot?.estate?.name || 'Unknown Estate'} ({p.sale?.plot?.estate?.location || 'Unknown Location'})
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-blue-700 text-lg flex items-center gap-2">
                                                                        ₦{p.amount.toLocaleString()}
                                                                        {p.virtualLoanAmount > 0 && (
                                                                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-sm uppercase border border-orange-200">
                                                                                + ₦{p.virtualLoanAmount.toLocaleString()} VL
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500 mt-1 flex flex-col space-y-1">
                                                                        <div className="flex gap-2 items-center flex-wrap">
                                                                            <span className="text-xs font-semibold text-gray-700">Plot Price: ₦{(p.sale?.agreedPrice || 0).toLocaleString()}</span>
                                                                            {(() => {
                                                                                const label = getPaymentTypeLabel(p);
                                                                                return (
                                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${label.bg} ${label.textCol} ${label.border}`}>
                                                                                        {label.text}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <span>Method: {p.method}</span>
                                                                        {p.accountPaidTo && <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded w-max border border-blue-100">{p.accountPaidTo}</span>}
                                                                        <span className="text-xs text-gray-400">Date: {new Date(p.date).toLocaleDateString()}</span>
                                                                        {p.notes && (
                                                                            <div className="mt-2 bg-yellow-50 border border-yellow-100 p-2 rounded-lg text-sm text-yellow-800">
                                                                                <span className="font-bold text-xs uppercase tracking-wider block mb-0.5 text-yellow-600">Marketer's Note:</span>
                                                                                {p.notes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm font-medium text-gray-800">{p.recordedByUser?.fullName || 'N/A'}</div>
                                                                    <div className="text-xs font-bold text-gray-500 uppercase mt-1 px-1.5 py-0.5 bg-gray-100 w-max">{p.recordedByUser?.role?.replace('_', ' ') || ''}</div>
                                                                    <div className="mt-2 border-t border-gray-100 pt-2">
                                                                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">Sale Owner</span>
                                                                        <div className="text-xs font-medium text-gray-700">{p.sale?.marketer?.fullName || 'Unassigned'}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    {p.proofOfPaymentUrl ? (
                                                                        <div className="flex justify-center gap-3 flex-wrap">
                                                                            {(() => {
                                                                                let proofs = [];
                                                                                try {
                                                                                    proofs = JSON.parse(p.proofOfPaymentUrl);
                                                                                    if (!Array.isArray(proofs)) proofs = [p.proofOfPaymentUrl];
                                                                                } catch (e) {
                                                                                    proofs = [p.proofOfPaymentUrl];
                                                                                }

                                                                                return proofs.map((url, idx) => {
                                                                                    const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/);
                                                                                    const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;
                                                                                    return isImage ? (
                                                                                        <a 
                                                                                            key={idx}
                                                                                            href={fullUrl}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="relative group overflow-hidden rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0 inline-block"
                                                                                        >
                                                                                            <img 
                                                                                                src={fullUrl} 
                                                                                                alt="Receipt Thumbnail" 
                                                                                                className="w-16 h-16 object-cover transition-transform duration-300 group-hover:scale-110"
                                                                                            />
                                                                                        </a>
                                                                                    ) : (
                                                                                        <a
                                                                                            key={idx}
                                                                                            href={fullUrl}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="flex flex-col items-center justify-center w-16 h-16 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group flex-shrink-0"
                                                                                        >
                                                                                            <FileText size={24} className="text-gray-400 group-hover:text-blue-500 transition-colors mb-1" />
                                                                                            <span className="text-[10px] font-medium text-gray-500 uppercase">Document</span>
                                                                                        </a>
                                                                                    );
                                                                                });
                                                                            })()}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="inline-flex items-center text-red-500 text-sm font-medium">
                                                                            <AlertCircle size={16} className="mr-1" /> Missing
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-medium text-xs rounded-full animate-pulse">Awaiting MD</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Commission Queue */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                                            <div className="px-6 py-5 border-b border-emerald-100 bg-emerald-50/50 flex justify-between items-center">
                                                <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    Pending Marketer Commissions
                                                </h3>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-emerald-50/20 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Date</th>
                                                            <th className="px-6 py-4">Client</th>
                                                            <th className="px-6 py-4">Marketer</th>
                                                            <th className="px-6 py-4">Plot / Estate</th>
                                                            <th className="px-6 py-4">Verified Payment</th>
                                                            <th className="px-6 py-4">Commission Owed</th>
                                                            <th className="px-6 py-4">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-emerald-50">
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
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        
                        {activeTab === 'HISTORY' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">Transaction History</h2>
                                        <p className="text-sm text-gray-500">View processed payments, paid commissions, and disbursed requisitions.</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                                            <input 
                                                type="date" 
                                                value={historyStartDate}
                                                onChange={(e) => setHistoryStartDate(e.target.value)}
                                                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
                                            <input 
                                                type="date" 
                                                value={historyEndDate}
                                                onChange={(e) => setHistoryEndDate(e.target.value)}
                                                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {historyLoading ? (
                                    <div className="flex justify-center p-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-8">
                                        {/* Processed Payments */}
                                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                                <h3 className="font-bold text-gray-800">Processed Payments</h3>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold">{historyData.payments.length}</span>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Date</th>
                                                            <th className="px-6 py-4">Client</th>
                                                            <th className="px-6 py-4">Amount</th>
                                                            <th className="px-6 py-4">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {historyData.payments.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : historyData.payments.map((p, i) => (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{new Date(p.date).toLocaleDateString()}</td>
                                                                <td className="px-6 py-3 font-medium">{p.sale?.lead?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono">₦{p.amount.toLocaleString()}</td>
                                                                <td className="px-6 py-3">
                                                                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {p.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Paid Commissions */}
                                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50/50 flex justify-between items-center">
                                                <h3 className="font-bold text-emerald-800">Paid Commissions</h3>
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold">{historyData.commissions.length}</span>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Disbursed At</th>
                                                            <th className="px-6 py-4">Marketer</th>
                                                            <th className="px-6 py-4">Client</th>
                                                            <th className="px-6 py-4">Commission Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {historyData.commissions.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : historyData.commissions.map((p, i) => {
                                                            const rate = p.sale?.marketer?.commissionRate || 5;
                                                            const commissionAmount = ((p.amount * rate) / 100) - (p.virtualLoanAmount || 0);
                                                            return (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{p.commissionDisbursedAt ? new Date(p.commissionDisbursedAt).toLocaleDateString() : '-'}</td>
                                                                <td className="px-6 py-3 font-medium">{p.sale?.marketer?.fullName}</td>
                                                                <td className="px-6 py-3 text-gray-500">{p.sale?.lead?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono font-bold text-emerald-600">₦{commissionAmount.toLocaleString()}</td>
                                                            </tr>
                                                        )})}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Disbursed Requisitions */}
                                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
                                                <h3 className="font-bold text-blue-800">Disbursed Requisitions</h3>
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold">{historyData.requisitions.length}</span>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Date</th>
                                                            <th className="px-6 py-4">Title</th>
                                                            <th className="px-6 py-4">Requested By</th>
                                                            <th className="px-6 py-4">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {historyData.requisitions.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : historyData.requisitions.map((r, i) => (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{new Date(r.requestDate).toLocaleDateString()}</td>
                                                                <td className="px-6 py-3 font-medium">{r.title}</td>
                                                                <td className="px-6 py-3 text-gray-500">{r.requestedByUser?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono font-bold text-blue-600">₦{r.amountApproved?.toLocaleString() || 0}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
'''

end_idx = content.find('</>', start_idx) + 3 # find the closing tag for activeTab === 'DISBURSEMENTS'
if end_idx < 3: # if not found
    print("Error finding end tag")
    sys.exit(1)

new_content += content[end_idx:]

with open('c:\\\\Users\\\\fairb\\\\OneDrive\\\\Documents\\\\esthingtoncrm\\\\frontend\\\\src\\\\pages\\\\AccountantDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replacement done successfully")
