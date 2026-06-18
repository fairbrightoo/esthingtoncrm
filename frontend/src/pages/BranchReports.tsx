import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Banknote, Users, Wallet, Calendar, Download, Activity, PieChart as PieIcon, Calculator, ArrowDownRight } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { CustomerCareReport } from '../components/CustomerCareReport';
import { ReportsDashboard } from './ReportsDashboard';

export const BranchReports = () => {
    const { user, token } = useAuth();
    const [activeMainTab, setActiveMainTab] = useState<'BI' | 'FINANCIAL'>('BI');
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'ALL' | 'MONTHLY_CYCLE' | 'THIS_MONTH' | 'LAST_90_DAYS' | 'CUSTOM'>('MONTHLY_CYCLE');
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');
    const reportRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `Financial_Report_${new Date().getTime()}`
    });

    useEffect(() => {
        if (user?.role === 'CUSTOMER_CARE') {
            setLoading(false);
            return;
        }
        
        const targetBranchId = user?.branchId || user?.branch?.id;
        if (targetBranchId) {
            if (dateRange === 'CUSTOM' && (!customStart || !customEnd)) {
                return; // Wait for both dates
            }
            fetchStats(targetBranchId);
        } else {
             setLoading(false);
        }
    }, [user, dateRange, customStart, customEnd]);

    const fetchStats = async (branchId: string) => {
        setLoading(true);
        try {
            let startParams = '';
            if (dateRange === 'THIS_MONTH') {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startParams = `&startDate=${startOfMonth.toISOString()}`;
            } else if (dateRange === 'LAST_90_DAYS') {
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                startParams = `&startDate=${ninetyDaysAgo.toISOString()}`;
            } else if (dateRange === 'MONTHLY_CYCLE') {
                const now = new Date();
                let year = now.getFullYear();
                let month = now.getMonth() + 1;

                let cycleMonth = month;
                let cycleYear = year;
                if (now.getDate() >= 26) {
                    cycleMonth = month + 1;
                    if (cycleMonth > 12) {
                        cycleMonth = 1;
                        cycleYear++;
                    }
                }

                let startMonth = cycleMonth - 1;
                let startYear = cycleYear;
                if (startMonth === 0) {
                    startMonth = 12;
                    startYear--;
                }
                const startDateStr = `${startYear}-${startMonth.toString().padStart(2, '0')}-26T00:00:00.000Z`;
                const endDateStr = `${cycleYear}-${cycleMonth.toString().padStart(2, '0')}-25T23:59:59.999Z`;

                startParams = `&startDate=${startDateStr}&endDate=${endDateStr}`;
            } else if (dateRange === 'CUSTOM') {
                if (customStart && customEnd) {
                    startParams = `&startDate=${new Date(customStart).toISOString()}&endDate=${new Date(customEnd).toISOString()}`;
                }
            }

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/reports/md?branchId=${branchId}${startParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading analytics...</div>;
    
    if (user?.role === 'CUSTOMER_CARE') {
        return <CustomerCareReport />;
    }

    if (!stats) return <div className="p-10 text-center text-red-500">Failed to load data.</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const debtData = [
        { name: 'Collected Revenue', value: stats.kpis?.grossRevenue || 0 },
        { name: 'Outstanding Debt', value: stats.kpis?.outstandingDebt || 0 }
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Branch Reports</h1>
                    <p className="text-gray-500">Financial insights and performance for {user?.branch?.name || 'your branch'}</p>
                </div>
                {activeMainTab === 'BI' && (
                    <div className="mt-4 md:mt-0 flex items-center space-x-3">
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                            <Calendar size={18} className="text-gray-500 ml-2 mr-2" />
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value as any)}
                                className="bg-transparent border-none outline-none text-sm text-gray-700 py-1 pr-6 cursor-pointer"
                            >
                                <option value="ALL">All-Time Revenue</option>
                                <option value="MONTHLY_CYCLE">Monthly Cycle (26th-25th)</option>
                                <option value="THIS_MONTH">This Month</option>
                                <option value="LAST_90_DAYS">Last 90 Days</option>
                                <option value="CUSTOM">Custom Date</option>
                            </select>
                        </div>
                        {dateRange === 'CUSTOM' && (
                            <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                <input 
                                    type="date" 
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-gray-700 py-1 pl-2"
                                />
                                <span className="text-gray-400">-</span>
                                <input 
                                    type="date" 
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-gray-700 py-1 pr-2"
                                />
                            </div>
                        )}
                        <button 
                            onClick={() => handlePrint()}
                            className="flex items-center px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium rounded-lg shadow-sm transition"
                        >
                            <Download size={16} className="mr-2" /> Export PDF
                        </button>
                    </div>
                )}
            </header>

            {(user?.role === 'ACCOUNTANT' || user?.role === 'BRANCH_ADMIN' || user?.role === 'MANAGING_DIRECTOR') && (
                <div className="flex space-x-1 border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveMainTab('BI')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors ${
                            activeMainTab === 'BI' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Business Intelligence Dashboard
                    </button>
                    <button
                        onClick={() => setActiveMainTab('FINANCIAL')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors ${
                            activeMainTab === 'FINANCIAL' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Detailed Financial Reports
                    </button>
                </div>
            )}

            {activeMainTab === 'FINANCIAL' ? (
                <ReportsDashboard embedded />
            ) : (
                <div ref={reportRef} className="space-y-6 print:p-8 print:bg-white print:min-h-screen">
                    {/* Print Context Header */}
                    <div className="hidden print:block border-b-2 border-gray-200 pb-4 mb-6">
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Esthington CRM</h1>
                        <h2 className="text-xl font-medium text-gray-600 mt-1">Branch Financial Report: {user?.branch?.name}</h2>
                        <p className="text-sm text-gray-500">Date Range Filter: {dateRange.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-500">Report Generated: {new Date().toLocaleString()}</p>
                </div>

                {/* Main Split-View Revenue Banners */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                    <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote size={100} /></div>
                        <div className="relative z-10">
                            <p className="text-blue-100 font-semibold tracking-widest uppercase text-xs mb-1 opacity-90 flex items-center"><ArrowDownRight size={14} className="mr-1"/> Direct Cash Inflow</p>
                            <h2 className="text-3xl font-black tracking-tight">₦{(stats.kpis?.grossCashReceived || 0).toLocaleString()}</h2>
                            <p className="text-xs text-blue-200 mt-2">Cash deposited to this branch's bank accounts.</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-900 to-purple-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={100} /></div>
                        <div className="relative z-10">
                            <p className="text-purple-100 font-semibold tracking-widest uppercase text-xs mb-1 opacity-90 flex items-center"><TrendingUp size={14} className="mr-1"/> Cross-Branch Value</p>
                            <h2 className="text-3xl font-black tracking-tight">₦{(stats.kpis?.outboundSalesVolume || 0).toLocaleString()}</h2>
                            <p className="text-xs text-purple-200 mt-2">Value your staff generated for other branches.</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={100} /></div>
                        <div className="relative z-10">
                            <p className="text-gray-100 font-semibold tracking-widest uppercase text-xs mb-1 opacity-90 flex items-center"><PieIcon size={14} className="mr-1"/> Total Staff Volume</p>
                            <h2 className="text-3xl font-black tracking-tight">₦{(stats.kpis?.totalSalesGenerated || 0).toLocaleString()}</h2>
                            <p className="text-xs text-gray-200 mt-2">Combined total sales volume of your staff.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-900 to-green-700 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden mb-6">
                    <div className="relative z-10 w-full flex justify-between items-end">
                        <div>
                            <p className="text-green-100 font-semibold tracking-widest uppercase text-xs mb-1 opacity-90">Net Branch Profit / Loss</p>
                            <h2 className="text-4xl font-black tracking-tight">₦{(stats.kpis?.netBranchProfit || 0).toLocaleString()}</h2>
                        </div>
                        <div className="text-sm font-medium opacity-90 text-right">
                            <div><span className="opacity-75">Gross Cash Revenue:</span> ₦{(stats.kpis?.grossRevenue || 0).toLocaleString()}</div>
                            <div><span className="opacity-75">Total Deductions:</span> ₦{((stats.kpis?.grossRevenue || 0) - (stats.kpis?.netBranchProfit || 0)).toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Sub-KPI Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                        <div className="flex items-center text-blue-600 mb-2 font-bold text-xs uppercase tracking-widest">
                            <TrendingUp size={16} className="mr-1" /> Commissions
                        </div>
                        <p className="text-xl font-bold text-gray-900">₦{(stats.kpis?.totalCommissionsCleared || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                        <div className="flex items-center text-purple-600 mb-2 font-bold text-xs uppercase tracking-widest">
                            <Users size={16} className="mr-1" /> Payroll Overhead
                        </div>
                        <p className="text-xl font-bold text-gray-900">₦{(stats.kpis?.totalPayrollOverhead || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                        <div className="flex items-center text-orange-600 mb-2 font-bold text-xs uppercase tracking-widest">
                            <Calculator size={16} className="mr-1" /> Requisitions
                        </div>
                        <p className="text-xl font-bold text-gray-900">₦{(stats.kpis?.totalRequisitionExpenses || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                        <div className="flex items-center text-red-600 mb-2 font-bold text-xs uppercase tracking-widest">
                            <ArrowDownRight size={16} className="mr-1" /> Tax Remitted
                        </div>
                        <p className="text-xl font-bold text-gray-900">₦{(stats.kpis?.totalTaxesRemitted || 0).toLocaleString()}</p>
                    </div>
                </div>

                {/* Line / Area Chart: 6 Month Cashflow */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-6 text-gray-800">Cashflow Trend (Last 6 Months)</h3>
                    {stats.charts?.cashflowTrend?.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-400">No data available for trend.</div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.charts?.cashflowTrend || []} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(v) => `₦${(v/1000000).toFixed(1)}M`} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                    <RechartsTooltip formatter={(value: any) => `₦${Number(value).toLocaleString()}`} />
                                    <Legend />
                                    <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                                    <Area type="monotone" dataKey="expenses" name="Total Expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpenses)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Additional Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                    
                    {/* Collection Efficiency Donut */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                            <PieIcon size={18} className="mr-2 text-gray-500" /> Collection vs Debt
                        </h3>
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[16rem]">
                            {(stats.kpis?.grossRevenue === 0 && stats.kpis?.outstandingDebt === 0) ? (
                                <div className="text-gray-400">No collection records exist yet.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie
                                            data={debtData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {debtData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#0088FE' : '#FF8042'} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: any) => `₦${Number(value).toLocaleString()}`} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Estate Distribution */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                            <Banknote size={18} className="mr-2 text-gray-500" /> Sales Volume by Estate
                        </h3>
                        <div className="flex-1 min-h-[16rem]">
                            {stats.charts?.estateDistribution?.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400">No estate sales in this period.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={stats.charts?.estateDistribution || []} layout="vertical" margin={{ left: 50, right: 10 }}>
                                        <defs>
                                            <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#3b82f6"/>
                                                <stop offset="100%" stopColor="#1e3a8a"/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                        <XAxis type="number" tickFormatter={(v) => `₦${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip formatter={(value: any) => `₦${Number(value).toLocaleString()}`} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="volume" name="Revenue Volume" fill="url(#colorBar)" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Marketer Leaderboard */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-6 text-gray-800 flex items-center">
                        <Users size={18} className="mr-2 text-gray-500" />
                        Top Performer Leaderboard
                    </h3>
                    
                    <div className="overflow-x-auto">
                        {stats.leaderboard?.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-gray-400">No marketers have closed sales in this period.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg font-semibold">Rank</th>
                                        <th className="px-4 py-3 font-semibold">Marketer</th>
                                        <th className="px-4 py-3 text-right font-semibold">Collected</th>
                                        <th className="px-4 py-3 text-right rounded-tr-lg font-semibold">Estimated Commission</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(stats.leaderboard || []).slice(0, 10).map((marketer: any, idx: number) => (
                                        <tr key={marketer.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-bold text-gray-400">#{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-gray-900">{marketer.name}</div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{marketer.role.replace(/_/g, ' ')}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-blue-600">
                                                ₦{marketer.collected.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-green-600">
                                                ₦{marketer.commissionEstimate.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};
