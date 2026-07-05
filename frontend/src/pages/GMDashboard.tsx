import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { Megaphone, Users, CheckCircle, Globe, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';

export const GMDashboard = () => {
    const { token } = useAuth();
    const { branchName } = useParams();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, reqsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                
                const pendingAdvisories = reqsRes.data.filter((r: any) => r.status === 'PENDING_MD_APPROVAL').length;
                
                setStats({
                    ...statsRes.data,
                    pendingRequisitions: pendingAdvisories
                });
            } catch (error) {
                console.error("Failed to load GM dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [token]);

    if (loading) return <div className="p-10 text-center animate-pulse text-gray-500">Loading your Operational Desk...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">General Manager Desk</h1>
                    <p className="text-gray-500 mt-2">Operational oversight for {branchName?.replace(/-/g, ' ')}</p>
                </div>
                <div className="flex space-x-3">
                    <Link to={`/dashboard/${branchName}/network`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center shadow-sm transition-all text-sm font-medium">
                        <Globe size={16} className="mr-2" /> GM Network
                    </Link>
                </div>
            </div>

            {/* Quick Actions / Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Leads</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.financial?.totalLeads || 0}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Users size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Advisories</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.pendingRequisitions || 0}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                        <AlertTriangle size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Branch Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">₦{stats?.financial?.grossCashReceived?.toLocaleString() || stats?.financial?.totalRevenue?.toLocaleString() || 0}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <TrendingUp size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Broadcasts Sent</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">Active</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <Megaphone size={24} />
                    </div>
                </div>
            </div>

            {/* Main Action Hub */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Advisory Queue Shortcut */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <CheckCircle size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800">Advisory Queue</h2>
                        </div>
                        <Link to={`/dashboard/${branchName}/advisory`} className="text-sm text-indigo-600 font-medium hover:underline">View All</Link>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-500 text-sm mb-4">Review pending branch requisitions and attach your official recommendation before final Managing Director approval.</p>
                        <Link to={`/dashboard/${branchName}/advisory`} className="block w-full text-center py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors border border-gray-200">
                            Open Advisory Queue
                        </Link>
                    </div>
                </div>

                {/* Broadcast Shortcut */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                <Megaphone size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800">Branch Broadcasts</h2>
                        </div>
                        <Link to={`/dashboard/${branchName}/broadcasts`} className="text-sm text-purple-600 font-medium hover:underline">Manage</Link>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-500 text-sm mb-4">Dispatch official operational notices, policy updates, and general broadcasts to your branch staff.</p>
                        <Link to={`/dashboard/${branchName}/broadcasts`} className="block w-full text-center py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors border border-gray-200">
                            Create Broadcast
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};