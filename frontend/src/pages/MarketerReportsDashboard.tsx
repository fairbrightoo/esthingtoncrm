import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    DollarSign,
    Users,
    Activity,
    Briefcase,
    Calendar,
    Target,
    PieChart,
    BarChart3,
    CheckCircle,
    XCircle,
    Clock,
    UserCheck,
    TrendingUp,
    List,
    Layers,
    AlertCircle
} from 'lucide-react';
import { AnnouncementWidget } from '../components/AnnouncementWidget';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const MarketerReportsDashboard = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    // Filters
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const [activeTab, setActiveTab] = useState<'SALES' | 'LEADS' | 'DISTRIBUTION' | 'ATTENDANCE' | 'TASKS' | 'TARGETS'>('SALES');

    useEffect(() => {
        fetchReports();
    }, [month, year]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Determine date range for the month (1st to last day)
            // For a simpler approach, we'll just query by the whole month
            const startOfMonth = new Date(year, month - 1, 1).toISOString();
            const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString();

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/reports/marketer?startDate=${startOfMonth}&endDate=${endOfMonth}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch marketer reports", error);
            addToast("Failed to fetch reports data", "error");
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const { kpis, payments, leads, attendance, charts } = stats;

    // Formatting chart data
    const estateData = charts.estateDistribution || [];
    const productData = charts.productDistribution || [];
    
    // Funnel Data for Bar Chart
    const funnelData = [
        { name: 'Prospects', count: leads.statusCounts['PROSPECT'] || 0, fill: '#64748b' },
        { name: 'Contacted', count: leads.statusCounts['CONTACTED'] || 0, fill: '#3b82f6' },
        { name: 'Negotiating', count: leads.statusCounts['NEGOTIATING'] || 0, fill: '#f59e0b' },
        { name: 'Clients', count: leads.statusCounts['CLIENT'] || 0, fill: '#10b981' }
    ];

    // Dummy Target Data (Assuming standard targets for UI)
    const targetRevenue = 50000000; // 50m target
    const targetClients = 10;
    
    const revenueProgress = Math.min((kpis.totalRevenue / targetRevenue) * 100, 100);
    const clientsProgress = Math.min((kpis.totalClients / targetClients) * 100, 100);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Performance Report</h1>
                    <p className="text-gray-500">Detailed analytics and performance metrics for {stats.user.fullName}.</p>
                </div>
                
                <div className="flex space-x-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="border-none bg-gray-50 text-gray-700 text-sm rounded-lg focus:ring-0 py-2 px-3 font-medium"
                    >
                        {Array.from({length: 12}, (_, i) => (
                            <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select 
                        value={year} 
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="border-none bg-gray-50 text-gray-700 text-sm rounded-lg focus:ring-0 py-2 px-3 font-medium"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <AnnouncementWidget />

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Sales Volume</p>
                        <h3 className="text-xl font-bold text-gray-900">{formatCurrency(kpis.totalRevenue)}</h3>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-green-50 text-green-600">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Commission Accrued</p>
                        <h3 className="text-xl font-bold text-green-600">{formatCurrency(kpis.commissionAccrued)}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Lead Conversion Rate</p>
                        <h3 className="text-xl font-bold text-gray-900">{kpis.conversionRate}%</h3>
                        <p className="text-xs text-gray-400 mt-1">{kpis.totalClients} / {kpis.totalLeads} converted</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-orange-50 text-orange-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Avg. Time to Close</p>
                        <h3 className="text-xl font-bold text-gray-900">{kpis.avgTimeToCloseDays} Days</h3>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto hide-scrollbar space-x-4 border-b border-gray-200">
                {[
                    { id: 'SALES', label: 'Sales Log', icon: <List size={16} /> },
                    { id: 'LEADS', label: 'Lead Funnel', icon: <Activity size={16} /> },
                    { id: 'DISTRIBUTION', label: 'Estate Stats', icon: <PieChart size={16} /> },
                    { id: 'TASKS', label: 'Task Analytics', icon: <CheckCircle size={16} /> },
                    { id: 'ATTENDANCE', label: 'Attendance', icon: <UserCheck size={16} /> },
                    { id: 'TARGETS', label: 'Targets', icon: <Target size={16} /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 px-2 font-bold flex items-center whitespace-nowrap transition-colors ${
                            activeTab === tab.id 
                            ? 'text-blue-600 border-b-2 border-blue-600' 
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span className="mr-2">{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            
            {/* 1. SALES LOG */}
            {activeTab === 'SALES' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Approved Sales & Commissions</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Estate & Plot</th>
                                    <th className="px-6 py-4">Payment Method</th>
                                    <th className="px-6 py-4 text-right">Amount Paid</th>
                                    <th className="px-6 py-4 text-right">Comm. Accrued</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payments.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No sales recorded for this period.</td></tr>
                                ) : (
                                    payments.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {new Date(p.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{p.sale.lead?.fullName || 'Unknown'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-800 font-medium">{p.sale.plot?.estate?.name || 'Unknown Estate'}</div>
                                                <div className="text-xs text-gray-500">{p.sale.plot?.prototype || 'Unknown Plot'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-gray-700">{p.method}</span>
                                                {p.accountPaidTo && (
                                                    <div className="mt-1"><span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap">{p.accountPaidTo}</span></div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                {formatCurrency(p.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-green-600">
                                                {formatCurrency(p.commissionAccrued)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 2. LEAD FUNNEL */}
            {activeTab === 'LEADS' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="font-bold text-gray-800 mb-6">Lead Conversion Funnel</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                    <Tooltip cursor={{fill: '#f1f5f9'}} />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {funnelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <h3 className="font-bold text-gray-800 mb-4">Lead Status Breakdown</h3>
                        <div className="space-y-4">
                            {funnelData.map((stage, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.fill }}></div>
                                        <span className="font-medium text-gray-700">{stage.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{stage.count}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                            <h4 className="font-bold mb-1">Conversion Insight</h4>
                            <p className="text-sm">You converted <strong>{kpis.conversionRate}%</strong> of your leads to clients this month. The average time to close a lead is <strong>{kpis.avgTimeToCloseDays} days</strong>.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. ESTATE & PRODUCT DISTRIBUTION */}
            {activeTab === 'DISTRIBUTION' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col items-center">
                        <h3 className="font-bold text-gray-800 mb-2 self-start">Sales by Estate</h3>
                        <p className="text-xs text-gray-500 mb-4 self-start">Revenue distribution across different estates</p>
                        
                        {estateData.length > 0 ? (
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie data={estateData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
                                            {estateData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                        <Legend />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-72 w-full flex items-center justify-center text-gray-400">No estate sales data</div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col items-center">
                        <h3 className="font-bold text-gray-800 mb-2 self-start">Sales by Product Type</h3>
                        <p className="text-xs text-gray-500 mb-4 self-start">Revenue distribution across different plot prototypes</p>
                        
                        {productData.length > 0 ? (
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie data={productData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
                                            {productData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                        <Legend />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-72 w-full flex items-center justify-center text-gray-400">No product sales data</div>
                        )}
                    </div>
                </div>
            )}

            {/* 4. TASK ANALYTICS */}
            {activeTab === 'TASKS' && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="font-bold text-gray-800 mb-6">Task & Follow-up Performance</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="relative w-40 h-40 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="10" strokeDasharray="283" strokeDashoffset={283 - (283 * Number(kpis.taskCompletionRate)) / 100} className="transition-all duration-1000 ease-out" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-gray-900">{kpis.taskCompletionRate}%</span>
                                </div>
                            </div>
                            <h4 className="font-bold text-gray-800 mt-6">Task Completion Rate</h4>
                            <p className="text-sm text-gray-500 text-center mt-2">Percentage of tasks and follow-ups marked as completed this month.</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="p-4 border rounded-xl flex items-start space-x-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={24}/></div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Consistency is Key</h4>
                                    <p className="text-sm text-gray-600 mt-1">Marketers who complete 80%+ of their follow-up tasks convert 3x more clients. Keep logging your calls and meetings!</p>
                                </div>
                            </div>
                            <div className="p-4 border rounded-xl flex items-start space-x-4">
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={24}/></div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Speed to Contact</h4>
                                    <p className="text-sm text-gray-600 mt-1">Your average time to close a lead is {kpis.avgTimeToCloseDays} days. Faster follow-ups usually reduce this number.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. ATTENDANCE */}
            {activeTab === 'ATTENDANCE' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Attendance Log</h3>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">Showing max 30 days</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Clock In</th>
                                    <th className="px-6 py-4">Clock Out</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendance.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">No attendance records found for this period.</td></tr>
                                ) : (
                                    attendance.map((a: any) => (
                                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {new Date(a.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase rounded ${
                                                    a.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                                    a.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 6. TARGETS & PROJECTIONS */}
            {activeTab === 'TARGETS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h3 className="font-bold text-gray-800">Monthly Revenue Goal</h3>
                                <p className="text-sm text-gray-500">Progress against assumed target</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-blue-600">{revenueProgress.toFixed(1)}%</span>
                            </div>
                        </div>
                        
                        <div className="w-full bg-gray-100 rounded-full h-4 mb-4 overflow-hidden">
                            <div className="bg-blue-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${revenueProgress}%` }}></div>
                        </div>
                        
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-gray-900">{formatCurrency(kpis.totalRevenue)}</span>
                            <span className="text-gray-400">Target: {formatCurrency(targetRevenue)}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h3 className="font-bold text-gray-800">Monthly Client Goal</h3>
                                <p className="text-sm text-gray-500">Progress against target clients</p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-green-600">{clientsProgress.toFixed(1)}%</span>
                            </div>
                        </div>
                        
                        <div className="w-full bg-gray-100 rounded-full h-4 mb-4 overflow-hidden">
                            <div className="bg-green-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${clientsProgress}%` }}></div>
                        </div>
                        
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-gray-900">{kpis.totalClients} Clients</span>
                            <span className="text-gray-400">Target: {targetClients} Clients</span>
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-900 to-blue-900 rounded-xl shadow-lg border border-blue-800 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <TrendingUp size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-blue-200 font-medium uppercase tracking-wider text-sm mb-2">Year-End Commission Projection</h3>
                            <div className="flex items-end space-x-3 mb-4">
                                <span className="text-5xl font-bold">{formatCurrency(kpis.commissionAccrued * 12)}</span>
                                <span className="text-blue-200 mb-2 font-medium">projected</span>
                            </div>
                            <p className="text-blue-100 max-w-lg leading-relaxed">
                                Based on your current monthly sales velocity, you are projected to accrue this much commission over a 12-month period. Keep pushing your pipeline to increase this projection!
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
