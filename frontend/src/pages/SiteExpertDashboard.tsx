import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Map, Calendar, Camera } from 'lucide-react';
import { SalesPerformanceTab } from '../components/SalesPerformanceTab';

export const SiteExpertDashboard = () => {
    const { token, user } = useAuth();
    const [personalStats, setPersonalStats] = useState<any>(null);
    const [dashboardTab, setDashboardTab] = useState<'CONSOLE' | 'PERFORMANCE'>('CONSOLE');

    useEffect(() => {
        const fetchPersonalStats = async () => {
            try {
                const statsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/stats?scope=PERSONAL`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPersonalStats(statsRes.data);
            } catch (error) {
                console.error("Failed to fetch site expert stats", error);
            }
        };
        fetchPersonalStats();
    }, [token]);
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Site Expert Headquarters</h1>
                    <p className="text-gray-500 mt-1">Welcome back, {user?.fullName}. Manage your inspections and media.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200">
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
            </div>

            {dashboardTab === 'PERFORMANCE' ? (
                <SalesPerformanceTab stats={personalStats} user={user} />
            ) : (
                <>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-blue-100 p-4 rounded-xl text-blue-600"><Map size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Estates</p>
                        <h2 className="text-2xl font-bold text-gray-800">Knowledge Base</h2>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600"><Calendar size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Inspections</p>
                        <h2 className="text-2xl font-bold text-gray-800">Track Hub</h2>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-purple-100 p-4 rounded-xl text-purple-600"><Camera size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Media</p>
                        <h2 className="text-2xl font-bold text-gray-800">Site Uploads</h2>
                    </div>
                </div>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="text-blue-800 font-bold mb-2">Notice: Hybrid Role</h3>
                <p className="text-blue-700 text-sm">As a Site Expert, you also have full Marketer privileges. You can manage your own leads and record your sales using the 'My Leads' section in the sidebar, or view your performance above.</p>
            </div>
            </>
            )}
        </div>
    );
};
