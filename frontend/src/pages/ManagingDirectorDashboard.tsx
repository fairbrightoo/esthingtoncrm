import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CheckCircle, XCircle, Eye, AlertCircle, AlertTriangle, FileText, X, Tag, List } from 'lucide-react';
import { AnnouncementWidget } from '../components/AnnouncementWidget';
import { MDDiscountManager } from '../components/MDDiscountManager';
import { MDBudgetReview } from '../components/MDBudgetReview';
import { Calculator } from 'lucide-react';
import { RefundQueue } from '../components/RefundQueue';

interface Payment {
    id: string;
    amount: number;
    date: string;
    method: string;
    reference?: string;
    proofOfPaymentUrl?: string;
    status: string;
    sale: {
        plot: { 
            prototype: string;
            estate: { name: string; location: string } 
        };
        lead: { fullName: string; phone: string };
    };
    recordedByUser: { fullName: string; email: string; role: string };
}

export const ManagingDirectorDashboard = () => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [processedPayments, setProcessedPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, paymentId: string, status: 'APPROVED' | 'REJECTED' | null }>({ isOpen: false, paymentId: '', status: null });
    const [receiptModal, setReceiptModal] = useState<{ isOpen: boolean, url: string | null }>({ isOpen: false, url: null });

    const [activeTab, setActiveTab] = useState<'APPROVALS' | 'HISTORY' | 'DISCOUNTS' | 'FUNDS_REQUEST' | 'BUDGETS' | 'REFUNDS'>('APPROVALS');

    const fetchPendingPayments = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPayments(res.data);
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
            setProcessedPayments(res.data);
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

    const handleUpdateStatus = (paymentId: string, status: 'APPROVED' | 'REJECTED') => {
        setConfirmModal({ isOpen: true, paymentId, status });
    };

    const executeStatusUpdate = async () => {
        const { paymentId, status } = confirmModal;
        if (!paymentId || !status) return;

        setConfirmModal({ isOpen: false, paymentId: '', status: null });

        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/${paymentId}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast(`Payment marked as ${status}`, "success");
            fetchPendingPayments(); // Refresh the list
            fetchProcessedPayments(); // Update History
        } catch (error: any) {
            console.error("Failed to update status", error);
            const errMsg = error.response?.data?.error || "Failed to update payment status.";
            addToast(errMsg, "error");
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Managing Director Portal</h1>
                    <p className="text-gray-500">Approve payments and issue promotional discounts.</p>
                </div>
            </div>

            <AnnouncementWidget />

            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('APPROVALS')}
                    className={`pb-3 px-2 font-bold flex items-center transition-colors ${activeTab === 'APPROVALS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <List className="w-4 h-4 mr-2" /> Pending Approvals
                    {payments.length > 0 && (
                        <span className="ml-2 bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full">{payments.length}</span>
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

            {activeTab === 'FUNDS_REQUEST' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Pending Fund Requisitions</h3>
                    </div>
                    {requisitions.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">No pending requisitions.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">Request / Branch</th>
                                    <th className="px-6 py-4">Requested By</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4 text-center">Receipt</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requisitions.map((req: any) => {
                                    const calcTotal = req.items?.reduce((s: number, i: any) => s + (i.qty * i.unitPrice), 0) || req.amountApproved || 0;
                                    return (
                                    <React.Fragment key={req.id}>
                                        <tr className="border-b border-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{req.title}</div>
                                                <div className="text-xs mt-1 px-2 py-0.5 bg-gray-100 rounded inline-block text-gray-600">{req.category}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {req.requestedByUser?.fullName}
                                                <br/><span className="text-xs text-blue-500 font-medium">{req.requestedByUser?.role}</span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-blue-700 text-lg">₦{calcTotal.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                {req.receiptUrl ? (
                                                    <a href={req.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">View</a>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => {
                                                setReqModal({ isOpen: true, reqId: req.id, reqTitle: req.title, action: 'APPROVE', amount: calcTotal });
                                                setReqModalAmount(calcTotal);
                                            }} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition shadow-sm">Approve</button>
                                            <button onClick={() => {
                                                setReqModal({ isOpen: true, reqId: req.id, reqTitle: req.title, action: 'REJECT', amount: null });
                                            }} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition shadow-sm">Reject</button>
                                        </td>
                                    </tr>
                                    {req.items && req.items.length > 0 && (
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={5} className="px-6 py-3">
                                            <div className="pl-4 border-l-2 border-blue-200">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Line Items Breakdown</p>
                                                <table className="w-full text-xs text-left mb-2">
                                                    <thead className="text-gray-400 border-b border-gray-200">
                                                        <tr>
                                                            <th className="pb-1">Item Required</th>
                                                            <th className="pb-1">Qty</th>
                                                            <th className="pb-1">Purpose</th>
                                                            <th className="pb-1 text-right">Unit (₦)</th>
                                                            <th className="pb-1 text-right">Total (₦)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100/50">
                                                        {req.items.map((i: any, idx: number) => (
                                                            <tr key={idx} className="text-gray-600">
                                                                <td className="py-1">{i.itemRequired} {i.itemSpecification && <span className="text-gray-400 italic">({i.itemSpecification})</span>}</td>
                                                                <td className="py-1">{i.qty}</td>
                                                                <td className="py-1">{i.purpose || '-'}</td>
                                                                <td className="py-1 text-right">{i.unitPrice?.toLocaleString()}</td>
                                                                <td className="py-1 font-bold text-gray-800 text-right">{(i.qty * i.unitPrice).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                    )}
                                    </React.Fragment>
                                )})}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'APPROVALS' && (
                <>
                {loading ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">Loading pending payments...</p>
                </div>
            ) : payments.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-10 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">All caught up!</h3>
                    <p className="text-gray-500 mt-2">There are no pending payments requiring your approval.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Client / Product</th>
                                    <th className="px-6 py-4">Amount & Details</th>
                                    <th className="px-6 py-4">Recorded By</th>
                                    <th className="px-6 py-4 text-center">Proof of Payment</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{p.sale.lead?.fullName || 'Unknown Client'}</div>
                                            <div className="text-sm text-gray-500 mt-1">{p.sale.plot?.prototype || 'Unknown Property'}</div>
                                            <div className="text-xs text-gray-400">
                                                {p.sale.plot?.estate?.name || 'Unknown Estate'} ({p.sale.plot?.estate?.location || 'Unknown Location'})
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-blue-700 text-lg">₦{p.amount.toLocaleString()}</div>
                                            <div className="text-sm text-gray-500 mt-1 flex flex-col">
                                                <span>Method: {p.method}</span>
                                                <span className="text-xs text-gray-400 mt-0.5">Date: {new Date(p.date).toLocaleDateString()}</span>
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
                                                                    className="relative group overflow-hidden rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                                                                >
                                                                    <img 
                                                                        src={fullUrl} 
                                                                        alt="Receipt Thumbnail" 
                                                                        className="w-16 h-16 object-cover transition-transform duration-300 group-hover:scale-110"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                        <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                                                    <span className="text-[10px] font-medium text-gray-500 uppercase">Document</span>
                                                                </a>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center text-red-500 text-sm font-medium">
                                                    <AlertCircle size={16} className="mr-1" /> Missing
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleUpdateStatus(p.id, 'APPROVED')}
                                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                Confirm Payment
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(p.id, 'REJECTED')}
                                                className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
                                            >
                                                Not Received
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            </>
            )}

            {activeTab === 'HISTORY' && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="flex border-b border-gray-200 bg-gray-50/50 p-2 space-x-2">
                        <button 
                            onClick={() => setHistoryView('PAYMENTS')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${historyView === 'PAYMENTS' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                        >
                            Client Payments
                        </button>
                        <button 
                            onClick={() => setHistoryView('REQUISITIONS')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${historyView === 'REQUISITIONS' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                        >
                            Fund Requests (Requisitions)
                        </button>
                    </div>

                    {historyView === 'PAYMENTS' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Client / Product</th>
                                        <th className="px-6 py-4">Amount & Details</th>
                                        <th className="px-6 py-4">Recorded By</th>
                                        <th className="px-6 py-4 text-center">Proof of Payment</th>
                                        <th className="px-6 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {processedPayments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                                No payment history found.
                                            </td>
                                        </tr>
                                    ) : (
                                    processedPayments.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{p.sale.lead?.fullName || 'Unknown Client'}</div>
                                                <div className="text-sm text-gray-500 mt-1">{p.sale.plot?.prototype || 'Unknown Property'}</div>
                                                <div className="text-xs text-gray-400">
                                                    {p.sale.plot?.estate?.name || 'Unknown Estate'} ({p.sale.plot?.estate?.location || 'Unknown Location'})
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800 text-lg">₦{p.amount.toLocaleString()}</div>
                                                <div className="text-sm text-gray-500 mt-1 flex flex-col">
                                                    <span>Method: {p.method}</span>
                                                    <span className="text-xs text-gray-400 mt-0.5">Date: {new Date(p.date).toLocaleDateString()}</span>
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
                                                                        className="relative group overflow-hidden rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                                                                    >
                                                                        <img 
                                                                            src={fullUrl} 
                                                                            alt="Receipt Thumbnail" 
                                                                            className="w-12 h-12 object-cover transition-transform duration-300 group-hover:scale-110"
                                                                        />
                                                                    </button>
                                                                ) : (
                                                                    <a
                                                                        key={idx}
                                                                        href={fullUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex flex-col items-center justify-center w-12 h-12 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group flex-shrink-0"
                                                                    >
                                                                        <FileText size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors mb-1" />
                                                                    </a>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">Not required/available</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                                    p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {p.status === 'APPROVED' ? <CheckCircle size={14} className="mr-1" /> : <XCircle size={14} className="mr-1" />}
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Request / Category</th>
                                        <th className="px-6 py-4">Requested By</th>
                                        <th className="px-6 py-4">Requested vs Approved</th>
                                        <th className="px-6 py-4 text-center">Receipt</th>
                                        <th className="px-6 py-4 text-right">MD Decision</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {processedRequisitions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                                No requisition history found.
                                            </td>
                                        </tr>
                                    ) : (
                                        processedRequisitions.map((req) => {
                                            const originalTotal = req.items?.reduce((s: number, i: any) => s + (i.qty * i.unitPrice), 0) || 0;
                                            return (
                                                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900">{req.title}</div>
                                                        <div className="text-xs mt-1 px-2 py-0.5 bg-gray-100 rounded inline-block text-gray-600 font-medium">{req.category}</div>
                                                        <div className="text-[10px] text-gray-400 mt-1 uppercase">{new Date(req.updatedAt).toLocaleString()}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-800">{req.requestedByUser?.fullName || 'Unknown'}</div>
                                                        <div className="text-[10px] font-bold text-blue-500 bg-blue-50/50 uppercase mt-1 px-1.5 py-0.5 inline-block rounded">{req.requestedByUser?.role?.replace('_', ' ')}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Approved Amount</div>
                                                        <div className="font-bold text-gray-900 text-lg">₦{req.amountApproved?.toLocaleString() || originalTotal.toLocaleString()}</div>
                                                        {req.amountApproved !== originalTotal && req.amountApproved !== null && (
                                                            <div className="text-xs text-gray-500 line-through mt-0.5 text-red-400">Req: ₦{originalTotal.toLocaleString()}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {req.receiptUrl ? (
                                                            <a href={req.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex flex-col items-center justify-center bg-blue-50 w-12 h-12 rounded-lg mx-auto transition-colors hover:bg-blue-100">
                                                                <FileText size={20} className="mb-0.5" />
                                                            </a>
                                                        ) : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide ${
                                                            ['APPROVED_BY_MD', 'DISBURSED'].includes(req.status) ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                                                        }`}>
                                                            {['APPROVED_BY_MD', 'DISBURSED'].includes(req.status) ? <CheckCircle size={14} className="mr-1.5" /> : <XCircle size={14} className="mr-1.5" />}
                                                            {req.status === 'DISBURSED' ? 'FUNDED & DISBURSED' : req.status === 'APPROVED_BY_MD' ? 'APPROVED' : 'REJECTED'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
                        <div className={`p-6 border-b ${confirmModal.status === 'APPROVED' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                            <div className="flex items-center space-x-3">
                                <div className={`p-3 rounded-full ${confirmModal.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Confirm Action
                                    </h3>
                                    <p className={`text-sm font-medium mt-0.5 ${confirmModal.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>
                                        {confirmModal.status === 'APPROVED' ? 'Approve Payment' : 'Reject Payment'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 text-[15px] leading-relaxed">
                                Are you sure you want to mark this payment as <strong className={confirmModal.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}>{confirmModal.status}</strong>? 
                                {confirmModal.status === 'APPROVED' ? ' This will instantly update the client\'s balance and generate an official receipt.' : ' The marketer will be alerted that the payment was not received.'}
                            </p>
                            <div className="mt-8 flex justify-end space-x-3">
                                <button
                                    onClick={() => setConfirmModal({ isOpen: false, paymentId: '', status: null })}
                                    className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeStatusUpdate}
                                    className={`px-5 py-2.5 text-white font-medium rounded-xl transition-colors shadow-sm focus:ring-4 focus:outline-none ${confirmModal.status === 'APPROVED' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-100' : 'bg-red-600 hover:bg-red-700 focus:ring-red-100'}`}
                                >
                                    Yes, {confirmModal.status === 'APPROVED' ? 'Approve It' : 'Reject It'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receiptModal.isOpen && receiptModal.url && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-end mb-4">
                            <button 
                                onClick={() => setReceiptModal({ isOpen: false, url: null })}
                                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors focus:outline-none"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl p-2 border border-white/10 flex-1 min-h-0">
                            <img 
                                src={receiptModal.url.startsWith('http') ? receiptModal.url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${receiptModal.url}`} 
                                alt="Full Receipt" 
                                className="max-w-full max-h-[80vh] object-contain rounded-xl"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Requisition Prompt / Modal UI */}
            {reqModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full outline-none transform transition-all scale-100 overflow-hidden">
                        <div className={`px-6 py-5 border-b flex justify-between items-center ${reqModal.action === 'APPROVE' ? 'bg-green-50' : 'bg-red-50'}`}>
                            <h3 className={`font-bold ${reqModal.action === 'APPROVE' ? 'text-green-800' : 'text-red-800'}`}>
                                {reqModal.action === 'APPROVE' ? 'Approve Requisition' : 'Reject Requisition'}
                            </h3>
                            <button onClick={() => setReqModal({ ...reqModal, isOpen: false })} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4 text-sm text-gray-600">
                                {reqModal.action === 'APPROVE' ? (
                                    <>
                                        <p className="mb-3">You are approving <strong>{reqModal.reqTitle}</strong>.</p>
                                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Authorized Amount (₦)</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none">₦</span>
                                            <input 
                                                type="number" 
                                                value={reqModalAmount} 
                                                onChange={(e) => setReqModalAmount(Number(e.target.value))}
                                                className="w-full border border-gray-300 rounded-xl pl-8 pr-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow text-lg font-bold text-gray-900"
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-gray-400 flex items-center"><AlertCircle size={12} className="mr-1"/> Adjust if overriding requested amount.</p>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-3">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <p>Are you sure you want to permanently <strong>reject</strong> the requisition for <strong>{reqModal.reqTitle}</strong>?</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => setReqModal({ ...reqModal, isOpen: false })} disabled={isSubmittingReq} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition">Cancel</button>
                                <button onClick={handleReqAction} disabled={isSubmittingReq} className={`px-5 py-2 text-white rounded-xl font-bold transition flex items-center ${reqModal.action === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {isSubmittingReq ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : reqModal.action === 'APPROVE' ? 'Confirm Approval' : 'Yes, Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
