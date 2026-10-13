import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, XCircle, RefreshCw, Mail, MessageSquare, AlertCircle, Calendar, Send } from 'lucide-react';
import axios from 'axios';
import type { BroadcastCampaign, BroadcastRecipientLog, Contact } from './types';
import { formatPhoneDisplay } from './phoneUtils';

interface CampaignDetailDrawerProps {
    campaignId: string | null;
    onClose: () => void;
    onResendFailed: (failedContacts: Contact[]) => void;
    token: string | null;
}

export const CampaignDetailDrawer: React.FC<CampaignDetailDrawerProps> = ({
    campaignId,
    onClose,
    onResendFailed,
    token
}) => {
    const [campaign, setCampaign] = useState<BroadcastCampaign | null>(null);
    const [logs, setLogs] = useState<BroadcastRecipientLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingFailed, setIsFetchingFailed] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchLogs = async (currentPage = 1, status = statusFilter, query = search) => {
        if (!campaignId) return;
        setIsLoading(true);
        try {
            const params: any = { page: currentPage, limit: 30 };
            if (status !== 'ALL') params.status = status;
            if (query.trim()) params.search = query.trim();

            const res = await axios.get(`${API_URL}/api/bulk-messaging/campaigns/${campaignId}/logs`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setCampaign(res.data.campaign);
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
            setPage(res.data.page || 1);
            setTotalPages(res.data.totalPages || 1);
        } catch (error) {
            console.error("Failed to fetch campaign logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (campaignId) {
            setPage(1);
            fetchLogs(1, statusFilter, search);
        }
    }, [campaignId, statusFilter]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs(1, statusFilter, search);
    };

    const handleTriggerResend = async () => {
        if (!campaignId) return;
        setIsFetchingFailed(true);
        try {
            const res = await axios.get(`${API_URL}/api/bulk-messaging/campaigns/${campaignId}/failed`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const recipients: Contact[] = res.data.recipients || [];
            if (recipients.length > 0) {
                onResendFailed(recipients);
                onClose();
            }
        } catch (err) {
            console.error("Failed to load failed recipients:", err);
        } finally {
            setIsFetchingFailed(false);
        }
    };

    if (!campaignId) return null;

    const deliveryRate = campaign && campaign.totalRecipients > 0
        ? Math.round((campaign.successCount / campaign.totalRecipients) * 100)
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
            <div 
                className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/70">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                campaign?.channel === 'SMS' 
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                    : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}>
                                {campaign?.channel === 'SMS' ? <MessageSquare size={12} className="mr-1" /> : <Mail size={12} className="mr-1" />}
                                {campaign?.channel}
                            </span>
                            <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                {campaign?.senderId}
                            </span>
                        </div>
                        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                            {campaign?.title || "Campaign Logs Audit"}
                        </h2>
                        {campaign?.subject && (
                            <p className="text-xs font-medium text-gray-500">
                                Subject: <span className="text-gray-700 italic">"{campaign.subject}"</span>
                            </p>
                        )}
                        <p className="text-xs text-gray-400 flex items-center">
                            <Calendar size={12} className="mr-1" />
                            {campaign?.createdAt ? new Date(campaign.createdAt).toLocaleString() : ''}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Metrics Bar */}
                {campaign && (
                    <div className="px-6 py-4 border-b border-gray-100 bg-white grid grid-cols-4 gap-3 text-center">
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total</p>
                            <p className="text-lg font-extrabold text-gray-900">{campaign.totalRecipients.toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                            <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Delivered</p>
                            <p className="text-lg font-extrabold text-emerald-700">{campaign.successCount.toLocaleString()}</p>
                        </div>
                        <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                            <p className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Failed</p>
                            <p className="text-lg font-extrabold text-rose-700">{campaign.failedCount.toLocaleString()}</p>
                        </div>
                        <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                            <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">Success Rate</p>
                            <p className="text-lg font-extrabold text-blue-700">{deliveryRate}%</p>
                        </div>
                    </div>
                )}

                {/* Search & Filters */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search recipient by name, phone, email..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </form>
                    <div className="flex bg-gray-200/80 p-0.5 rounded-xl text-xs font-semibold">
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg transition ${
                                statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setStatusFilter('SUCCESS')}
                            className={`px-3 py-1.5 rounded-lg transition ${
                                statusFilter === 'SUCCESS' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-emerald-700'
                            }`}
                        >
                            Delivered
                        </button>
                        <button
                            onClick={() => setStatusFilter('FAILED')}
                            className={`px-3 py-1.5 rounded-lg transition ${
                                statusFilter === 'FAILED' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600 hover:text-rose-700'
                            }`}
                        >
                            Failed
                        </button>
                    </div>
                </div>

                {/* Recipient Logs List */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <RefreshCw size={24} className="animate-spin mb-2" />
                            <p className="text-sm">Loading recipient logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <AlertCircle size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">No recipient records match criteria</p>
                        </div>
                    ) : (
                        logs.map((log) => {
                            const isSuccess = log.status === 'SUCCESS';
                            return (
                                <div key={log.id} className="p-3.5 hover:bg-gray-50 transition rounded-xl flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center space-x-2">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {log.name || 'Anonymous Recipient'}
                                            </p>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                                isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {isSuccess ? <CheckCircle size={10} className="mr-1" /> : <XCircle size={10} className="mr-1" />}
                                                {isSuccess ? 'Delivered' : 'Failed'}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500 mt-0.5 space-x-3">
                                            {log.phone && <span>{formatPhoneDisplay(log.phone)}</span>}
                                            {log.email && <span>{log.email}</span>}
                                        </div>
                                        {log.failureReason && (
                                            <p className="text-xs text-rose-600 mt-1 font-medium bg-rose-50 px-2 py-1 rounded inline-block">
                                                Reason: {log.failureReason}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-400 shrink-0">
                                        {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer with Pagination & Resend Action */}
                <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                const newP = Math.max(1, page - 1);
                                setPage(newP);
                                fetchLogs(newP);
                            }}
                            disabled={page <= 1 || isLoading}
                            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-gray-500 font-medium">
                            Page {page} of {totalPages} ({total} logs)
                        </span>
                        <button
                            onClick={() => {
                                const newP = Math.min(totalPages, page + 1);
                                setPage(newP);
                                fetchLogs(newP);
                            }}
                            disabled={page >= totalPages || isLoading}
                            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"
                        >
                            Next
                        </button>
                    </div>

                    {campaign && campaign.failedCount > 0 && (
                        <button
                            onClick={handleTriggerResend}
                            disabled={isFetchingFailed}
                            className="inline-flex items-center px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition shadow-sm hover:shadow active:scale-95"
                        >
                            {isFetchingFailed ? (
                                <RefreshCw size={14} className="animate-spin mr-1.5" />
                            ) : (
                                <RefreshCw size={14} className="mr-1.5" />
                            )}
                            Resend {campaign.failedCount} Failed
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
