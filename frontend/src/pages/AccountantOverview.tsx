import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowDownLeft, ArrowUpRight, Ban, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';

export const AccountantOverview = () => {
    const { user, token } = useAuth();
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                // Determine branch filter. Accountant only sees their specific branch
                const branchId = user?.branchId;
                const res = await axios.get(`http://localhost:3000/api/analytics/reports/md?timeframe=this_month${branchId ? `&branchId=${branchId}` : ''}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAnalytics(res.data);
            } catch (error) {
                console.error("Failed to load Accountant Overview:", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchOverview();
    }, [token, user?.branchId]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Fetching financial data...</p>
            </div>
        );
    }

    // Safely extract stats
    const kpis = analytics?.kpis || {};
    const totalCollected = kpis.grossRevenue || 0;
    const outstandingDebt = kpis.outstandingDebt || 0;
    const netProfit = kpis.netBranchProfit || 0;
    
    // Core Outflows
    const payroll = kpis.totalPayrollOverhead || 0;
    const requisitions = kpis.totalRequisitionExpenses || 0;
    const commissions = kpis.totalCommissionsCleared || 0;
    
    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <header>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Financial Command Center</h1>
                <p className="text-gray-500 mt-1">High-level snapshot of branch liquidity and pending operations.</p>
            </header>

            {/* Primary KPI Hero Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Collected Revenue */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <TrendingUp size={120} />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2 text-blue-600 mb-2">
                            <ArrowUpRight size={20} />
                            <span className="font-bold text-sm tracking-wide">GROSS COLLECTED REVENUE</span>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 mt-1 tracking-tight">₦{totalCollected.toLocaleString()}</h2>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-50">
                        <p className="text-xs text-gray-500">Total cash injected into the branch accounts.</p>
                    </div>
                </div>

                {/* Overhead Spend */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <ArrowDownLeft size={120} />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2 text-rose-600 mb-2">
                            <ArrowDownLeft size={20} />
                            <span className="font-bold text-sm tracking-wide">OPERATING OUTFLOW</span>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 mt-1 tracking-tight">₦{(payroll + requisitions + commissions).toLocaleString()}</h2>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-xs">
                        <div className="text-gray-500"><span className="font-medium text-gray-700">₦{payroll.toLocaleString()}</span> Payroll</div>
                        <div className="text-gray-500"><span className="font-medium text-gray-700">₦{commissions.toLocaleString()}</span> Comm.</div>
                        <div className="text-gray-500"><span className="font-medium text-gray-700">₦{requisitions.toLocaleString()}</span> Req.</div>
                    </div>
                </div>

                {/* Net Profit Projection */}
                <div className="bg-gradient-to-br from-green-900 to-green-700 rounded-2xl p-6 shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.06] pointer-events-none">
                        <CheckCircle size={120} />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2 text-green-200 mb-2">
                            <CheckCircle size={20} />
                            <span className="font-bold text-sm tracking-wide">NET BRANCH PROFIT</span>
                        </div>
                        <h2 className="text-4xl font-black mt-1 tracking-tight text-white drop-shadow-sm">₦{netProfit.toLocaleString()}</h2>
                    </div>
                    <div className="mt-6 pt-4 border-t border-green-800/50">
                        <p className="text-xs text-green-100/70">Estimated net liquidity after operating expenses.</p>
                    </div>
                </div>
            </div>

            {/* Tactical Notifications Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Critical Alert */}
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex items-start space-x-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                        <Ban size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-orange-900 text-lg">Outstanding Client Debt</h3>
                        <p className="text-orange-800/80 text-sm mt-1 mb-3">
                            A total of <span className="font-black text-orange-600">₦{outstandingDebt.toLocaleString()}</span> in scheduled equity payments has not yet been routed through your accounts.
                        </p>
                    </div>
                </div>

                {/* Action Required Board */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start space-x-4 shadow-sm">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="w-full">
                        <h3 className="font-bold text-gray-900 text-lg">Pending Action Items</h3>
                        <p className="text-gray-500 text-sm mt-1 mb-4">
                            Check the Disbursement Center to clear the queue.
                        </p>
                        <div className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-600">Active Pipeline</span>
                            <a href={`/dashboard/${user?.branch?.name?.toLowerCase().replace(/\s+/g, '-') || 'head-office'}/disbursements`} 
                               className="text-sm font-bold text-blue-600 hover:text-blue-700 transition">
                                Go to Center &rarr;
                            </a>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
