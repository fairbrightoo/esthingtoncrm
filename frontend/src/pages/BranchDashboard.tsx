import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Loader2, Users, FileSpreadsheet, CheckCircle, TrendingUp, Search, CalendarClock } from 'lucide-react';
import { AnnouncementWidget } from '../components/AnnouncementWidget';

export const BranchDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [staffCount, setStaffCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const basePath = `/dashboard/${user?.branch?.name?.toLowerCase().replace(/\s+/g, '-') || 'head-office'}`;

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
                
                // 1. Fetch Financial & Lead Stats
                const statsResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/stats`, { headers });
                setStats(statsResponse.data);

                // 2. Fetch Branch Requisitions (To see what branch money is pending)
                const reqsResponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions`, { headers });
                const branchReqs = reqsResponse.data.filter((r: any) => 
                    r.status === 'PENDING_MD_APPROVAL' || r.status === 'APPROVED_BY_MD'
                );
                setRequisitions(branchReqs);

                // 3. Fetch Staff Roll for Activity
                if (user?.companyId && user?.branchId) {
                    const staffRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${user.companyId}/branches/${user.branchId}/users`, { headers });
                    setStaffCount(staffRes.data.length);
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-gray-500 font-medium">Synchronizing branch data...</p>
            </div>
        );
    }

    const totalLeads = stats?.financial?.totalLeads || 0;
    const clientLeads = stats?.financial?.clientLeads || 0;
    const prospects = totalLeads - clientLeads;
    const conversionRate = stats?.financial?.conversionRate || 0;

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                    <h2 className="text-lg font-bold text-indigo-600 mb-1">
                        Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'} 👋
                    </h2>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Operations Ground Control</h1>
                    <p className="text-slate-500 mt-1 font-medium">Branch momentum and pending authorizations for {user?.branch?.name}.</p>
                </div>
            </header>

            <AnnouncementWidget />

            {/* Strategic KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Staff Attendance Pulse */}
                <div 
                    onClick={() => navigate(`${basePath}/users`)}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors group relative overflow-hidden"
                >
                    <div className="absolute -bottom-4 -right-4 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                        <Users size={120} />
                    </div>
                    <div className="flex items-center space-x-2 text-blue-600 mb-3">
                        <CalendarClock size={20} strokeWidth={2.5}/>
                        <span className="font-extrabold text-xs tracking-wider uppercase">Branch Strength</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 mt-1 tracking-tighter">
                        {staffCount}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-2">Active personnel assigned to target.</p>
                </div>

                {/* Lead Velocity */}
                <div 
                    onClick={() => navigate(`${basePath}/leads`)}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors group relative overflow-hidden"
                >
                     <div className="absolute -bottom-4 -right-4 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                        <TrendingUp size={120} />
                    </div>
                    <div className="flex items-center space-x-2 text-emerald-600 mb-3">
                        <Search size={20} strokeWidth={2.5}/>
                        <span className="font-extrabold text-xs tracking-wider uppercase">Active Pipeline</span>
                    </div>
                    <div className="flex justify-between items-end mt-1">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                            {prospects}
                        </h2>
                        <span className="text-emerald-500 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded-full mb-1 border border-emerald-100">
                            {conversionRate}% Close Rate
                        </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Prospects in communication.</p>
                </div>

                {/* Closed Deals */}
                <div 
                    onClick={() => navigate(`${basePath}/reports`)}
                    className="bg-slate-900 rounded-2xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] border border-slate-800 cursor-pointer hover:border-indigo-400 group transition-all relative overflow-hidden"
                >
                    <div className="absolute -bottom-4 -right-4 p-8 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                        <CheckCircle size={120} />
                    </div>
                    <div className="flex items-center space-x-2 text-white mb-3">
                        <CheckCircle size={20} strokeWidth={2.5}/>
                        <span className="font-extrabold text-xs tracking-wider uppercase text-indigo-300">Sales Secured</span>
                    </div>
                    <h2 className="text-4xl font-black mt-1 tracking-tighter text-white drop-shadow-sm">
                        {clientLeads}
                    </h2>
                    <p className="text-xs font-medium text-slate-400 mt-2">Converted clients on record.</p>
                </div>

            </div>

            {/* Operations Action Feed */}
            <div className="grid grid-cols-1 gap-6">
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center">
                            <FileSpreadsheet className="text-amber-500 mr-2" size={20} />
                            Branch Funding Requisitions
                        </h3>
                        <button onClick={() => navigate(`${basePath}/requisitions`)} className="text-blue-600 text-sm font-bold hover:text-blue-800">
                            Manage &rarr;
                        </button>
                    </div>
                    
                    {requisitions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No pending branch requisitions.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {requisitions.slice(0, 5).map(req => (
                                <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-800">{req.title}</div>
                                        <div className="text-sm text-slate-500 mt-0.5">{req.category} • Requested by {req.requestedByUser?.fullName || 'Staff'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg text-slate-900">
                                            ₦{(req.amountApproved || req.items?.reduce((s:number, i:any) => s + (i.qty * i.unitPrice), 0) || 0).toLocaleString()}
                                        </div>
                                        <div className="mt-1">
                                            {req.status === 'PENDING_MD_APPROVAL' ? (
                                                <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-600 rounded uppercase">Awaiting MD</span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-1 bg-green-50 text-green-600 rounded uppercase">Approved by MD</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
