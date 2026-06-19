import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, CheckCircle, Briefcase, FileSpreadsheet, MessageSquare, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MDOverview = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
    const [pendingBankConfirmationsCount, setPendingBankConfirmationsCount] = useState(0);
    const [pendingRequisitionsCount, setPendingRequisitionsCount] = useState(0);
    const [unreadMDMessagesCount, setUnreadMDMessagesCount] = useState(0);

    const basePath = user?.role === 'SUPER_ADMIN' ? '/admin' : `/dashboard/${user?.branch?.name?.toLowerCase().replace(/\s+/g, '-') || 'head-office'}`;

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                const branchId = user?.branchId;
                
                // Fetch high-level analytics
                const analyticsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/reports/md?timeframe=this_month${branchId ? `&branchId=${branchId}` : ''}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAnalytics(analyticsRes.data);

                // Fetch Action Items (Payments)
                const paymentsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/pending`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const pd = paymentsRes.data;
                const standardApprovals = new Set([
                    ...(pd.directSales || []).map((p: any) => p.id),
                    ...(pd.outboundCrossSales || []).map((p: any) => p.id)
                ]);
                setPendingPaymentsCount(standardApprovals.size);
                
                const bankConfirms = new Set([
                    ...(pd.bankConfirmations || []).map((p: any) => p.id)
                ]);
                setPendingBankConfirmationsCount(bankConfirms.size);

                // Calculate Unread Messages
                let unreadCount = 0;
                const processedPaymentIds = new Set();
                [...(pd.directSales || []), ...(pd.outboundCrossSales || []), ...(pd.inboundCrossSales || []), ...(pd.bankConfirmations || [])].forEach((p: any) => {
                    if (!processedPaymentIds.has(p.id)) {
                        processedPaymentIds.add(p.id);
                        if (p.messages && p.messages.length > 0) {
                            if (p.messages[0].senderId !== user?.id) {
                                unreadCount++;
                            }
                        }
                    }
                });
                setUnreadMDMessagesCount(unreadCount);

                // Fetch Action Items (Requisitions)
                const reqsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const reqsCount = reqsRes.data.filter((r: any) => r.status === 'PENDING_MD_APPROVAL').length;
                setPendingRequisitionsCount(reqsCount);

            } catch (error) {
                console.error("Failed to load Executive Overview:", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchOverview();
    }, [token, user?.branchId]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-500 font-medium tracking-wide">Synthesizing Executive Snapshot...</p>
            </div>
        );
    }

    const kpis = analytics?.kpis || {};
    const totalSalesGenerated = kpis.totalSalesGenerated || 0;
    const grossCashReceived = kpis.grossCashReceived || 0;
    const netProfit = kpis.netBranchProfit || 0;

    const directSalesVolume = kpis.directSalesVolume || 0;
    const inboundSalesVolume = kpis.inboundSalesVolume || 0;
    const outboundSalesVolume = kpis.outboundSalesVolume || 0;
    
    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
                    <p className="text-slate-500 mt-1 font-medium">Real-time health and operational chokepoints overview.</p>
                </div>
                <button 
                    onClick={() => navigate(`${basePath}/reports`)}
                    className="px-5 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors shadow-sm focus:ring-4 focus:ring-slate-100"
                >
                    Open Master BI Report
                </button>
            </header>

            {/* Strategic KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Total Sales Generated */}
                <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -bottom-6 -right-6 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                        <TrendingUp size={160} />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2 text-blue-600 mb-3">
                            <ArrowUpRight size={22} strokeWidth={2.5}/>
                            <span className="font-extrabold text-sm tracking-wider uppercase">Total Sales Generated</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 mt-1 tracking-tighter">
                            ₦{totalSalesGenerated.toLocaleString()}
                        </h2>
                    </div>
                    <div className="mt-8 pt-5 border-t border-slate-50">
                        <p className="text-xs font-medium text-slate-500">Total volume closed by your marketers, regardless of payment bank.</p>
                        
                        {/* Sales Type Breakdown */}
                        <div className="mt-4 flex flex-col space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Direct Sales:</span>
                                <span className="font-bold text-slate-800">₦{directSalesVolume.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Outbound Cross-Sales:</span>
                                <span className="font-bold text-slate-800">₦{outboundSalesVolume.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-medium">Inbound Cross-Sales:</span>
                                <span className="font-bold text-slate-800">₦{inboundSalesVolume.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gross Cash Received */}
                <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -bottom-6 -right-6 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                        <CheckCircle size={160} />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2 text-emerald-600 mb-3">
                            <ArrowDownLeft size={22} strokeWidth={2.5}/>
                            <span className="font-extrabold text-sm tracking-wider uppercase">Gross Cash Received</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 mt-1 tracking-tighter">
                            ₦{grossCashReceived.toLocaleString()}
                        </h2>
                    </div>
                    <div className="mt-8 pt-5 border-t border-slate-50">
                        <p className="text-xs font-medium text-slate-500">Physical cash deposited into accounts managed by this company.</p>
                    </div>
                </div>

                {/* Net Liquidity Estimate */}
                <div className="bg-slate-900 rounded-2xl p-7 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none">
                        <ArrowDownLeft size={120} />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2 text-emerald-400 mb-3">
                            <CheckCircle size={22} strokeWidth={2.5}/>
                            <span className="font-extrabold text-sm tracking-wider uppercase">Estimated Net Profit</span>
                        </div>
                        <h2 className="text-4xl font-black mt-1 tracking-tighter text-white drop-shadow-sm">
                            ₦{netProfit.toLocaleString()}
                        </h2>
                    </div>
                    <div className="mt-8 pt-5 border-t border-slate-800/80">
                        <p className="text-xs font-medium text-slate-400">Projected branch liquidity after total overhead, payroll, commissions, and taxes.</p>
                    </div>
                </div>

            </div>

            {/* Action Board */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                
                {/* Pending Payments Widget */}
                <div 
                    onClick={() => navigate(`${basePath}/approvals`)}
                    className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                >
                    <div className={`p-4 rounded-full transition-colors ${pendingPaymentsCount > 0 ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600'}`}>
                        <Briefcase size={28} strokeWidth={2}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Financial Approvals</h3>
                        <p className="text-slate-500 text-xs mt-1">
                            {pendingPaymentsCount} client payments waiting for confirmation.
                        </p>
                    </div>
                    {pendingPaymentsCount > 0 && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
                            {pendingPaymentsCount}
                        </div>
                    )}
                </div>

                {/* Bank Confirmations Widget */}
                <div 
                    onClick={() => navigate(`${basePath}/approvals`)}
                    className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                >
                    <div className={`p-4 rounded-full transition-colors ${pendingBankConfirmationsCount > 0 ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-slate-50 text-slate-400 group-hover:text-emerald-600'}`}>
                        <CheckCircle size={28} strokeWidth={2}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Bank Confirmations</h3>
                        <p className="text-slate-500 text-xs mt-1">
                            {pendingBankConfirmationsCount} branch receipts pending verification.
                        </p>
                    </div>
                    {pendingBankConfirmationsCount > 0 && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
                            {pendingBankConfirmationsCount}
                        </div>
                    )}
                </div>

                {/* Unread MD Messages Widget */}
                <div 
                    onClick={() => navigate(`${basePath}/approvals`)}
                    className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                >
                    <div className={`p-4 rounded-full transition-colors ${unreadMDMessagesCount > 0 ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' : 'bg-slate-50 text-slate-400 group-hover:text-blue-600'}`}>
                        <MessageCircle size={28} strokeWidth={2}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Partner MD Comms</h3>
                        <p className="text-slate-500 text-xs mt-1">
                            {unreadMDMessagesCount} unread messages on pending sales.
                        </p>
                    </div>
                    {unreadMDMessagesCount > 0 && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
                            {unreadMDMessagesCount}
                        </div>
                    )}
                </div>

                {/* Pending Funds Requisition Widget */}
                <div 
                    onClick={() => navigate(`${basePath}/approvals`)}
                    className="bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                >
                    <div className={`p-4 rounded-full transition-colors ${pendingRequisitionsCount > 0 ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 'bg-slate-50 text-slate-400 group-hover:text-amber-600'}`}>
                        <FileSpreadsheet size={28} strokeWidth={2}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Fund Requisitions</h3>
                        <p className="text-slate-500 text-xs mt-1">
                            {pendingRequisitionsCount} strategic branch outflows awaiting sign-off.
                        </p>
                    </div>
                    {pendingRequisitionsCount > 0 && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
                            {pendingRequisitionsCount}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
