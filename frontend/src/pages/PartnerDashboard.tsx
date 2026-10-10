import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Loader2, Copy, CheckCircle, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { SalesPerformanceTab } from '../components/SalesPerformanceTab';
import { AnnouncementWidget } from '../components/AnnouncementWidget';

export const PartnerDashboard = () => {
    const { user } = useAuth();
    const { toast, addToast } = useToast();
    const token = localStorage.getItem('token');
    
    const [personalStats, setPersonalStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const headers = { Authorization: `Bearer ${token}` };
                
                const personalStatsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/stats?scope=PERSONAL`, { headers });
                setPersonalStats(personalStatsRes.data);
            } catch (error) {
                console.error("Failed to fetch partner data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [token]);

    const referralLink = `${window.location.origin}/partner/join?referrer=${user?.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        addToast("Referral link copied to clipboard!", "success");
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                <p className="text-gray-500 font-medium">Loading partner dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-8 shadow-xl text-white">
                <div>
                    <h2 className="text-lg font-medium text-indigo-200 mb-1">
                        Welcome back, Partner
                    </h2>
                    <h1 className="text-4xl font-black tracking-tight mb-2">{user?.fullName}</h1>
                    <p className="text-indigo-100/80 font-medium max-w-xl">
                        Monitor your referrals, track your commissions, and access exclusive partner resources directly from your console.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3 bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/20">
                    <p className="text-sm font-semibold text-indigo-100">Your Unique Referral Link</p>
                    <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10">
                        <span className="text-xs text-gray-300 font-mono px-2 truncate max-w-[200px]">
                            {referralLink}
                        </span>
                        <button 
                            onClick={handleCopy}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white p-2 rounded-lg transition-all"
                        >
                            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            </header>

            <AnnouncementWidget />

            {/* Re-using the excellent Sales Performance Tab which contains everything a partner needs to track their deals and commissions */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                    <TrendingUp className="text-indigo-600" size={24} />
                    <h2 className="text-2xl font-bold text-gray-800">Your Sales & Commissions</h2>
                </div>
                <SalesPerformanceTab stats={personalStats} user={user} />
            </div>
            
            {/* Quick Actions for Partners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-3xl border border-indigo-100 flex flex-col justify-between items-start group hover:shadow-md transition-all">
                    <div>
                        <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                            <Users size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">My Network</h3>
                        <p className="text-gray-600 text-sm mb-6 max-w-sm">
                            View the clients you have referred and track their conversion status down the pipeline.
                        </p>
                    </div>
                    <button className="text-indigo-700 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all bg-white px-5 py-2.5 rounded-xl shadow-sm border border-indigo-100">
                        View Clients <ArrowRight size={16} />
                    </button>
                </div>
                
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-3xl border border-amber-100 flex flex-col justify-between items-start group hover:shadow-md transition-all">
                    <div>
                        <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Marketing Assets</h3>
                        <p className="text-gray-600 text-sm mb-6 max-w-sm">
                            Access high-quality banners, videos, and flyers to share with your network and drive sales.
                        </p>
                    </div>
                    <button className="text-amber-700 font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all bg-white px-5 py-2.5 rounded-xl shadow-sm border border-amber-100">
                        Open Media Hub <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
