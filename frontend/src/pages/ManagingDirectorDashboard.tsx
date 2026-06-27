import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CheckCircle, XCircle, Eye, AlertCircle, AlertTriangle, FileText, X, Tag, List, MessageCircle } from 'lucide-react';
import { AnnouncementWidget } from '../components/AnnouncementWidget';
import { Pagination, getPaginatedData } from '../components/Pagination';
import { MDDiscountManager } from '../components/MDDiscountManager';
import { MDBudgetReview } from '../components/MDBudgetReview';
import { Calculator } from 'lucide-react';
import { RefundQueue } from '../components/RefundQueue';
import { getPaymentTypeLabel } from './AccountantDashboard';

interface Payment {
    id: string;
    amount: number;
    date: string;
    method: string;
    accountPaidTo?: string;
    reference?: string;
    proofOfPaymentUrl?: string;
    status: string;
    receivingBranchId?: string;
    bankBranchConfirmation?: string;
    bankBranchConfirmationNote?: string;
    virtualLoanAmount?: number;
    sale: {
        agreedPrice: number;
        totalPaid: number;
        marketer?: { companyId: string, branchId: string, fullName: string };
        plot: { 
            prototype: string;
            estate: { name: string; location: string } 
        };
        lead: { fullName: string; phone: string };
    };
    recordedByUser: { fullName: string; email: string; role: string };
    notes?: string;
    rejectionReason?: string;
}

interface PendingData {
    directSales: Payment[];
    outboundCrossSales: Payment[];
    inboundCrossSales: Payment[];
    bankConfirmations: Payment[];
}

