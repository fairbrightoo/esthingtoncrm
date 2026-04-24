import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, CheckCircle, Briefcase, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MDOverview = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
    const [pendingRequisitionsCount, setPendingRequisitionsCount] = useState(0);

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
                setPendingPaymentsCount(paymentsRes.data.length || 0);

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
    const grossRevenue = kpis.grossRevenue || 0;
    const netProfit = kpis.netBranchProfit || 0;
    
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Gross Revenue */}
                <div className="bg-white rounded-2xl p-7 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -bottom-6 -right-6 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                        <TrendingUp size={160} />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2 text-indigo-600 mb-3">
                            <ArrowUpRight size={22} strokeWidth={2.5}/>
                            <span className="font-extrabold text-sm tracking-wider uppercase">Gross Capital Inflow</span>
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 mt-1 tracking-tighter">
                            ₦{grossRevenue.toLocaleString()}
                        </h2>
                    </div>
                    <div className="mt-8 pt-5 border-t border-slate-50">
                        <p className="text-sm font-medium text-slate-500">Gross revenue verified across the branch accounts.</p>
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
                        <h2 className="text-5xl font-black mt-1 tracking-tighter text-white drop-shadow-sm">
                            ₦{netProfit.toLocaleString()}
                        </h2>
                    </div>
                    <div className="mt-8 pt-5 border-t border-slate-800/80">
                        <p className="text-sm font-medium text-slate-400">Projected branch liquidity after total overhead, payroll, and taxes.</p>
                    </div>
                </div>

            </div>

            {/* Action Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Pending Payments Widget */}
                <div 
                    onClick={() => navigate(`${basePath}/approvals`)}
                    className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-6 flex items-center space-x-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className={`p-4 rounded-2xl transition-colors ${pendingPaymentsCount > 0 ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600'}`}>
                        <Briefcase size={28} strokeWidth={2}/>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-lg">Financial Approvals</h3>
                        <p className="text-slate-500 text-sm mt-0.5">
                            {pendingPaymentsCount} client payments waiting for confirmation.
                        </p>
                    </div>
                    {pendingPaymentsCount > 0 && (
                        <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                            {pendingPaymentsCount}
                        </div>
                    )}
                </div>

                {/* Pending Funds Requisition Widget */}
                <div 
                    onClick={() => navigate(`${basePath}/approvals`)}
                    className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-6 flex items-center space-x-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className={`p-4 rounded-2xl transition-colors ${pendingRequisitionsCount > 0 ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600'}`}>
                        <FileSpreadsheet size={28} strokeWidth={2}/>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-lg">Fund Requisitions</h3>
                        <p className="text-slate-500 text-sm mt-0.5">
                            {pendingRequisitionsCount} strategic branch outflows await your sign-off.
                        </p>
                    </div>
                    {pendingRequisitionsCount > 0 && (
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                            {pendingRequisitionsCount}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
