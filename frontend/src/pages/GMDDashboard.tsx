import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Building2, Users, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { AnnouncementWidget } from '../components/AnnouncementWidget';

export const GMDDashboard = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterMonth, setFilterMonth] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gmd-analytics/metrics`;
                if (filterMonth) {
                    const [year, month] = filterMonth.split('-');
                    const start = new Date(Number(year), Number(month) - 1, 1).toISOString().split('T')[0];
                    const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
                    url += `?startDate=${start}&endDate=${end}`;
                }

                const res = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(res.data);
            } catch (error) {
                console.error("Failed to load GMD stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [token, filterMonth]);

    if (!stats && loading) return <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" /></div>;

    if (!stats) return <div className="p-10 text-center">Failed to load oversight metrics.</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Global Executive Oversight (God View)</h1>
                    <p className="text-gray-500 mt-1">Real-time aggregate performance across all company branches.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <input 
                        type="month" 
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {filterMonth && (
                        <button 
                            onClick={() => setFilterMonth('')} 
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm transition"
                        >
                            Clear
                        </button>
                    )}
                    <div className="flex bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium border border-indigo-100 ml-4">
                        <Activity size={20} className="mr-2" /> System Status: Online
                    </div>
                </div>
            </header>

            <AnnouncementWidget />

            {loading && <div className="w-full h-1 bg-indigo-100 overflow-hidden"><div className="h-full bg-indigo-500 animate-pulse w-1/2"></div></div>}

            {/* Top Level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Active Branches</p>
                        <h2 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalBranches}</h2>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-full text-blue-600">
                        <Building2 size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Global Leads</p>
                        <h2 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalLeads}</h2>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-full text-purple-600">
                        <Users size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Global Client Conversion</p>
                        <h2 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalSales}</h2>
                    </div>
                    <div className="bg-green-50 p-4 rounded-full text-green-600">
                        <TrendingUp size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase">Est. Portfolio Value</p>
                        <h2 className="text-xl font-bold text-gray-800 mt-2">₦ {stats.globalRevenue.toLocaleString()}</h2>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-full text-yellow-600">
                        <DollarSign size={24} />
                    </div>
                </div>
            </div>

            {/* Branch Performance Comparison */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Branch Performance Diagnostics</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="py-4 px-4 font-bold text-gray-700">Branch Name</th>
                                <th className="py-4 px-4">Staff Count</th>
                                <th className="py-4 px-4">Active Leads</th>
                                <th className="py-4 px-4 hidden md:table-cell">Est. Revenue Gen</th>
                                <th className="py-4 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.branchPerformance.map((branch: any) => (
                                <tr key={branch.id} className="hover:bg-gray-50 transition">
                                    <td className="py-4 px-4 flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                            {branch.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-gray-800">{branch.name}</span>
                                    </td>
                                    <td className="py-4 px-4 text-gray-600">{branch.staffCount}</td>
                                    <td className="py-4 px-4 text-gray-600">{branch.totalLeads}</td>
                                    <td className="py-4 px-4 hidden md:table-cell text-gray-600 font-medium">₦ {branch.revenue.toLocaleString()}</td>
                                    <td className="py-4 px-4">
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">ACTIVE</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
