import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BudgetManager } from '../components/BudgetManager';
import { DollarSign, Wallet, AlertTriangle, ArrowRightLeft , Eye, FileText, AlertCircle, Clock, CreditCard } from 'lucide-react';
import { RefundQueue } from '../components/RefundQueue';


export const getPaymentTypeLabel = (payment: any) => {
    if (!payment.sale || !payment.sale.plot) return { text: 'N/A', bg: 'bg-gray-100', textCol: 'text-gray-600', border: 'border-gray-200' };
    const price = payment.sale.agreedPrice || 0;
    const isOutright = payment.amount >= price;
    if (isOutright) return { text: 'New Sale (Outright)', bg: 'bg-green-100', textCol: 'text-green-700', border: 'border-green-300' };
    
    // Check if it's the first payment for this sale
    // We would ideally need to check if there are prior payments, but assuming for now:
    // If amount is small, and there's a virtual loan or it's just continuous
    if (payment.amount < price) return { text: 'New Sale (Installment)', bg: 'bg-purple-100', textCol: 'text-purple-700', border: 'border-purple-300' };
    
    return { text: 'Continuous Payment', bg: 'bg-blue-100', textCol: 'text-blue-700', border: 'border-blue-300' };
};

export const AccountantDashboard = () => {

    const [activeTab, setActiveTab] = useState<'DISBURSEMENTS' | 'BUDGETS' | 'REFUNDS' | 'PAYMENTS_COMMISSIONS' | 'HISTORY'>('DISBURSEMENTS');
    const [disbursements, setDisbursements] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, type: 'fund'|'commission', id: string, title: string, message: string}>({isOpen: false, type: 'fund', id: '', title: '', message: ''});
    
    // History State
    const [historyStartDate, setHistoryStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [historyEndDate, setHistoryEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [historyData, setHistoryData] = useState<{payments: any[], commissions: any[], requisitions: any[]}>({payments: [], commissions: [], requisitions: []});
    const [historyLoading, setHistoryLoading] = useState(false);

    const token = localStorage.getItem('token');



    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const [reqRes, commRes, payRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions?startDate=${historyStartDate}&endDate=${historyEndDate}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/pending-commissions?isPaid=true&startDate=${historyStartDate}&endDate=${historyEndDate}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/processed?startDate=${historyStartDate}&endDate=${historyEndDate}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            setHistoryData({
                payments: payRes.data,
                commissions: commRes.data,
                requisitions: reqRes.data.filter((r: any) => r.status === 'DISBURSED')
            });
        } catch (error) {
            console.error("Failed to fetch history.", error);
        } finally {
            setHistoryLoading(false);
        }
    };
    
    useEffect(() => {
        if (activeTab === 'HISTORY') {
            fetchHistory();
        }
    }, [activeTab, historyStartDate, historyEndDate]);
    
    const fetchData = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const [reqRes, commRes, pendRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/pending-commissions`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/pending`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            // Filter for only ones needing accountant action (Approved by MD)
            const approvedReqs = reqRes.data.filter((r: any) => r.status === 'APPROVED_BY_MD' || r.status === 'DISBURSED');
            setDisbursements(approvedReqs);
            setCommissions(commRes.data);
            setPendingPayments(pendRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data.", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const intv = setInterval(() => fetchData(true), 15000); // Poll every 15s in background
        return () => clearInterval(intv);
    }, []);

    const openDisburseFundModal = (reqId: string) => {
        setConfirmModal({ isOpen: true, type: 'fund', id: reqId, title: 'Disburse Funds', message: 'Have you transferred the funds and are ready to close this requisition?' });
    };

    const handleDisburseFund = async (reqId: string) => {
        try {
            setActionLoading(true);
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/accountant-disburse/${reqId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            await fetchData();
        } catch (error) {
            alert('Failed to disburse funds.');
        } finally {
            setActionLoading(false);
        }
    };

    const openDisburseCommissionModal = (paymentId: string) => {
        setConfirmModal({ isOpen: true, type: 'commission', id: paymentId, title: 'Confirm Commission Payout', message: 'Mark this commission as successfully disbursed to the marketer?' });
    };

    const handleDisburseCommission = async (paymentId: string) => {
        try {
            setActionLoading(true);
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/pay-commission/${paymentId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            await fetchData();
        } catch (error) {
            alert('Failed to disburse commission.');
        } finally {
            setActionLoading(false);
        }
    };

    const executeConfirmation = async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (confirmModal.type === 'fund') {
            await handleDisburseFund(confirmModal.id);
        } else {
            await handleDisburseCommission(confirmModal.id);
        }
    };

    const { user } = useAuth();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Accountant Disbursement Center</h1>
                <p className="text-gray-500">Manage approved requisitions and commission payouts.</p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1 w-fit mt-4 mb-8">
                <button
                    onClick={() => setActiveTab('DISBURSEMENTS')}
                    className={`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 ${activeTab === 'DISBURSEMENTS' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <Wallet size={16} /> Disbursement Center
                </button>
                <button
                    onClick={() => setActiveTab('BUDGETS')}
                    className={`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 ${activeTab === 'BUDGETS' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <DollarSign size={16} /> Branch Budgets
                </button>
                <button
                    onClick={() => setActiveTab('REFUNDS')}
                    className={`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 ${activeTab === 'REFUNDS' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <ArrowRightLeft size={16} /> Client Refunds
                </button>
                <button
                    onClick={() => setActiveTab('PAYMENTS_COMMISSIONS')}
                    className={`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 ${activeTab === 'PAYMENTS_COMMISSIONS' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <CreditCard size={16} /> Payments & Commissions
                </button>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <Clock size={16} /> History
                </button>
            </div>
            
            <main className="space-y-8">
                    <>
                        {activeTab === 'REFUNDS' && <RefundQueue roleContext="ACCOUNTANT" />}
                        {activeTab === 'BUDGETS' && <BudgetManager />}
                        
                        {activeTab === 'DISBURSEMENTS' && (
                            <>
                                {loading ? (
                                    <div className="flex justify-center p-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Section 1: Standard Requisitions (Imprest, Payroll, etc.) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Pending MD-Approved Disbursements
                                    </h3>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                            <tr>
                                                <th className="px-6 py-4">Title</th>
                                                <th className="px-6 py-4">Category</th>
                                                <th className="px-6 py-4">Amount Approved</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {disbursements.filter(req => req.status !== 'DISBURSED').length === 0 ? (
                                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No pending disbursements.</td></tr>
                                            ) : disbursements.filter(req => req.status !== 'DISBURSED').map(req => {
                                                const calcTotal = req.items?.reduce((s: number, i: any) => s + (i.qty * i.unitPrice), 0) || req.amountApproved || 0;
                                                return (
                                                <React.Fragment key={req.id}>
                                                    <tr className="hover:bg-gray-50/50 border-b border-gray-50">
                                                        <td className="px-6 py-4 font-medium text-gray-800">{req.title}</td>
                                                        <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">{req.category}</span></td>
                                                        <td className="px-6 py-4 font-bold text-green-600 font-mono text-lg">₦{calcTotal.toLocaleString()}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === 'APPROVED_BY_MD' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                                {req.status === 'APPROVED_BY_MD' ? 'Awaiting Payout' : 'Disbursed'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {req.status === 'APPROVED_BY_MD' && (
                                                                <button disabled={actionLoading} onClick={() => openDisburseFundModal(req.id)}
                                                                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                                                                    Disburse Funds
                                                                </button>
                                                            )}
                                                            {req.status === 'DISBURSED' && <span className="text-gray-400 text-xs italic">Paid</span>}
                                                        </td>
                                                    </tr>
                                                    {req.items && req.items.length > 0 && (
                                                    <tr className="bg-gray-50/30">
                                                        <td colSpan={5} className="px-6 py-2">
                                                            <div className="pl-4 border-l-2 border-indigo-200 py-1">
                                                                <table className="w-full text-xs text-left mb-1">
                                                                    <thead className="text-gray-400 border-b border-gray-100">
                                                                        <tr>
                                                                            <th className="pb-1">Item Required</th>
                                                                            <th className="pb-1">Qty</th>
                                                                            <th className="pb-1">Purpose</th>
                                                                            <th className="pb-1 text-right">Unit (₦)</th>
                                                                            <th className="pb-1 text-right">Total (₦)</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-50">
                                                                        {req.items.map((i: any, idx: number) => (
                                                                            <tr key={idx} className="text-gray-500">
                                                                                <td className="py-1 line-clamp-1">{i.itemRequired}</td>
                                                                                <td className="py-1">{i.qty}</td>
                                                                                <td className="py-1 truncate max-w-[150px]">{i.purpose || '-'}</td>
                                                                                <td className="py-1 text-right">{i.unitPrice?.toLocaleString()}</td>
                                                                                <td className="py-1 font-bold text-gray-700 text-right">{(i.qty * i.unitPrice).toLocaleString()}</td>
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
                                </div>
                            </div>

                                                                </>
                                )}
                            </>
                        )}
                        
                        {activeTab === 'PAYMENTS_COMMISSIONS' && (
                            <>
                                {loading ? (
                                    <div className="flex justify-center p-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Pending MD-Approval Payments */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden mb-8">
                                            <div className="px-6 py-5 border-b border-indigo-100 bg-indigo-50/50 flex justify-between items-center">
                                                <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Pending MD-Approval Payments
                                                </h3>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-indigo-50/20 text-gray-400 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Client / Product</th>
                                                            <th className="px-6 py-4">Amount & Details</th>
                                                            <th className="px-6 py-4">Recorded By</th>
                                                            <th className="px-6 py-4 text-center">Proof of Payment</th>
                                                            <th className="px-6 py-4">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {pendingPayments.length === 0 ? (
                                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No staff-reported payments awaiting approval.</td></tr>
                                                        ) : pendingPayments.map(p => (
                                                            <tr key={p.id} className="hover:bg-indigo-50/30">
                                                                <td className="px-6 py-4">
                                                                    <div className="font-medium text-gray-900">{p.sale?.lead?.fullName || 'Unknown Client'}</div>
                                                                    <div className="text-sm text-gray-500 mt-1">{p.sale?.plot?.prototype || 'Unknown Property'}</div>
                                                                    <div className="text-xs text-gray-400">
                                                                        {p.sale?.plot?.estate?.name || 'Unknown Estate'} ({p.sale?.plot?.estate?.location || 'Unknown Location'})
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-blue-700 text-lg flex items-center gap-2">
                                                                        ₦{p.amount.toLocaleString()}
                                                                        {p.virtualLoanAmount > 0 && (
                                                                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-sm uppercase border border-orange-200">
                                                                                + ₦{p.virtualLoanAmount.toLocaleString()} VL
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500 mt-1 flex flex-col space-y-1">
                                                                        <div className="flex gap-2 items-center flex-wrap">
                                                                            <span className="text-xs font-semibold text-gray-700">Plot Price: ₦{(p.sale?.agreedPrice || 0).toLocaleString()}</span>
                                                                            {(() => {
                                                                                const label = getPaymentTypeLabel(p);
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
                                                                        {p.notes && (
                                                                            <div className="mt-2 bg-yellow-50 border border-yellow-100 p-2 rounded-lg text-sm text-yellow-800">
                                                                                <span className="font-bold text-xs uppercase tracking-wider block mb-0.5 text-yellow-600">Marketer's Note:</span>
                                                                                {p.notes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm font-medium text-gray-800">{p.recordedByUser?.fullName || 'N/A'}</div>
                                                                    <div className="text-xs font-bold text-gray-500 uppercase mt-1 px-1.5 py-0.5 bg-gray-100 w-max">{p.recordedByUser?.role?.replace('_', ' ') || ''}</div>
                                                                    <div className="mt-2 border-t border-gray-100 pt-2">
                                                                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">Sale Owner</span>
                                                                        <div className="text-xs font-medium text-gray-700">{p.sale?.marketer?.fullName || 'Unassigned'}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    {p.proofOfPaymentUrl ? (
                                                                        <div className="flex justify-center gap-3 flex-wrap">
                                                                            {(() => {
                                                                                let proofs = [];
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
                                                                                        <a 
                                                                                            key={idx}
                                                                                            href={fullUrl}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="relative group overflow-hidden rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0 inline-block"
                                                                                        >
                                                                                            <img 
                                                                                                src={fullUrl} 
                                                                                                alt="Receipt Thumbnail" 
                                                                                                className="w-16 h-16 object-cover transition-transform duration-300 group-hover:scale-110"
                                                                                            />
                                                                                        </a>
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
                                                                <td className="px-6 py-4">
                                                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-medium text-xs rounded-full animate-pulse">Awaiting MD</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Commission Queue */}
                                        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                                            <div className="px-6 py-5 border-b border-emerald-100 bg-emerald-50/50 flex justify-between items-center">
                                                <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    Pending Marketer Commissions
                                                </h3>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-emerald-50/20 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Date</th>
                                                            <th className="px-6 py-4">Client</th>
                                                            <th className="px-6 py-4">Marketer</th>
                                                            <th className="px-6 py-4">Plot / Estate</th>
                                                            <th className="px-6 py-4">Verified Payment</th>
                                                            <th className="px-6 py-4">Commission Owed</th>
                                                            <th className="px-6 py-4">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-emerald-50">
                                                        {commissions.length === 0 ? (
                                                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No pending commissions.</td></tr>
                                                        ) : commissions.map(payment => {
                                                            const rate = payment.sale?.marketer?.commissionRate || 5;
                                                            const commissionAmount = ((payment.amount * rate) / 100) - (payment.virtualLoanAmount || 0);
                                                            return (
                                                            <tr key={payment.id} className="hover:bg-emerald-50/30">
                                                                <td className="px-6 py-4 text-gray-500">
                                                                    {new Date(payment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-medium text-gray-800">{payment.sale?.lead?.fullName || 'N/A'}</div>
                                                                    {payment.sale?.lead?.company && (
                                                                        <div className="text-[10px] text-gray-400 mt-1 flex items-center">
                                                                            Origin: {payment.sale.lead.company.abbreviation} - {payment.sale.lead.branch?.name}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 font-medium text-gray-800">
                                                                    {payment.sale?.marketer?.fullName || 'N/A'}
                                                                    <div className="text-xs text-blue-600 mt-1">{rate}% Rate</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    Plot {payment.sale?.plot?.plotNumber} <br/>
                                                                    <span className="text-xs text-gray-500">{payment.sale?.plot?.estate?.name}</span>
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-gray-600">₦{payment.amount.toLocaleString()}</td>
                                                                <td className="px-6 py-4 font-bold text-emerald-600 font-mono text-lg">₦{commissionAmount.toLocaleString()}</td>
                                                                <td className="px-6 py-4">
                                                                    <button disabled={actionLoading} onClick={() => openDisburseCommissionModal(payment.id)}
                                                                        className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                                                                        Mark Paid
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )})}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        
                        {activeTab === 'HISTORY' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">Transaction History</h2>
                                        <p className="text-sm text-gray-500">View processed payments, paid commissions, and disbursed requisitions.</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
                                            <input 
                                                type="date" 
                                                value={historyStartDate}
                                                onChange={(e) => setHistoryStartDate(e.target.value)}
                                                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
                                            <input 
                                                type="date" 
                                                value={historyEndDate}
                                                onChange={(e) => setHistoryEndDate(e.target.value)}
                                                className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {historyLoading ? (
                                    <div className="flex justify-center p-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-8">
                                        {/* Processed Payments */}
                                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                                <h3 className="font-bold text-gray-800">Processed Payments</h3>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold">{historyData.payments.length}</span>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Date</th>
                                                            <th className="px-6 py-4">Client</th>
                                                            <th className="px-6 py-4">Amount</th>
                                                            <th className="px-6 py-4">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {historyData.payments.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : historyData.payments.map((p, i) => (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{new Date(p.date).toLocaleDateString()}</td>
                                                                <td className="px-6 py-3 font-medium">{p.sale?.lead?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono">₦{p.amount.toLocaleString()}</td>
                                                                <td className="px-6 py-3">
                                                                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {p.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Paid Commissions */}
                                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50/50 flex justify-between items-center">
                                                <h3 className="font-bold text-emerald-800">Paid Commissions</h3>
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold">{historyData.commissions.length}</span>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Disbursed At</th>
                                                            <th className="px-6 py-4">Marketer</th>
                                                            <th className="px-6 py-4">Client</th>
                                                            <th className="px-6 py-4">Commission Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {historyData.commissions.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : historyData.commissions.map((p, i) => {
                                                            const rate = p.sale?.marketer?.commissionRate || 5;
                                                            const commissionAmount = ((p.amount * rate) / 100) - (p.virtualLoanAmount || 0);
                                                            return (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{p.commissionDisbursedAt ? new Date(p.commissionDisbursedAt).toLocaleDateString() : '-'}</td>
                                                                <td className="px-6 py-3 font-medium">{p.sale?.marketer?.fullName}</td>
                                                                <td className="px-6 py-3 text-gray-500">{p.sale?.lead?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono font-bold text-emerald-600">₦{commissionAmount.toLocaleString()}</td>
                                                            </tr>
                                                        )})}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Disbursed Requisitions */}
                                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
                                                <h3 className="font-bold text-blue-800">Disbursed Requisitions</h3>
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold">{historyData.requisitions.length}</span>
                                            </div>
                                            <div className="p-0 overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-4">Date</th>
                                                            <th className="px-6 py-4">Title</th>
                                                            <th className="px-6 py-4">Requested By</th>
                                                            <th className="px-6 py-4">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {historyData.requisitions.length === 0 ? (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No records found.</td></tr>
                                                        ) : historyData.requisitions.map((r, i) => (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-3 text-gray-500">{new Date(r.requestDate).toLocaleDateString()}</td>
                                                                <td className="px-6 py-3 font-medium">{r.title}</td>
                                                                <td className="px-6 py-3 text-gray-500">{r.requestedByUser?.fullName}</td>
                                                                <td className="px-6 py-3 font-mono font-bold text-blue-600">₦{r.amountApproved?.toLocaleString() || 0}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>

</main>

            {/* Custom Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px] p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center space-x-3 bg-red-50/40">
                            <div className="p-2 bg-red-100 text-red-600 rounded-full shadow-inner">
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 font-medium text-sm leading-relaxed">{confirmModal.message}</p>
                            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-2xl border-t border-gray-100">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeConfirmation}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-[0_4px_12px_-2px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_16px_-2px_rgba(220,38,38,0.5)] transform hover:-translate-y-0.5 active:translate-y-0 flex items-center"
                            >
                                Confirm Action
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
