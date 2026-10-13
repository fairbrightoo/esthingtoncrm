import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    Send, 
    CheckCircle, 
    XCircle, 
    RefreshCw, 
    Mail, 
    MessageSquare, 
    AlertCircle, 
    ChevronRight, 
    ExternalLink, 
    Calendar,
    Users,
    TrendingUp
} from 'lucide-react';
import axios from 'axios';
import type { BroadcastCampaign, Contact } from './types';
import { CampaignDetailDrawer } from './CampaignDetailDrawer';

interface BroadcastHistoryProps {
    token: string | null;
    onResendCampaign: (failedRecipients: Contact[], messageTemplate: string, channel: 'SMS' | 'EMAIL', senderId: string, emailSubject?: string) => void;
}

export const BroadcastHistory: React.FC<BroadcastHistoryProps> = ({ token, onResendCampaign }) => {
    const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [channelFilter, setChannelFilter] = useState<'ALL' | 'SMS' | 'EMAIL'>('ALL');
    const [isLoading, setIsLoading] = useState(false);
    
    // Drawer state
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchCampaigns = async (currentPage = 1, filter = channelFilter) => {
        setIsLoading(true);
        try {
            const params: any = { page: currentPage, limit: 12 };
            if (filter !== 'ALL') params.channel = filter;

            const res = await axios.get(`${API_URL}/api/bulk-messaging/campaigns`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setCampaigns(res.data.campaigns || []);
            setTotal(res.data.total || 0);
            setPage(res.data.page || 1);
            setTotalPages(res.data.totalPages || 1);
        } catch (error) {
            console.error("Failed to load campaigns:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchCampaigns(1, channelFilter);
    }, [channelFilter]);

    const handleQuickResend = async (camp: BroadcastCampaign) => {
        try {
            const res = await axios.get(`${API_URL}/api/bulk-messaging/campaigns/${camp.id}/failed`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const failedRecipients: Contact[] = res.data.recipients || [];
            if (failedRecipients.length > 0) {
                onResendCampaign(
                    failedRecipients,
                    camp.messageTemplate,
                    camp.channel,
                    camp.senderId,
                    camp.subject || undefined
                );
            }
        } catch (err) {
            console.error("Failed to trigger quick resend:", err);
        }
    };

    // Calculate aggregate totals
    const totalRecipientsAll = campaigns.reduce((acc, c) => acc + c.totalRecipients, 0);
    const totalDeliveredAll = campaigns.reduce((acc, c) => acc + c.successCount, 0);
    const overallSuccessRate = totalRecipientsAll > 0 
        ? Math.round((totalDeliveredAll / totalRecipientsAll) * 100) 
        : 100;

    return (
        <div className="space-y-6">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Send size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Campaigns</p>
                        <h3 className="text-2xl font-black text-gray-900">{total}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Messages In View</p>
                        <h3 className="text-2xl font-black text-gray-900">{totalRecipientsAll.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivered Rate</p>
                        <h3 className="text-2xl font-black text-emerald-700">{overallSuccessRate}%</h3>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Filter Channel:</span>
                    <button
                        onClick={() => setChannelFilter('ALL')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            channelFilter === 'ALL'
                                ? 'bg-gray-900 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        All Campaigns
                    </button>
                    <button
                        onClick={() => setChannelFilter('SMS')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                            channelFilter === 'SMS'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <MessageSquare size={13} className="mr-1" />
                        SMS Blasts
                    </button>
                    <button
                        onClick={() => setChannelFilter('EMAIL')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                            channelFilter === 'EMAIL'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <Mail size={13} className="mr-1" />
                        Email Blasts
                    </button>
                </div>

                <button
                    onClick={() => fetchCampaigns(page, channelFilter)}
                    disabled={isLoading}
                    className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 transition"
                >
                    <RefreshCw size={13} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Campaigns Grid */}
            {isLoading ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400">
                    <RefreshCw size={32} className="animate-spin mx-auto mb-3" />
                    <p className="text-sm font-semibold">Loading campaign archives...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No campaigns recorded yet</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                        Any blast dispatched from the Broadcast Engine will automatically be logged here with complete recipient audits.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaigns.map((camp) => {
                        const rate = camp.totalRecipients > 0
                            ? Math.round((camp.successCount / camp.totalRecipients) * 100)
                            : 0;

                        return (
                            <div 
                                key={camp.id}
                                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                camp.channel === 'SMS'
                                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                    : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                            }`}>
                                                {camp.channel === 'SMS' ? <MessageSquare size={12} className="mr-1" /> : <Mail size={12} className="mr-1" />}
                                                {camp.channel}
                                            </span>
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                                {camp.senderId}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">
                                            {new Date(camp.createdAt).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    {/* Campaign Title & Snippet */}
                                    <div>
                                        <h4 className="text-base font-bold text-gray-900 line-clamp-1">
                                            {camp.title}
                                        </h4>
                                        {camp.subject && (
                                            <p className="text-xs font-medium text-gray-500 mt-0.5 italic line-clamp-1">
                                                Subject: "{camp.subject}"
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-600 mt-2 line-clamp-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                            {camp.messageTemplate}
                                        </p>
                                    </div>

                                    {/* Progress & Metrics */}
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-gray-600">
                                                {camp.totalRecipients.toLocaleString()} Recipients
                                            </span>
                                            <span className="text-emerald-700 font-bold">
                                                {rate}% Delivered ({camp.successCount})
                                            </span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                                            <div 
                                                className="bg-emerald-500 h-full transition-all" 
                                                style={{ width: `${rate}%` }} 
                                            />
                                            {camp.failedCount > 0 && (
                                                <div 
                                                    className="bg-rose-500 h-full transition-all" 
                                                    style={{ width: `${100 - rate}%` }} 
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                                    <button
                                        onClick={() => setSelectedCampaignId(camp.id)}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center hover:underline"
                                    >
                                        View Detailed Logs
                                        <ChevronRight size={14} className="ml-0.5" />
                                    </button>

                                    {camp.failedCount > 0 && (
                                        <button
                                            onClick={() => handleQuickResend(camp)}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl transition"
                                        >
                                            <RefreshCw size={12} className="mr-1.5" />
                                            Resend Failed ({camp.failedCount})
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-3 pt-4">
                    <button
                        onClick={() => {
                            const newP = Math.max(1, page - 1);
                            setPage(newP);
                            fetchCampaigns(newP);
                        }}
                        disabled={page <= 1 || isLoading}
                        className="px-4 py-2 text-xs font-bold bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition shadow-sm"
                    >
                        Previous
                    </button>
                    <span className="text-xs font-bold text-gray-600">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => {
                            const newP = Math.min(totalPages, page + 1);
                            setPage(newP);
                            fetchCampaigns(newP);
                        }}
                        disabled={page >= totalPages || isLoading}
                        className="px-4 py-2 text-xs font-bold bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition shadow-sm"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Drilldown Slide-Over Drawer */}
            <CampaignDetailDrawer
                campaignId={selectedCampaignId}
                onClose={() => setSelectedCampaignId(null)}
                token={token}
                onResendFailed={(failedRecipients) => {
                    const c = campaigns.find(item => item.id === selectedCampaignId);
                    if (c) {
                        onResendCampaign(
                            failedRecipients,
                            c.messageTemplate,
                            c.channel,
                            c.senderId,
                            c.subject || undefined
                        );
                    }
                }}
            />
        </div>
    );
};