export const ManagingDirectorDashboard = () => {
    const { token } = useAuth();
    const { addToast } = useToast();
    
    const [pendingData, setPendingData] = useState<PendingData>({ directSales: [], outboundCrossSales: [], inboundCrossSales: [], bankConfirmations: [] });
    const [processedData, setProcessedData] = useState<PendingData>({ directSales: [], outboundCrossSales: [], inboundCrossSales: [], bankConfirmations: [] });
    
    const [loading, setLoading] = useState(true);

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, paymentId: string, status: 'APPROVED' | 'REJECTED' | null, rejectionReason?: string, isBankConfirm?: boolean }>({ isOpen: false, paymentId: '', status: null, rejectionReason: '', isBankConfirm: false });
    const [receiptModal, setReceiptModal] = useState<{ isOpen: boolean, url: string | null }>({ isOpen: false, url: null });
    const [messageModal, setMessageModal] = useState<{ isOpen: boolean, paymentId: string }>({ isOpen: false, paymentId: '' });
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');

    const [activeTab, setActiveTab] = useState<'APPROVALS' | 'HISTORY' | 'DISCOUNTS' | 'FUNDS_REQUEST' | 'BUDGETS' | 'REFUNDS'>('APPROVALS');
    const [approvalSubTab, setApprovalSubTab] = useState<'DIRECT' | 'INBOUND' | 'OUTBOUND' | 'BANK'>('DIRECT');
    const [historySubTab, setHistorySubTab] = useState<'DIRECT' | 'INBOUND' | 'OUTBOUND' | 'BANK'>('DIRECT');

    // Pagination States
    const [reqPage, setReqPage] = useState(1);
    const [reqRows, setReqRows] = useState(10);
    const [payPage, setPayPage] = useState(1);
    const [payRows, setPayRows] = useState(10);
    const [procPayPage, setProcPayPage] = useState(1);
    const [procPayRows, setProcPayRows] = useState(10);

    const fetchPendingPayments = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingData(res.data);
        } catch (error) {
            console.error("Failed to fetch pending payments", error);
            addToast("Failed to load pending payments.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchProcessedPayments = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/processed`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProcessedData(res.data);
        } catch (error) {
            console.error("Failed to fetch history", error);
        }
    };

    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [processedRequisitions, setProcessedRequisitions] = useState<any[]>([]);
    const [historyView, setHistoryView] = useState<'PAYMENTS' | 'REQUISITIONS'>('PAYMENTS');
    
    // Custom UI state for requisition actions
    const [reqModal, setReqModal] = useState<{ isOpen: boolean, reqId: string, reqTitle: string, action: 'APPROVE' | 'REJECT', amount: number | null }>({ isOpen: false, reqId: '', reqTitle: '', action: 'APPROVE', amount: null });
    const [reqModalAmount, setReqModalAmount] = useState<number>(0);
    const [isSubmittingReq, setIsSubmittingReq] = useState(false);
    
    const handleReqAction = async () => {
        setIsSubmittingReq(true);
        try {
            if (reqModal.action === 'APPROVE') {
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/md-approve/${reqModal.reqId}`, { status: 'APPROVED_BY_MD', amountApproved: reqModalAmount }, { headers: { Authorization: `Bearer ${token}` }});
                addToast("Requisition successfully approved.", "success");
            } else {
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/md-approve/${reqModal.reqId}`, { status: 'REJECTED' }, { headers: { Authorization: `Bearer ${token}` }});
                addToast("Requisition has been rejected.", "error");
            }
            fetchRequisitions();
        } catch(e) {
            addToast("Failed to process requisition.", "error");
        } finally {
            setIsSubmittingReq(false);
            setReqModal({ ...reqModal, isOpen: false });
        }
    };

    const fetchRequisitions = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequisitions(res.data.filter((r: any) => r.status === 'PENDING_MD_APPROVAL'));
            setProcessedRequisitions(res.data.filter((r: any) => ['APPROVED_BY_MD', 'REJECTED', 'DISBURSED'].includes(r.status)));
        } catch (error) {
            console.error("Failed to fetch fund requests", error);
        }
    };

    useEffect(() => {
        fetchPendingPayments();
        fetchProcessedPayments();
        fetchRequisitions();
    }, []);

    const handleUpdateStatus = (paymentId: string, status: 'APPROVED' | 'REJECTED', isBankConfirm: boolean = false) => {
        setConfirmModal({ isOpen: true, paymentId, status, rejectionReason: '', isBankConfirm });
    };

    const executeStatusUpdate = async () => {
        const { paymentId, status, rejectionReason, isBankConfirm } = confirmModal;
        if (!paymentId || !status) return;

        setConfirmModal({ isOpen: false, paymentId: '', status: null, rejectionReason: '', isBankConfirm: false });

        try {
            if (isBankConfirm) {
                // Determine the bank confirmation status to set. If REJECTED, it means NOT_RECEIVED
                const payloadStatus = status === 'APPROVED' ? 'RECEIVED' : 'NOT_RECEIVED';
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/${paymentId}/bank-confirm`, {
                    status: payloadStatus,
                    note: payloadStatus === 'NOT_RECEIVED' ? rejectionReason : undefined
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                addToast(`Bank confirmation updated to ${payloadStatus.replace('_', ' ')}`, "success");
            } else {
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/${paymentId}/status`, { 
                    status, 
                    rejectionReason: status === 'REJECTED' ? rejectionReason : undefined 
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                addToast(`Payment marked as ${status}`, "success");
            }
            fetchPendingPayments();
            fetchProcessedPayments();
        } catch (error: any) {
            console.error("Failed to update status", error);
            const errMsg = error.response?.data?.error || "Failed to update payment status.";
            addToast(errMsg, "error");
        }
    };

    const loadMessages = async (paymentId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/${paymentId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
        } catch (e) {
            console.error("Failed to load messages", e);
        }
    };

    const openMessages = (paymentId: string) => {
        setMessageModal({ isOpen: true, paymentId });
        loadMessages(paymentId);
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/${messageModal.paymentId}/messages`, {
                content: newMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewMessage('');
            loadMessages(messageModal.paymentId);
        } catch (e) {
            console.error("Failed to send message", e);
            addToast("Failed to send message", "error");
        }
    };

    const getTotalPending = () => {
        return pendingData.directSales.length + pendingData.inboundCrossSales.length + pendingData.outboundCrossSales.length + pendingData.bankConfirmations.length;
    };

    const renderPaymentTable = (paymentsList: Payment[], isBankConfirmTab: boolean = false, isHistory: boolean = false) => {
        if (paymentsList.length === 0) {
            return (
                <div className="p-10 text-center text-gray-500">
                    <CheckCircle size={32} className="mx-auto text-gray-300 mb-2" />
                    No payments found in this category.
                </div>
            );
        }

        const page = isHistory ? procPayPage : payPage;
        const setPage = isHistory ? setProcPayPage : setPayPage;
        const rows = isHistory ? procPayRows : payRows;
        const setRows = isHistory ? setProcPayRows : setPayRows;

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Client / Product</th>
                            <th className="px-6 py-4">Amount & Details</th>
                            <th className="px-6 py-4">Recorded By</th>
                            <th className="px-6 py-4 text-center">Proof of Payment</th>
                            <th className="px-6 py-4 text-right">{isHistory ? 'Status' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {getPaginatedData(paymentsList, page, rows).map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{p.sale.lead?.fullName || 'Unknown Client'}</div>
                                    <div className="text-sm text-gray-500 mt-1">{p.sale.plot?.prototype || 'Unknown Property'}</div>
                                    <div className="text-xs text-gray-400">
                                        {p.sale.plot?.estate?.name || 'Unknown Estate'} ({p.sale.plot?.estate?.location || 'Unknown Location'})
                                    </div>
                                    { ((activeTab === 'APPROVALS' && approvalSubTab !== 'DIRECT') || (activeTab === 'HISTORY' && historySubTab !== 'DIRECT')) && (
                                        <button onClick={() => openMessages(p.id)} className="mt-2 flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 transition">
                                            <MessageCircle size={14} className="mr-1"/> Discuss with MD
                                        </button>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-blue-700 text-lg flex items-center gap-2">
                                        ₦{p.amount.toLocaleString()}
                                        {p.virtualLoanAmount ? p.virtualLoanAmount > 0 && (
                                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-sm uppercase border border-orange-200">
                                                + ₦{p.virtualLoanAmount.toLocaleString()} VL
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1 flex flex-col space-y-1">
                                        <div className="flex gap-2 items-center flex-wrap">
                                            <span className="text-xs font-semibold text-gray-700">Plot Price: ₦{(p.sale.agreedPrice || 0).toLocaleString()}</span>
                                            {(() => {
                                                const balance = (p.sale.agreedPrice || 0) - (p.sale.totalPaid || 0);
                                                return balance > 0 ? (
                                                    <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-bold">
                                                        Bal: ₦{balance.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100 font-bold">
                                                        Fully Paid
                                                    </span>
                                                );
                                            })()}
                                            {(() => {
                                                const label = getPaymentTypeLabel(p as any);
                                                return (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${label.bg} ${label.textCol} ${label.border}`}>
                                                        {label.text}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <span>Method: {p.method}</span>
                                        {p.accountPaidTo && <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded w-max border border-blue-100">{p.accountPaidTo}</span>}
                                        <span className="text-xs text-gray-400">Date: {new Date(p.date).toLocaleDateString()}</span>
                                        {p.bankBranchConfirmation && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase w-max ${
                                                p.bankBranchConfirmation === 'RECEIVED' ? 'bg-green-100 text-green-700' : 
                                                p.bankBranchConfirmation === 'NOT_RECEIVED' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                Bank: {p.bankBranchConfirmation.replace('_', ' ')}
                                            </span>
                                        )}
                                        {p.notes && (
                                            <div className="mt-2 bg-yellow-50 border border-yellow-100 p-2 rounded-lg text-sm text-yellow-800">
                                                <span className="font-bold text-xs uppercase tracking-wider block mb-0.5 text-yellow-600">Marketer's Note:</span>
                                                {p.notes}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-800">{p.recordedByUser.fullName}</div>
                                    <div className="text-xs font-bold text-gray-500 uppercase mt-1 px-1.5 py-0.5 bg-gray-100 w-max">{p.recordedByUser.role.replace('_', ' ')}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {p.proofOfPaymentUrl ? (
                                        <div className="flex justify-center gap-3 flex-wrap">
                                            {(() => {
                                                let proofs: string[] = [];
                                                try {
                                                    proofs = JSON.parse(p.proofOfPaymentUrl);
                                                    if (!Array.isArray(proofs)) proofs = [p.proofOfPaymentUrl];
                                                } catch (e) {
                                                    proofs = [p.proofOfPaymentUrl];
                                                }

                                                return proofs.map((url, idx) => {
                                                    const isImage = url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/);
                                                    const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;
                                                    return isImage ? (
                                                        <button 
                                                            key={idx}
                                                            onClick={() => setReceiptModal({ isOpen: true, url: fullUrl })}
                                                            className="relative group overflow-hidden rounded-lg border border-gray-200 focus:outline-none flex-shrink-0"
                                                        >
                                                            <img 
                                                                src={fullUrl} 
                                                                alt="Receipt Thumbnail" 
                                                                className="w-16 h-16 object-cover"
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                <Eye size={20} className="text-white opacity-0 group-hover:opacity-100" />
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <a
                                                            key={idx}
                                                            href={fullUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex flex-col items-center justify-center w-16 h-16 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group flex-shrink-0"
                                                        >
                                                            <FileText size={24} className="text-gray-400 group-hover:text-blue-500 transition-colors mb-1" />
                                                        </a>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    ) : (
                                        <span className="text-red-500 text-sm font-medium">Missing</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {isHistory ? (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                            p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {p.status === 'APPROVED' ? <CheckCircle size={14} className="mr-1" /> : <XCircle size={14} className="mr-1" />}
                                            {p.status}
                                        </span>
                                    ) : (
                                        <div className="flex flex-col gap-2 w-36 ml-auto">
                                            {activeTab === 'APPROVALS' && approvalSubTab === 'INBOUND' ? (
                                                <div className="text-center text-gray-500 font-medium text-xs">
                                                    <div className="bg-gray-100 px-3 py-1.5 rounded w-full mb-1">Pending Selling MD</div>
                                                    <div className="bg-gray-100 px-3 py-1.5 rounded w-full">Approval</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(p.id, 'APPROVED', isBankConfirmTab)}
                                                        className="w-full flex justify-center items-center px-3 py-2 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700 transition-colors"
                                                    >
                                                        <CheckCircle size={14} className="mr-1.5" /> {isBankConfirmTab ? 'Mark Received' : 'Approve Sale'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(p.id, 'REJECTED', isBankConfirmTab)}
                                                        className="w-full flex justify-center items-center px-3 py-2 bg-white text-red-600 text-xs font-bold rounded shadow-sm border border-red-200 hover:bg-red-50 transition-colors"
                                                    >
                                                        <XCircle size={14} className="mr-1.5" /> {isBankConfirmTab ? 'Not Received' : 'Reject Sale'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Pagination dataLength={paymentsList.length} currentPage={page} rowsPerPage={rows} setPage={setPage} setRowsPerPage={setRows} />
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {user?.role === 'GROUP_MANAGING_DIRECTOR' ? 'Global Approvals Portal' : 'Managing Director Portal'}
                    </h1>
                    <p className="text-gray-500">Approve payments and issue promotional discounts.</p>
                </div>
            </div>

            {user?.role !== 'GROUP_MANAGING_DIRECTOR' && <AnnouncementWidget />}

            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('APPROVALS')}
                    className={`pb-3 px-2 font-bold flex items-center transition-colors ${activeTab === 'APPROVALS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <List className="w-4 h-4 mr-2" /> Pending Approvals
                    {getTotalPending() > 0 && (
                        <span className="ml-2 bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full">{getTotalPending()}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('FUNDS_REQUEST')}
                    className={`pb-3 px-2 font-bold flex items-center transition-colors ${activeTab === 'FUNDS_REQUEST' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <List className="w-4 h-4 mr-2" /> Fund Requests
                    {requisitions.length > 0 && (
                        <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs py-0.5 px-2 rounded-full">{requisitions.length}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('DISCOUNTS')}
                    className={`pb-3 px-2 font-bold flex items-center transition-colors ${activeTab === 'DISCOUNTS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <Tag className="w-4 h-4 mr-2" /> Discount Engine
                </button>
                <button
                    onClick={() => setActiveTab('BUDGETS')}
                    className={`pb-3 px-2 font-bold flex items-center transition-colors ${activeTab === 'BUDGETS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <Calculator className="w-4 h-4 mr-2" /> Review Budgets
                </button>
                <button
                    onClick={() => setActiveTab('REFUNDS')}
                    className={`pb-3 px-2 font-bold flex items-center transition-colors ${activeTab === 'REFUNDS' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <AlertTriangle className="w-4 h-4 mr-2" /> Refunds
                </button>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={`pb-3 px-2 font-bold flex items-center transition-colors ${activeTab === 'HISTORY' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <FileText className="w-4 h-4 mr-2" /> History
                </button>
            </div>

            {activeTab === 'REFUNDS' && <RefundQueue roleContext="MANAGING_DIRECTOR" />}
            {activeTab === 'BUDGETS' && <MDBudgetReview />}
            {activeTab === 'DISCOUNTS' && <MDDiscountManager />}

            {activeTab === 'APPROVALS' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden p-6">
                    <div className="flex border-b border-gray-200 mb-4 space-x-6">
                        <button onClick={() => { setApprovalSubTab('DIRECT'); setPayPage(1); }} className={`pb-2 text-sm font-bold border-b-2 ${approvalSubTab === 'DIRECT' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                            Direct Sales ({pendingData.directSales.length})
                        </button>
                        <button onClick={() => { setApprovalSubTab('INBOUND'); setPayPage(1); }} className={`pb-2 text-sm font-bold border-b-2 ${approvalSubTab === 'INBOUND' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                            Inbound Cross-Sales ({pendingData.inboundCrossSales.length})
                        </button>
                        <button onClick={() => { setApprovalSubTab('OUTBOUND'); setPayPage(1); }} className={`pb-2 text-sm font-bold border-b-2 ${approvalSubTab === 'OUTBOUND' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                            Outbound Cross-Sales ({pendingData.outboundCrossSales.length})
                        </button>
                        <button onClick={() => { setApprovalSubTab('BANK'); setPayPage(1); }} className={`pb-2 text-sm font-bold border-b-2 ${approvalSubTab === 'BANK' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                            Bank Confirmations ({pendingData.bankConfirmations.length})
                        </button>
                    </div>

                    {loading ? <div className="text-center py-10 text-gray-500">Loading...</div> : 
                        approvalSubTab === 'DIRECT' ? renderPaymentTable(pendingData.directSales) :
                        approvalSubTab === 'INBOUND' ? renderPaymentTable(pendingData.inboundCrossSales) :
                        approvalSubTab === 'OUTBOUND' ? renderPaymentTable(pendingData.outboundCrossSales) :
                        renderPaymentTable(pendingData.bankConfirmations, true)
                    }
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="flex border-b border-gray-200 bg-gray-50/50 p-2 space-x-2">
                        <button onClick={() => setHistoryView('PAYMENTS')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${historyView === 'PAYMENTS' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                            Client Payments
                        </button>
                        <button onClick={() => setHistoryView('REQUISITIONS')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${historyView === 'REQUISITIONS' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                            Fund Requests (Requisitions)
                        </button>
                    </div>

                    {historyView === 'PAYMENTS' ? (
                        <div className="p-6">
                            <div className="flex border-b border-gray-200 mb-4 space-x-6">
                                <button onClick={() => { setHistorySubTab('DIRECT'); setProcPayPage(1); }} className={`pb-2 text-sm font-bold border-b-2 ${historySubTab === 'DIRECT' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                                    Direct Sales
                                </button>
                                <button onClick={() => { setHistorySubTab('INBOUND'); setProcPayPage(1); }} className={`pb-2 text-sm font-bold border-b-2 ${historySubTab === 'INBOUND' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                                    Inbound Cross-Sales
                                </button>
                                <button onClick={() => { setHistorySubTab('OUTBOUND'); setProcPayPage(1); }} className={`pb-2 text-sm font-bold border-b-2 ${historySubTab === 'OUTBOUND' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                                    Outbound Cross-Sales
                                </button>
                                <button onClick={() => { setHistorySubTab('BANK'); setProcPayPage(1); }} className={`pb-2 text-sm font-bold border-b-2 ${historySubTab === 'BANK' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
                                    Bank Confirmations
                                </button>
                            </div>
                            {
                                historySubTab === 'DIRECT' ? renderPaymentTable(processedData.directSales, false, true) :
                                historySubTab === 'INBOUND' ? renderPaymentTable(processedData.inboundCrossSales, false, true) :
                                historySubTab === 'OUTBOUND' ? renderPaymentTable(processedData.outboundCrossSales, false, true) :
                                renderPaymentTable(processedData.bankConfirmations, true, true)
                            }
                        </div>
                    ) : (
                        // Requisitions history table... Keep it simple, just render the processed requisitions
                        <div className="p-6">
                           <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Request / Category</th>
                                        <th className="px-6 py-4">Requested By</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedRequisitions.map((req) => (
                                        <tr key={req.id} className="border-b">
                                            <td className="px-6 py-4">{req.title}</td>
                                            <td className="px-6 py-4">{req.requestedByUser?.fullName}</td>
                                            <td className="px-6 py-4">₦{req.amountApproved?.toLocaleString() || 0}</td>
                                            <td className="px-6 py-4 text-right">{req.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modals... */}
            {/* Confirm Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">{confirmModal.status === 'APPROVED' ? (confirmModal.isBankConfirm ? 'Confirm Receipt' : 'Approve Sale') : (confirmModal.isBankConfirm ? 'Not Received' : 'Reject Sale')}</h3>
                        <p className="mb-4">Are you sure?</p>
                        {confirmModal.status === 'REJECTED' && (
                            <textarea 
                                value={confirmModal.rejectionReason} 
                                onChange={(e) => setConfirmModal({ ...confirmModal, rejectionReason: e.target.value })} 
                                className="w-full border p-2 rounded mb-4" placeholder="Reason..." 
                            />
                        )}
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="px-4 py-2 border rounded">Cancel</button>
                            <button onClick={executeStatusUpdate} className="px-4 py-2 bg-blue-600 text-white rounded">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receiptModal.isOpen && receiptModal.url && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setReceiptModal({ isOpen: false, url: null })} className="text-white hover:text-gray-300">
                                <X size={24} />
                            </button>
                        </div>
                        <img src={receiptModal.url} alt="Receipt" className="max-h-[80vh] object-contain rounded-xl" />
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {messageModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold">Payment Messages</h3>
                            <button onClick={() => setMessageModal({ isOpen: false, paymentId: '' })}><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg: any) => (
                                <div key={msg.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm">{msg.sender?.fullName} <span className="text-xs text-gray-400 font-normal">({msg.sender?.role})</span></span>
                                        <span className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{msg.content}</p>
                                </div>
                            ))}
                            {messages.length === 0 && <p className="text-center text-gray-400 mt-10">No messages yet.</p>}
                        </div>
                        <div className="p-4 border-t bg-white flex gap-2">
                            <input 
                                type="text" 
                                value={newMessage} 
                                onChange={(e) => setNewMessage(e.target.value)} 
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                placeholder="Type a message..."
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Send</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
