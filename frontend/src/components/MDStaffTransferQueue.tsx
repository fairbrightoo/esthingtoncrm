import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    ArrowRightLeft,
    CheckCircle,
    XCircle,
    Clock,
    Building2,
    Calendar,
    FileText,
    ShieldCheck,
    AlertCircle,
    Printer,
    X,
    UserCheck,
    Search
} from 'lucide-react';
import { TransferLetterModal } from './TransferLetterModal';

export const MDStaffTransferQueue = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();

    const [transfers, setTransfers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState<'OUTBOUND' | 'INBOUND' | 'HISTORY'>('OUTBOUND');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state for actions
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'RELEASING_APPROVE' | 'RELEASING_REJECT' | 'RECEIVING_ACCEPT' | 'RECEIVING_DECLINE';
        transfer: any | null;
        remarks: string;
        reason: string;
    }>({
        isOpen: false,
        type: 'RELEASING_APPROVE',
        transfer: null,
        remarks: '',
        reason: ''
    });

    const [submittingAction, setSubmittingAction] = useState(false);

    // Letter Preview Modal
    const [letterModal, setLetterModal] = useState<{ isOpen: boolean; transfer: any | null }>({
        isOpen: false,
        transfer: null
    });

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/transfers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTransfers(res.data);
        } catch (error) {
            console.error('Failed to load transfers', error);
            addToast('Failed to load staff transfers.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteAction = async () => {
        const { type, transfer, remarks, reason } = actionModal;
        if (!transfer) return;

        setSubmittingAction(true);
        try {
            let endpoint = '';
            let payload: any = {};

            if (type === 'RELEASING_APPROVE') {
                endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/transfers/${transfer.id}/releasing-signoff`;
                payload = { action: 'APPROVE', remarks };
            } else if (type === 'RELEASING_REJECT') {
                if (!reason.trim()) {
                    addToast('Rejection reason is required.', 'error');
                    setSubmittingAction(false);
                    return;
                }
                endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/transfers/${transfer.id}/releasing-signoff`;
                payload = { action: 'REJECT', rejectionReason: reason };
            } else if (type === 'RECEIVING_ACCEPT') {
                endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/transfers/${transfer.id}/receiving-signoff`;
                payload = { action: 'ACCEPT', remarks };
            } else if (type === 'RECEIVING_DECLINE') {
                if (!reason.trim()) {
                    addToast('Decline reason is required.', 'error');
                    setSubmittingAction(false);
                    return;
                }
                endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/transfers/${transfer.id}/receiving-signoff`;
                payload = { action: 'DECLINE', declineReason: reason };
            }

            const res = await axios.put(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            addToast(res.data.message || 'Action executed successfully.', 'success');
            setActionModal({ isOpen: false, type: 'RELEASING_APPROVE', transfer: null, remarks: '', reason: '' });
            fetchTransfers();
        } catch (error: any) {
            console.error('Failed to execute transfer action', error);
            addToast(error.response?.data?.error || 'Action failed.', 'error');
        } finally {
            setSubmittingAction(false);
        }
    };

    // Filter by Subtab
    const userBranchId = user?.branchId || user?.branch?.id;
    const isGlobalExecutive = ['GROUP_MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN'].includes(user?.role || '');

    const outboundList = transfers.filter(t =>
        (isGlobalExecutive || t.fromBranchId === userBranchId) &&
        t.status === 'PENDING_RELEASING_MD'
    );

    const inboundList = transfers.filter(t =>
        (isGlobalExecutive || t.toBranchId === userBranchId) &&
        t.status === 'PENDING_RECEIVING_MD'
    );

    const historyList = transfers.filter(t =>
        ['COMPLETED', 'APPROVED_SCHEDULED', 'REJECTED_BY_RELEASING_MD', 'DECLINED_BY_RECEIVING_MD', 'CANCELLED'].includes(t.status)
    );

    const currentList =
        subTab === 'OUTBOUND' ? outboundList :
        subTab === 'INBOUND' ? inboundList :
        historyList;

    const filteredList = currentList.filter(t => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            t.user?.fullName?.toLowerCase().includes(q) ||
            t.referenceNumber?.toLowerCase().includes(q) ||
            t.fromBranch?.name?.toLowerCase().includes(q) ||
            t.toBranch?.name?.toLowerCase().includes(q) ||
            t.newRole?.toLowerCase().includes(q) ||
            t.previousRole?.toLowerCase().includes(q)
        );
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING_RELEASING_MD':
                return <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-200">Pending Releasing MD</span>;
            case 'PENDING_RECEIVING_MD':
                return <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-200">Pending Destination MD</span>;
            case 'APPROVED_SCHEDULED':
                return <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-purple-200">Approved (Scheduled)</span>;
            case 'COMPLETED':
                return <span className="bg-green-100 text-green-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-green-200">Transfer Completed</span>;
            case 'REJECTED_BY_RELEASING_MD':
                return <span className="bg-red-100 text-red-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-red-200">Rejected by Origin MD</span>;
            case 'DECLINED_BY_RECEIVING_MD':
                return <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-rose-200">Declined by Destination MD</span>;
            case 'CANCELLED':
                return <span className="bg-gray-100 text-gray-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-gray-200">Cancelled</span>;
            default:
                return <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-2.5 py-1 rounded-full">{status}</span>;
        }
    };

    return (
        <div className="space-y-5">
            {/* Subtabs Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-3">
                <div className="flex space-x-3 overflow-x-auto">
                    <button
                        onClick={() => setSubTab('OUTBOUND')}
                        className={`pb-2 px-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                            subTab === 'OUTBOUND'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span>Outbound Transfers (Releasing)</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                            subTab === 'OUTBOUND' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {outboundList.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setSubTab('INBOUND')}
                        className={`pb-2 px-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                            subTab === 'INBOUND'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span>Inbound Transfers (Receiving)</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                            subTab === 'INBOUND' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {inboundList.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setSubTab('HISTORY')}
                        className={`pb-2 px-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
                            subTab === 'HISTORY'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span>History & Scheduled</span>
                        <span className="px-2 py-0.5 text-xs rounded-full font-bold bg-gray-100 text-gray-600">
                            {historyList.length}
                        </span>
                    </button>
                </div>

                {/* Quick Search */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transfers..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm font-medium text-gray-600">Loading staff transfers...</p>
                </div>
            ) : filteredList.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <ArrowRightLeft size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-bold text-gray-700 text-base">No staff transfers found</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {subTab === 'OUTBOUND' && 'No outbound transfer requests currently awaiting your release.'}
                        {subTab === 'INBOUND' && 'No incoming staff transfers currently awaiting your acceptance.'}
                        {subTab === 'HISTORY' && 'No transfer history recorded yet.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredList.map((t) => (
                        <div
                            key={t.id}
                            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                        >
                            {/* Staff & Transition Details */}
                            <div className="space-y-3 flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                        {t.referenceNumber}
                                    </span>
                                    {getStatusBadge(t.status)}
                                    <span className="text-xs text-gray-400 flex items-center">
                                        <Calendar size={13} className="mr-1" />
                                        Effective: <strong className="text-gray-700 ml-1">{new Date(t.effectiveDate).toLocaleDateString()}</strong>
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                                    {/* Staff Profile info */}
                                    <div>
                                        <h4 className="text-base font-extrabold text-gray-900">{t.user?.fullName}</h4>
                                        <p className="text-xs text-gray-500">{t.user?.email} • {t.user?.phone || 'No phone'}</p>
                                    </div>

                                    {/* Journey Visual Pill */}
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block">From</span>
                                            <span className="font-bold text-gray-800">{t.fromBranch?.name}</span>
                                            <span className="text-[11px] text-gray-500 block">({t.previousRole.replace('_', ' ')})</span>
                                        </div>
                                        <ArrowRightLeft size={16} className="text-blue-600 shrink-0 mx-2" />
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-blue-600 block">To (Destination)</span>
                                            <span className="font-bold text-blue-900">{t.toBranch?.name}</span>
                                            <span className="text-[11px] text-blue-700 font-semibold block">({t.newRole.replace('_', ' ')})</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Operational & Checklist Tags */}
                                <div className="flex items-center gap-3 flex-wrap text-xs pt-1 text-gray-600">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                                        Reason: <strong>{t.reason}</strong>
                                    </span>
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-semibold">
                                        Leads: {t.leadStrategy === 'MIGRATE_WITH_STAFF' ? 'Migrate with Staff' : 'Reassign at Source'}
                                    </span>
                                    {t.assetsClearance && (
                                        <span className="text-green-600 flex items-center font-medium">
                                            <CheckCircle size={13} className="mr-1" /> Assets Returned
                                        </span>
                                    )}
                                    {t.filesHandedOver && (
                                        <span className="text-green-600 flex items-center font-medium">
                                            <CheckCircle size={13} className="mr-1" /> Files Handed Over
                                        </span>
                                    )}
                                </div>

                                {t.justification && (
                                    <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 italic">
                                        "{t.justification}"
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons Column */}
                            <div className="flex flex-col gap-2 shrink-0 sm:w-44 lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                                {subTab === 'OUTBOUND' && t.status === 'PENDING_RELEASING_MD' && (
                                    <>
                                        <button
                                            onClick={() => setActionModal({ isOpen: true, type: 'RELEASING_APPROVE', transfer: t, remarks: '', reason: '' })}
                                            className="w-full flex items-center justify-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                                        >
                                            <CheckCircle size={14} className="mr-1.5" /> Approve Release
                                        </button>
                                        <button
                                            onClick={() => setActionModal({ isOpen: true, type: 'RELEASING_REJECT', transfer: t, remarks: '', reason: '' })}
                                            className="w-full flex items-center justify-center px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition"
                                        >
                                            <XCircle size={14} className="mr-1.5" /> Reject Release
                                        </button>
                                    </>
                                )}

                                {subTab === 'INBOUND' && t.status === 'PENDING_RECEIVING_MD' && (
                                    <>
                                        <button
                                            onClick={() => setActionModal({ isOpen: true, type: 'RECEIVING_ACCEPT', transfer: t, remarks: '', reason: '' })}
                                            className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                                        >
                                            <CheckCircle size={14} className="mr-1.5" /> Accept Staff
                                        </button>
                                        <button
                                            onClick={() => setActionModal({ isOpen: true, type: 'RECEIVING_DECLINE', transfer: t, remarks: '', reason: '' })}
                                            className="w-full flex items-center justify-center px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition"
                                        >
                                            <XCircle size={14} className="mr-1.5" /> Decline Intake
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setLetterModal({ isOpen: true, transfer: t })}
                                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition"
                                >
                                    <FileText size={14} className="mr-1.5 text-blue-600" /> Transfer Letter
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ACTION CONFIRMATION MODAL */}
            {actionModal.isOpen && actionModal.transfer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-lg text-gray-800">
                                {actionModal.type === 'RELEASING_APPROVE' && 'Approve Staff Release'}
                                {actionModal.type === 'RELEASING_REJECT' && 'Reject Staff Release'}
                                {actionModal.type === 'RECEIVING_ACCEPT' && 'Accept Staff Intake'}
                                {actionModal.type === 'RECEIVING_DECLINE' && 'Decline Staff Intake'}
                            </h3>
                            <button onClick={() => setActionModal({ ...actionModal, isOpen: false })} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <p className="text-sm text-gray-600">
                            {actionModal.type === 'RELEASING_APPROVE' && `Are you sure you want to approve releasing ${actionModal.transfer.user?.fullName} to ${actionModal.transfer.toBranch?.name}?`}
                            {actionModal.type === 'RELEASING_REJECT' && `Provide a reason for rejecting the transfer of ${actionModal.transfer.user?.fullName}:`}
                            {actionModal.type === 'RECEIVING_ACCEPT' && `Confirm intake of ${actionModal.transfer.user?.fullName} into ${actionModal.transfer.toBranch?.name} as ${actionModal.transfer.newRole}?`}
                            {actionModal.type === 'RECEIVING_DECLINE' && `Provide reason for declining the intake of ${actionModal.transfer.user?.fullName}:`}
                        </p>

                        {(actionModal.type === 'RELEASING_REJECT' || actionModal.type === 'RECEIVING_DECLINE') ? (
                            <textarea
                                value={actionModal.reason}
                                onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
                                placeholder="State reason..."
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                            />
                        ) : (
                            <textarea
                                value={actionModal.remarks}
                                onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
                                placeholder="Executive remarks (optional)..."
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <button
                                onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                                disabled={submittingAction}
                                className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExecuteAction}
                                disabled={submittingAction}
                                className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm flex items-center ${
                                    actionModal.type.includes('REJECT') || actionModal.type.includes('DECLINE')
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {submittingAction ? 'Processing...' : 'Confirm Action'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OFFICIAL TRANSFER LETTER PREVIEW MODAL */}
            <TransferLetterModal
                isOpen={letterModal.isOpen}
                transfer={letterModal.transfer}
                onClose={() => setLetterModal({ isOpen: false, transfer: null })}
            />
        </div>
    );
};
