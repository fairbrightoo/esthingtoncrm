import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LayoutDashboard, Users, Trophy, DollarSign, Activity, Target, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

export const BDMCommandCenter = () => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    
    const [stats, setStats] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBDMData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch overall BDM stats
                const statsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/stats?scope=TEAM`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(statsRes.data);

                // 2. Fetch Assigned Teams
                const teamsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const fetchedTeams = teamsRes.data;
                setTeams(fetchedTeams);

                // 3. Build Team Leaderboard by fetching members for each team
                let boardData = [];
                for (let team of fetchedTeams) {
                    const membersRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams/${team.id}/members`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const members = membersRes.data;
                    const totalSales = members.reduce((sum: number, m: any) => sum + (m.monthlySales || 0), 0);
                    const totalLeads = members.reduce((sum: number, m: any) => sum + (m.leadsGenerated || 0), 0);
                    const totalClients = members.reduce((sum: number, m: any) => sum + (m.clientsConverted || 0), 0);
                    
                    boardData.push({
                        ...team,
                        totalSales,
                        totalLeads,
                        totalClients,
                        conversionRate: totalLeads > 0 ? ((totalClients / totalLeads) * 100).toFixed(1) : 0
                    });
                }
                
                // Sort by total sales descending
                boardData.sort((a, b) => b.totalSales - a.totalSales);
                setLeaderboard(boardData);

            } catch (error) {
                console.error("Failed to load BDM Command Center", error);
                addToast("Failed to load Command Center", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchBDMData();
    }, [token, addToast]);

    if (isLoading) return <div className="p-6">Loading Command Center...</div>;

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Command Center</h1>
                    <p className="text-gray-500 mt-1 flex items-center">
                        <LayoutDashboard size={16} className="mr-2" /> BDM Overview & Downline Management
                    </p>
                </div>
            </header>

            {/* BDM Aggregated Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 rounded-2xl border border-indigo-200 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10 text-indigo-500"><LayoutDashboard size={100} /></div>
                        <div className="flex items-center text-indigo-800 mb-2 relative z-10">
                            <Users size={20} className="mr-2" />
                            <span className="font-semibold text-sm">Teams Under Management</span>
                        </div>
                        <p className="text-3xl font-bold text-indigo-900 relative z-10">{teams.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10 text-emerald-500"><DollarSign size={100} /></div>
                        <div className="flex items-center text-emerald-800 mb-2 relative z-10">
                            <Trophy size={20} className="mr-2" />
                            <span className="font-semibold text-sm">Total Downline Sales</span>
                        </div>
                        <p className="text-3xl font-bold text-emerald-900 relative z-10">{formatCurrency(stats.financial?.totalRevenue || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10 text-blue-500"><Target size={100} /></div>
                        <div className="flex items-center text-blue-800 mb-2 relative z-10">
                            <Activity size={20} className="mr-2" />
                            <span className="font-semibold text-sm">Active Downline Prospects</span>
                        </div>
                        <p className="text-3xl font-bold text-blue-900 relative z-10">{(stats.financial?.totalLeads || 0) - (stats.financial?.clientLeads || 0)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-2xl border border-purple-200 shadow-sm relative overflow-hidden">
                         <div className="absolute -right-4 -bottom-4 opacity-10 text-purple-500"><Activity size={100} /></div>
                        <div className="flex items-center text-purple-800 mb-2 relative z-10">
                            <Users size={20} className="mr-2" />
                            <span className="font-semibold text-sm">Total Converted Clients</span>
                        </div>
                        <p className="text-3xl font-bold text-purple-900 relative z-10">{stats.financial?.clientLeads || 0}</p>
                    </div>
                </div>
            )}

            {/* Team Leaderboard */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <Trophy size={20} className="text-amber-500 mr-2" /> 
                        Team Performance Leaderboard
                    </h2>
                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">Current Month</span>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white text-gray-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4 border-b">Rank</th>
                            <th className="px-6 py-4 border-b">Team Name</th>
                            <th className="px-6 py-4 border-b">Team Lead</th>
                            <th className="px-6 py-4 border-b">Members</th>
                            <th className="px-6 py-4 border-b text-right">Monthly Sales</th>
                            <th className="px-6 py-4 border-b text-center">Pipeline (L/C)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {leaderboard.map((team, index) => (
                            <tr key={team.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 font-bold text-gray-400">
                                    {index === 0 ? <span className="text-amber-500 flex items-center"><Trophy size={16} className="mr-1" /> 1st</span> :
                                     index === 1 ? <span className="text-gray-400">2nd</span> :
                                     index === 2 ? <span className="text-amber-700">3rd</span> :
                                     `${index + 1}th`}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{team.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {team.teamLead ? (
                                        <div className="flex items-center text-sm font-medium text-gray-800">
                                            <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] mr-2">
                                                {team.teamLead.fullName.charAt(0)}
                                            </div>
                                            {team.teamLead.fullName}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Users size={14} className="mr-1" /> {team._count?.members || 0}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-emerald-600 text-right">
                                    {formatCurrency(team.totalSales)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-gray-600 font-medium">{team.totalLeads}</span>
                                    <span className="text-gray-400 mx-1">/</span>
                                    <span className="text-blue-600 font-medium">{team.totalClients}</span>
                                </td>
                            </tr>
                        ))}
                        {leaderboard.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No teams have been assigned to your management yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
                    <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Broadcast Message</h3>
                            <p className="text-xs text-gray-500">Send an announcement to all teams</p>
                        </div>
                    </div>
                    <button className="w-full py-2 bg-gray-50 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition text-sm">
                        Compose Broadcast (Coming Soon)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BDMCommandCenter;
