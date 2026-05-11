import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Users, TrendingUp, DollarSign, Calendar, Activity, ChevronRight, X, Phone, Mail } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

export const TeamManagement = () => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    
    const [team, setTeam] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pulse Modal State
    const [pulseUser, setPulseUser] = useState<any>(null);
    const [pulseData, setPulseData] = useState<any>(null);
    const [pulseLoading, setPulseLoading] = useState(false);

    useEffect(() => {
        const fetchTeamData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch the Team Lead's Team
                const teamRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const myTeam = teamRes.data[0]; // TEAM_LEAD only gets 1 team back
                setTeam(myTeam);

                if (myTeam) {
                    // 2. Fetch Members
                    const membersRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams/${myTeam.id}/members`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setMembers(membersRes.data);

                    // 3. Fetch Team Aggregate Stats
                    const statsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/stats?scope=TEAM`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setStats(statsRes.data);
                }
            } catch (error) {
                console.error("Failed to fetch team data", error);
                addToast("Failed to load team data", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeamData();
    }, [token, addToast]);

    const handleViewPulse = async (member: any) => {
        setPulseUser(member);
        setPulseLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams/pulse/${member.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPulseData(res.data);
        } catch (error) {
            console.error("Failed to fetch pulse", error);
            addToast("Could not load daily pulse", "error");
        } finally {
            setPulseLoading(false);
        }
    };

    if (isLoading) return <div className="p-6">Loading Team Management...</div>;

    if (!team) return (
        <div className="p-10 text-center">
            <h2 className="text-2xl font-bold text-gray-800">No Team Assigned</h2>
            <p className="text-gray-500 mt-2">You have not been assigned to lead a team yet. Please contact the Head of BDD.</p>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
                    <p className="text-gray-500 mt-1 flex items-center">
                        <Users size={16} className="mr-2" /> Team Management Dashboard
                    </p>
                </div>
            </header>

            {/* Team Overview Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200">
                        <div className="flex items-center text-blue-800 mb-2">
                            <Users size={20} className="mr-2" />
                            <span className="font-semibold text-sm">Total Members</span>
                        </div>
                        <p className="text-3xl font-bold text-blue-900">{members.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-2xl border border-emerald-200">
                        <div className="flex items-center text-emerald-800 mb-2">
                            <DollarSign size={20} className="mr-2" />
                            <span className="font-semibold text-sm">Team Sales (This Month)</span>
                        </div>
                        <p className="text-3xl font-bold text-emerald-900">{formatCurrency(stats.financial?.totalRevenue || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-2xl border border-purple-200">
                        <div className="flex items-center text-purple-800 mb-2">
                            <TrendingUp size={20} className="mr-2" />
                            <span className="font-semibold text-sm">Active Prospects</span>
                        </div>
                        <p className="text-3xl font-bold text-purple-900">{(stats.financial?.totalLeads || 0) - (stats.financial?.clientLeads || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-2xl border border-amber-200">
                        <div className="flex items-center text-amber-800 mb-2">
                            <Calendar size={20} className="mr-2" />
                            <span className="font-semibold text-sm">Follow-ups Today</span>
                        </div>
                        <p className="text-3xl font-bold text-amber-900">{stats.pipeline?.followUpsToday || 0}</p>
                    </div>
                </div>
            )}

            {/* Team Roster */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800">Team Roster & Performance</h2>
                    <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">Current Month</span>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white text-gray-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4 border-b">Member Name</th>
                            <th className="px-6 py-4 border-b">Contact</th>
                            <th className="px-6 py-4 border-b">Monthly Sales</th>
                            <th className="px-6 py-4 border-b text-center">Pipeline (L / C)</th>
                            <th className="px-6 py-4 border-b text-center">Conv. Rate</th>
                            <th className="px-6 py-4 border-b text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {members.map(m => (
                            <tr key={m.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-800">{m.fullName}</div>
                                    <div className="text-xs text-gray-500 mt-1">{m.role.replace('_', ' ')}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col text-xs text-gray-500 space-y-1">
                                        <div className="flex items-center"><Mail size={12} className="mr-1" /> {m.email}</div>
                                        {m.phone && <div className="flex items-center"><Phone size={12} className="mr-1" /> {m.phone}</div>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-semibold text-emerald-600">
                                    {formatCurrency(m.monthlySales || 0)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-gray-600 font-medium">{m.leadsGenerated}</span>
                                    <span className="text-gray-400 mx-1">/</span>
                                    <span className="text-blue-600 font-medium">{m.clientsConverted}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${m.conversionRate > 20 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {m.conversionRate}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleViewPulse(m)}
                                        className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center justify-center w-full"
                                    >
                                        <Activity size={14} className="mr-1" /> Pulse
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {members.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No members assigned to this team yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Daily Pulse Modal */}
            {pulseUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
                            <div>
                                <h3 className="font-bold text-gray-900 flex items-center">
                                    <Activity size={18} className="text-indigo-600 mr-2" />
                                    {pulseUser.fullName}'s Daily Pulse
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Live activity tracking for today</p>
                            </div>
                            <button onClick={() => setPulseUser(null)} className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-indigo-100 transition">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {pulseLoading ? (
                                <div className="flex justify-center p-8"><span className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></span></div>
                            ) : pulseData ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                            <p className="text-xs text-gray-500 font-medium mb-1">Leads Generated</p>
                                            <p className="text-2xl font-bold text-gray-800">{pulseData.metrics?.leadsGeneratedToday || 0}</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                            <p className="text-xs text-gray-500 font-medium mb-1">Follow-ups</p>
                                            <p className="text-2xl font-bold text-gray-800">{pulseData.metrics?.followUpsCompletedToday || 0}</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                            <p className="text-xs text-gray-500 font-medium mb-1">Inspections</p>
                                            <p className="text-2xl font-bold text-gray-800">{pulseData.metrics?.inspectionsToday || 0}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                                        <h4 className="font-semibold text-indigo-900 mb-4 text-sm">
                                            Pipeline Health
                                        </h4>
                                        <div className="flex items-center justify-between">
                                            <div className="text-center">
                                                <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mb-1">Active Leads</p>
                                                <p className="text-xl font-bold text-indigo-900">{pulseData.health?.activeLeads || 0}</p>
                                            </div>
                                            <div className="h-10 border-l border-indigo-200"></div>
                                            <div className="text-center">
                                                <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mb-1">Cold Leads</p>
                                                <p className="text-xl font-bold text-indigo-900">{pulseData.health?.coldLeads || 0}</p>
                                            </div>
                                            <div className="h-10 border-l border-indigo-200"></div>
                                            <div className="text-center">
                                                <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mb-1">Health Score</p>
                                                <p className={`text-xl font-bold ${pulseData.health?.pipelineHealthScore >= 70 ? 'text-green-600' : pulseData.health?.pipelineHealthScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {pulseData.health?.pipelineHealthScore || 0}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-8 text-gray-500">Could not load pulse data.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamManagement;
