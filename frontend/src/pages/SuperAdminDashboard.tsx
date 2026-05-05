import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Building2, Globe, Users, FileText, Phone, Activity, DollarSign, TrendingUp, Calendar, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { AnnouncementWidget } from '../components/AnnouncementWidget';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const SuperAdminDashboard = () => {
    const { token } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Filtering States
    const [dateFilter, setDateFilter] = useState('ALL_TIME');
    const [customDates, setCustomDates] = useState({ startDate: '', endDate: '' });
    
    // UI States
    const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            let queryParams = '';
            
            const today = new Date();
            let start = new Date();
            let end = new Date();

            if (dateFilter === 'TODAY') {
                start.setHours(0, 0, 0, 0);
            } else if (dateFilter === 'LAST_7_DAYS') {
                start.setDate(today.getDate() - 7);
            } else if (dateFilter === 'THIS_MONTH') {
                start.setDate(1);
            } else if (dateFilter === 'YEAR_TO_DATE') {
                start.setMonth(0, 1);
            } else if (dateFilter === 'CUSTOM' && customDates.startDate && customDates.endDate) {
                start = new Date(customDates.startDate);
                end = new Date(customDates.endDate);
            }

            if (dateFilter !== 'ALL_TIME') {
                queryParams = `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
            }

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/global${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only run fetch automatically on fixed drops. Wait for explicit manual fetch if custom
        if (dateFilter !== 'CUSTOM') {
            fetchData();
        }
    }, [dateFilter, token]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    const toggleExpand = (companyId: string) => {
        setExpandedCompany(expandedCompany === companyId ? null : companyId);
    };

    if (!data && loading) return <div className="p-10 text-center text-gray-500">Loading Global Command Center...</div>;
    if (!data) return <div className="p-10 text-center text-red-500">Failed to load data. Ensure backend is running.</div>;


    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header & Controls */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Global Command Center</h1>
                    <p className="text-gray-500 mt-1">Real-time financial and conversion aggregation.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <Calendar size={18} className="text-gray-500" />
                        <select 
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-transparent text-sm font-medium outline-none text-gray-700 cursor-pointer"
                        >
                            <option value="ALL_TIME">All Time</option>
                            <option value="TODAY">Today</option>
                            <option value="LAST_7_DAYS">Last 7 Days</option>
                            <option value="THIS_MONTH">This Month</option>
                            <option value="YEAR_TO_DATE">Year to Date (YTD)</option>
                            <option value="CUSTOM">Custom Range</option>
                        </select>
                    </div>

                    {dateFilter === 'CUSTOM' && (
                        <div className="flex items-center space-x-2 animate-fade-in">
                            <input 
                                type="date" 
                                value={customDates.startDate} 
                                onChange={e => setCustomDates({...customDates, startDate: e.target.value})}
                                className="text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-400">to</span>
                            <input 
                                type="date" 
                                value={customDates.endDate} 
                                onChange={e => setCustomDates({...customDates, endDate: e.target.value})}
                                className="text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button onClick={fetchData} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                <Filter size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <AnnouncementWidget />

            {/* Massive KPI Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    icon={<DollarSign className="text-emerald-600 mb-1" size={28} />} 
                    label="Collected Revenue" 
                    value={formatCurrency(data.summary.revenue)} 
                    color="bg-emerald-50 border-emerald-100" 
                />
                <StatCard 
                    icon={<DollarSign className="text-red-600 mb-1" size={28} />} 
                    label="Total Expenses" 
                    value={formatCurrency(data.summary.expenses || 0)} 
                    color="bg-red-50 border-red-100" 
                />
                <StatCard 
                    icon={<DollarSign className="text-blue-600 mb-1" size={28} />} 
                    label="Net Income" 
                    value={formatCurrency(data.summary.netIncome || 0)} 
                    color="bg-blue-50 border-blue-100" 
                />
                <StatCard 
                    icon={<Users className="text-indigo-600 mb-1" size={28} />} 
                    label="Converted Clients" 
                    value={data.summary.clients.toLocaleString()} 
                    color="bg-indigo-50 border-indigo-100" 
                 />
                <StatCard 
                    icon={<FileText className="text-purple-600 mb-1" size={28} />} 
                    label="Total Leads" 
                    value={data.summary.leads.toLocaleString()} 
                    color="bg-purple-50 border-purple-100" 
                />
                <StatCard 
                    icon={<TrendingUp className="text-orange-600 mb-1" size={28} />} 
                    label="Group Conversion Rate" 
                    value={`${data.summary.conversionRate}%`} 
                    color="bg-orange-50 border-orange-100" 
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue by Company */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                        <DollarSign size={20} className="mr-2 text-emerald-500" />
                        Financials by Subsidiary
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.financialsByCompany} margin={{ left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₦${(val/1000000).toFixed(1)}M`} fontSize={11} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(value: any) => formatCurrency(value || 0)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leads by Company (Pie) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                        <Globe size={20} className="mr-2 text-blue-500" />
                        Lead Distribution
                    </h3>
                    <div className="h-80 flex items-center justify-center">
                        {data.charts.leadsByCompany.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.charts.leadsByCompany}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {data.charts.leadsByCompany.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-400">No leads recorded for this period.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Hierarchical Data Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <Building2 className="mr-2 text-indigo-500" size={20} />
                        Group Performance Matrix
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-sm text-gray-400">
                                <th className="p-4 font-semibold w-12"></th>
                                <th className="p-4 font-semibold">Entity</th>
                                <th className="p-4 font-semibold text-right">Revenue</th>
                                <th className="p-4 font-semibold text-right">Expenses</th>
                                <th className="p-4 font-semibold text-right">Net Income</th>
                                <th className="p-4 font-semibold text-center">Leads</th>
                                <th className="p-4 font-semibold text-center">Clients</th>
                                <th className="p-4 font-semibold text-right">Conversion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.companies.map((company: any) => (
                                <React.Fragment key={company.id}>
                                    {/* Company Level Row */}
                                    <tr 
                                        onClick={() => toggleExpand(company.id)}
                                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${expandedCompany === company.id ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <td className="p-4 text-gray-400">
                                            {expandedCompany === company.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: company.themeColor }}>
                                                    {company.name.substring(0,2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gray-800">{company.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-medium text-emerald-600">
                                            {formatCurrency(company.revenue)}
                                        </td>
                                        <td className="p-4 text-right font-medium text-red-500">
                                            {formatCurrency(company.expenses)}
                                        </td>
                                        <td className="p-4 text-right font-bold text-blue-600">
                                            {formatCurrency(company.netIncome)}
                                        </td>
                                        <td className="p-4 text-center font-medium text-gray-700">{company.leads}</td>
                                        <td className="p-4 text-center font-medium text-gray-700">{company.clients}</td>
                                        <td className="p-4 text-right font-bold">
                                            <span className={`px-2 py-1 rounded-full text-xs ${parseFloat(company.conversionRate) > 10 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {company.conversionRate}%
                                            </span>
                                        </td>
                                    </tr>
                                    
                                    {/* Branch Level Hidden Rows */}
                                    {expandedCompany === company.id && (
                                        company.branches.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="p-4 pl-16 text-sm text-gray-400 italic bg-gray-50">No branches registered for this active company.</td>
                                            </tr>
                                        ) : (
                                            company.branches.map((branch: any) => (
                                                <tr key={branch.id} className="bg-gray-50/80 border-l-4 border-l-blue-400 hover:bg-gray-100 transition-colors">
                                                    <td className="p-3"></td>
                                                    <td className="p-3 pl-6">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                            <span className="text-sm font-semibold text-gray-700 text-blue-900">{branch.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right text-sm font-medium text-emerald-600/80">
                                                        {formatCurrency(branch.revenue)}
                                                    </td>
                                                    <td className="p-3 text-right text-sm font-medium text-red-500/80">
                                                        {formatCurrency(branch.expenses)}
                                                    </td>
                                                    <td className="p-3 text-right text-sm font-bold text-blue-600/80">
                                                        {formatCurrency(branch.netIncome)}
                                                    </td>
                                                    <td className="p-3 text-center text-sm font-medium text-gray-600">{branch.leads}</td>
                                                    <td className="p-3 text-center text-sm font-medium text-gray-600">{branch.clients}</td>
                                                    <td className="p-3 text-right text-sm font-medium text-gray-700">
                                                        {branch.conversionRate}%
                                                    </td>
                                                </tr>
                                            ))
                                        )
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <Activity className="mr-2 text-red-500 animate-pulse" size={20} />
                        Live Employee Activity
                    </h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {data.recentActivities.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No recent interactions available.</div>
                    ) : (
                        data.recentActivities.map((activity: any) => (
                            <div key={activity.id} className="p-5 hover:bg-gray-50 transition-colors flex items-start space-x-4">
                                <div className={`w-3 h-3 mt-1.5 rounded-full shadow-sm ${getActivityColor(activity.type)}`}></div>
                                <div>
                                    <p className="text-sm text-gray-800 leading-snug">
                                        <span className="font-bold text-gray-900">{activity.createdByUser?.fullName || 'System'}</span> 
                                        <span className="text-gray-500 mx-1.5">orchestrated a</span>
                                        <span className={`font-semibold px-2 py-0.5 rounded text-xs ${getActivityColor(activity.type)} text-white`}>{activity.type}</span>
                                        <span className="text-gray-500 mx-1.5">interaction for</span>
                                        <span className="font-bold text-blue-600 cursor-pointer hover:underline">{activity.lead.fullName}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1.5 font-medium flex items-center">
                                        <Calendar size={12} className="mr-1" />
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, color }: any) => (
    <div className={`p-6 rounded-xl border ${color} flex items-start flex-col justify-center space-y-2 transition-transform hover:scale-[1.02] cursor-default shadow-sm relative overflow-hidden`}>
        <div className="absolute opacity-10 -right-4 -top-4 w-24 h-24 rounded-full bg-current mix-blend-overlay"></div>
        {icon}
        <div className="z-10 mt-2">
            <p className="text-3xl font-black text-gray-800 tracking-tight">{value}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">{label}</p>
        </div>
    </div>
);

const getActivityColor = (type: string) => {
    switch (type) {
        case 'CALL': return 'bg-indigo-500';
        case 'SMS': return 'bg-yellow-500';
        case 'SITE_VISIT': return 'bg-purple-600';
        case 'WHATSAPP': return 'bg-emerald-500';
        default: return 'bg-blue-500';
    }
};
