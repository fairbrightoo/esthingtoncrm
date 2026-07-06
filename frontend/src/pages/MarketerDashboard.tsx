import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Calendar, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { AnnouncementWidget } from '../components/AnnouncementWidget';
import { SalesPerformanceTab } from '../components/SalesPerformanceTab';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateString));
};

export const MarketerDashboard = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const token = localStorage.getItem('token');
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [dateFilter, setDateFilter] = useState('ALL');
    const [viewScope, setViewScope] = useState<'PERSONAL' | 'TEAM' | 'DEPARTMENT'>('PERSONAL');

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                let params = '';
                if (dateFilter !== 'ALL') {
                    const now = new Date();
                    let start = '';
                    let end = now.toISOString();

                    if (dateFilter === 'THIS_MONTH') {
                        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    } else if (dateFilter === 'LAST_MONTH') {
                        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
                        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
                    } else if (dateFilter === 'THIS_YEAR') {
                        start = new Date(now.getFullYear(), 0, 1).toISOString();
                    }
                    params = `?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&scope=${viewScope}`;
                } else {
                    params = `?scope=${viewScope}`;
                }

                const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/stats${params}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch marketer stats", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [token, dateFilter, viewScope]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Hello, {user?.fullName?.split(' ')[0]} 👋</h1>
                    {user?.role === 'TEAM_LEAD' && (
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold inline-block mt-2">Team Lead</span>
                    )}
                    {user?.role === 'BDM' && (
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold inline-block mt-2">Business Development Manager</span>
                    )}
                    {user?.role === 'HEAD_BDD' && (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold inline-block mt-2">Head of Business Development</span>
                    )}
                    <p className="text-gray-500 mt-2">Here is a summary of your workspace and commissions.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    {/* View Scope Toggle for Managers */}
                    {(user?.role === 'TEAM_LEAD' || user?.role === 'BDM' || user?.role === 'HEAD_BDD') && (
                        <div className="flex bg-gray-100/80 p-1 rounded-xl shadow-inner border border-gray-200/60">
                            <button
                                onClick={() => setViewScope('PERSONAL')}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewScope === 'PERSONAL' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Personal
                            </button>
                            {user?.role === 'TEAM_LEAD' && (
                                <button
                                    onClick={() => setViewScope('TEAM')}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewScope === 'TEAM' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    My Team
                                </button>
                            )}
                            {(user?.role === 'BDM') && (
                                <button
                                    onClick={() => setViewScope('TEAM')}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewScope === 'TEAM' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    My Teams
                                </button>
                            )}
                            {user?.role === 'HEAD_BDD' && (
                                <button
                                    onClick={() => setViewScope('DEPARTMENT')}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewScope === 'DEPARTMENT' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Entire Department
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100">
                        <Calendar size={18} className="text-indigo-500" />
                        <select 
                            className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer pr-2"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option value="ALL">All Time</option>
                            <option value="THIS_MONTH">This Month</option>
                            <option value="LAST_MONTH">Last Month</option>
                            <option value="THIS_YEAR">This Year</option>
                        </select>
                    </div>
                </div>
            </div>

            <AnnouncementWidget />

            <SalesPerformanceTab stats={stats} user={user} />
        </div>
    );
};
