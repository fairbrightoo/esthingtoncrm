import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Users, UserCheck, CalendarClock, AlertTriangle, ChevronRight, FileText, Target, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SalesPerformanceTab } from '../components/SalesPerformanceTab';

export const HRDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        headcount: 0,
        pendingLeaves: 0,
        openQueries: 0,
        awardsCount: 0
    });
    const [personalStats, setPersonalStats] = useState<any>(null);
    const [dashboardTab, setDashboardTab] = useState<'CONSOLE' | 'PERFORMANCE'>('CONSOLE');
    const [loading, setLoading] = useState(true);

    const basePath = `/dashboard/${user?.branch?.name?.toLowerCase().replace(/\s+/g, '-') || 'head-office'}`;

    useEffect(() => {
        fetchOverview();
        const fetchPersonalStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const statsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/stats?scope=PERSONAL`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPersonalStats(statsRes.data);
            } catch (error) {
                console.error("Failed to fetch personal stats", error);
            }
        };
        fetchPersonalStats();
    }, []);

    const fetchOverview = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            let headcount = 0;
            let pendingLeaves = 0;
            let openQueries = 0;
            let awardsCount = 0;

            try {
                const analyticsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-analytics`, { headers });
                headcount = analyticsRes.data?.data?.headcount || 0;
            } catch (e) { console.error('Analytics load error:', e); }

            try {
                const leavesRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/leaves/branch-leaves`, { headers });
                pendingLeaves = Array.isArray(leavesRes.data) ? leavesRes.data.filter((l: any) => l.status === 'PENDING_HR_VETTING').length : 0;
            } catch (e) { console.error('Leaves load error:', e); }

            try {
                const queriesRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/queries/branch-queries`, { headers });
                openQueries = Array.isArray(queriesRes.data) ? queriesRes.data.filter((q: any) => q.status === 'OPEN').length : 0;
            } catch (e) { console.error('Queries load error:', e); }

            try {
                const awardsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/awards`, { headers });
                awardsCount = Array.isArray(awardsRes.data) ? awardsRes.data.length : 0;
            } catch (e) { console.error('Awards load error:', e); }

            setStats({ headcount, pendingLeaves, openQueries, awardsCount });
            setLoading(false);
        } catch (error) {
            console.error('Core HR Dashboard error:', error);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Catchy Welcome Banner */}
            <div className="relative overflow-hidden bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-600 rounded-3xl shadow-xl border border-indigo-500">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Users size={300} className="transform rotate-12" />
                </div>
                <div className="relative p-10 md:p-14 text-white z-10 flex flex-col justify-center min-h-[250px]">
                    <span className="bg-indigo-900/40 border border-indigo-400/30 text-indigo-100 text-xs font-black tracking-widest uppercase px-4 py-1.5 rounded-full inline-block mb-6 w-max backdrop-blur-md">
                        {user?.branch?.name} Human Resources
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-md">
                        Welcome, {user?.fullName?.split(' ')[0]}!
                    </h1>
                    <p className="text-indigo-100 text-lg md:text-xl font-medium max-w-2xl opacity-90 leading-relaxed">
                        You oversee the heartbeat of the company. Review leave requests, appraise staff performance, and manage disciplinary actions efficiently today.
                    </p>
                </div>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200 w-max">
                <button
                    onClick={() => setDashboardTab('CONSOLE')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${dashboardTab === 'CONSOLE' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Console View
                </button>
                <button
                    onClick={() => setDashboardTab('PERFORMANCE')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${dashboardTab === 'PERFORMANCE' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    My Sales Performance
                </button>
            </div>

            {dashboardTab === 'PERFORMANCE' ? (
                <SalesPerformanceTab stats={personalStats} user={user} />
            ) : (
                <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><Users size={100} /></div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><UserCheck size={24} /></div>
                    <h3 className="text-gray-500 font-semibold text-sm mb-1">Active Headcount</h3>
                    <p className="text-3xl font-black text-gray-900">{loading ? '...' : stats.headcount}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><CalendarClock size={100} /></div>
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4"><CalendarClock size={24} /></div>
                    <h3 className="text-gray-500 font-semibold text-sm mb-1">Pending Leave Approvals</h3>
                    <div className="flex items-end space-x-3">
                        <p className="text-3xl font-black text-gray-900">{loading ? '...' : stats.pendingLeaves}</p>
                        {stats.pendingLeaves > 0 && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-bold mb-1">Requires Vetting</span>}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><AlertTriangle size={100} /></div>
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
                    <h3 className="text-gray-500 font-semibold text-sm mb-1">Open Disciplinary Queries</h3>
                    <div className="flex items-end space-x-3">
                        <p className="text-3xl font-black text-gray-900">{loading ? '...' : stats.openQueries}</p>
                        {stats.openQueries > 0 && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold mb-1">Awaiting Replies</span>}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><Target size={100} /></div>
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4"><Target size={24} /></div>
                    <h3 className="text-gray-500 font-semibold text-sm mb-1">Staff Awards Issued</h3>
                    <p className="text-3xl font-black text-gray-900">{loading ? '...' : stats.awardsCount}</p>
                </div>
            </div>

            {/* Quick Action Portals */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 ml-1">Command Shortcuts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link to={`${basePath}/leaves`} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all group">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600"><CalendarClock size={20} /></div>
                            <span className="font-semibold text-gray-800">Vet Leaves</span>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-indigo-600 transition-colors" size={20} />
                    </Link>
                    
                    <Link to={`${basePath}/appraisals`} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-purple-300 hover:shadow-md transition-all group">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600"><Target size={20} /></div>
                            <span className="font-semibold text-gray-800">Appraise Staff</span>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-purple-600 transition-colors" size={20} />
                    </Link>

                    <Link to={`${basePath}/disciplinary`} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-red-300 hover:shadow-md transition-all group">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600"><AlertTriangle size={20} /></div>
                            <span className="font-semibold text-gray-800">Issue Query</span>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-red-600 transition-colors" size={20} />
                    </Link>

                    <Link to={`${basePath}/policies`} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all group">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><BookOpen size={20} /></div>
                            <span className="font-semibold text-gray-800">Publish Docs</span>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-600 transition-colors" size={20} />
                    </Link>
                </div>
            </div>        </>
            )}
        </div>
    );
};
