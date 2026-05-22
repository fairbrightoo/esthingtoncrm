const fs = require('fs');

let content = fs.readFileSync('src/pages/MarketerDashboard.tsx', 'utf8');

content = content.replace('lg:grid-cols-5', 'lg:grid-cols-6');

const targetCardStr = `                </div>
            </div>

            {/* Main Content Area */}`;

const newCardStr = `                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4 lg:col-span-1 md:col-span-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-indigo-600/70 uppercase tracking-wider mb-1">Referral Earnings</p>
                        <h3 className="text-2xl font-black text-indigo-600 drop-shadow-sm">{formatCurrency(stats?.financial?.paidReferralCommissions || 0)}</h3>
                        <p className="text-[10px] text-amber-500 font-bold tracking-wide mt-0.5">{formatCurrency(stats?.financial?.pendingReferralCommissions || 0)} Pending</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}`;

content = content.replace(targetCardStr, newCardStr);

const targetPanelStr = `            {/* Commissions Tracking Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">`;

const newPanelStr = `            {/* Referral Commissions Tracking Panels */}
            {((stats?.financial?.paidReferralCommissions > 0 || stats?.financial?.pendingReferralCommissions > 0) || mData.detailedDueReferralCommissions?.length > 0 || mData.detailedPaidReferralCommissions?.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {/* Due Referral Commissions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-indigo-100 bg-indigo-50/50">
                            <h2 className="text-lg font-bold text-indigo-800">Due Referral Commissions</h2>
                            <p className="text-xs text-indigo-600/70">From Downline Sales • Awaiting Disbursement</p>
                        </div>
                        <div className="p-2">
                            {mData.detailedDueReferralCommissions?.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">No referral commissions due</div>
                            ) : (
                                <div className="space-y-1">
                                    {mData.detailedDueReferralCommissions?.map((c: any) => (
                                        <div key={c.id} className="p-4 flex items-center justify-between hover:bg-indigo-50/30 rounded-xl transition-colors">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{c.marketerName}</p>
                                                <p className="text-xs text-gray-500">Sold to: {c.clientName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-indigo-600">{formatCurrency(c.commission)}</p>
                                                <p className="text-[10px] uppercase font-bold text-indigo-600/50 bg-indigo-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Pending</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Paid Referral Commissions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-blue-100 bg-blue-50/50">
                            <h2 className="text-lg font-bold text-blue-800">Paid Referral Commissions</h2>
                            <p className="text-xs text-blue-600/70">From Downline Sales • Disbursed</p>
                        </div>
                        <div className="p-2">
                            {mData.detailedPaidReferralCommissions?.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">No paid referral commissions</div>
                            ) : (
                                <div className="space-y-1">
                                    {mData.detailedPaidReferralCommissions?.map((c: any) => (
                                        <div key={c.id} className="p-4 flex items-center justify-between hover:bg-blue-50/30 rounded-xl transition-colors">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{c.marketerName}</p>
                                                <p className="text-xs text-gray-500">Sold to: {c.clientName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-blue-600">{formatCurrency(c.commission)}</p>
                                                <p className="text-[10px] uppercase font-bold text-blue-600/50 bg-blue-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Paid {formatDate(c.date)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Commissions Tracking Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">`;

// Only replace if not already replaced
if (!content.includes('Due Referral Commissions')) {
    content = content.replace(targetPanelStr, newPanelStr);
}

// Convert all line endings to CRLF just in case there's a mix
content = content.replace(/\r?\n/g, '\r\n');

fs.writeFileSync('src/pages/MarketerDashboard.tsx', content);
console.log("Done");
