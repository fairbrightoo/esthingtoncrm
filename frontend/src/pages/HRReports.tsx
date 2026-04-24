import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Users, Clock, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface HRAnalyticsData {
    headcount: number;
    roleDistribution: { name: string; value: number }[];
    attendanceTrends: {
        date: string;
        present: number;
        late: number;
        absent: number;
    }[];
    penalties: {
        totalLateOccurrences: number;
        feePerOccurrence: number;
        projectedTotalDeductions: number;
    };
    topSalesStaff?: {
        id: string;
        name: string;
        role: string;
        avatar: string | null;
        totalSales: number;
    }[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const HRReports = () => {
    const { user } = useAuth();
    const [data, setData] = useState<HRAnalyticsData | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setIsLoading(true);
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-analytics?month=${selectedMonth}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                if (res.data.success) {
                    setData(res.data.data);
                }
            } catch (error) {
                console.error('Failed to load HR analytics', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, [selectedMonth]);

    if (isLoading && !data) {
        return (
            <div className="flex justify-center p-20">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Human Capital Analytics</h1>
                <p className="text-gray-500 mt-2">Workforce insights, attendance tracking, and performance metics for {user?.company?.name}.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-blue-50 p-4 rounded-xl">
                        <Users className="text-blue-600" size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Headcount</p>
                        <h2 className="text-3xl font-bold text-gray-900 mt-1">{data.headcount}</h2>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-amber-50 p-4 rounded-xl">
                        <Clock className="text-amber-500" size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Monthly Lateness (Incidents)</p>
                        <h2 className="text-3xl font-bold text-gray-900 mt-1">{data.penalties.totalLateOccurrences}</h2>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-red-50 p-4 rounded-xl">
                        <AlertCircle className="text-red-500" size={32} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Projected Deductions</p>
                        <h2 className="text-3xl font-bold text-gray-900 mt-1">₦{data.penalties.projectedTotalDeductions.toLocaleString()}</h2>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Attendance Trends */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 font-display">Daily Attendance Trends (30 Days)</h3>
                    {data.attendanceTrends.length > 0 ? (
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.attendanceTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line type="monotone" name="Present" dataKey="present" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    <Line type="monotone" name="Late" dataKey="late" stroke="#F59E0B" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    <Line type="monotone" name="Absent" dataKey="absent" stroke="#EF4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[350px] flex items-center justify-center text-gray-400 flex-col">
                            <PieChartIcon size={48} className="mb-4 opacity-50" />
                            <p>No historical attendance data logged yet.</p>
                        </div>
                    )}
                </div>

                {/* Role Distribution */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 font-display">Branch Role Distribution</h3>
                    {data.roleDistribution.length > 0 ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.roleDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.roleDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        formatter={(value, name) => [`${value} Staff`, name]}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-400">
                            <p>No active staff found.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Top Sales Staff Widget */}
            {data.topSalesStaff && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mt-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800 font-display flex items-center">
                            <span className="bg-green-100 text-green-700 p-2 rounded-lg mr-3">💰</span>
                            Top Performing Staff (Approved Sales)
                        </h3>
                        <input 
                            type="month" 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                        />
                    </div>
                    {data.topSalesStaff.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No approved sales recorded for this month.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {data.topSalesStaff.map((staff, index) => (
                            <div key={staff.id} className={`flex items-center space-x-4 p-4 rounded-xl border ${index === 0 ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100 bg-gray-50'}`}>
                                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                                    {staff.avatar ? (
                                        <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${staff.avatar}`} alt={staff.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full uppercase flex items-center justify-center font-bold text-gray-500">{staff.name.charAt(0)}</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900 truncate">{staff.name}</h4>
                                    <p className="text-xs text-gray-500 font-medium">{staff.role.replace('_', ' ')}</p>
                                </div>
                                <div className="text-right pl-2">
                                    <p className={`text-lg font-bold ${index === 0 ? 'text-yellow-700' : 'text-gray-900'}`}>₦{staff.totalSales.toLocaleString()}</p>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Rank #{index + 1}</p>
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};
