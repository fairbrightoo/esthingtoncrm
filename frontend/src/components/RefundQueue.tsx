import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CheckCircle, XCircle, ArrowRightLeft, AlertTriangle } from 'lucide-react';

interface RefundRequest {
    id: string;
    status: string;
    reason: string;
    penaltyAmount: number;
    refundAmount: number;
    createdAt: string;
    client: { fullName: string; phone: string; };
    marketer: { fullName: string; role?: string; };
    sale: {
        id: string;
        agreedPrice: number;
        totalPaid: number;
        plot: { prototype: string; estate: { name: string; } };
    };
}

export const RefundQueue = ({ roleContext }: { roleContext: 'BRANCH_ADMIN' | 'MANAGING_DIRECTOR' | 'ACCOUNTANT' | 'CUSTOMER_CARE' }) => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [refunds, setRefunds] = useState<RefundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; action: 'approve' | 'reject' | 'disburse' | null; refundId: string | null; message: string; title: string; }>({ isOpen: false, action: null, refundId: null, message: '', title: '' });

    const fetchRefunds = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:3000/api/refunds`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // We want admins and MDs to see all active refunds to guarantee visibility.
            let filtered = res.data.filter((r: RefundRequest) => r.status !== 'DISBURSED');
            setRefunds(filtered);
        } catch(error) {
            console.error("Failed to fetch refunds", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefunds();
    }, [roleContext]);

    const handleActionClick = (action: 'approve' | 'reject' | 'disburse', refundId: string) => {
        let confirmMessage = "";
        let title = "Confirm Action";

        if (action === 'approve' && roleContext === 'BRANCH_ADMIN') {
            title = "Escalate Refund";
            confirmMessage = "Are you sure you want to properly vet and escalate this refund to the Managing Director?";
        } else if (action === 'approve' && roleContext === 'MANAGING_DIRECTOR') {
            title = "Approve Refund";
            confirmMessage = "Are you sure you want to approve this refund? This will immediately make the property AVAILABLE back on the market.";
        } else if (action === 'disburse' && roleContext === 'ACCOUNTANT') {
            title = "Confirm Disbursement";
            confirmMessage = "Please confirm that you have successfully wired the funds to the client. This legally concludes the transaction and cannot be undone.";
        } else if (action === 'reject') {
            title = "Reject Refund";
            confirmMessage = "Are you sure you want to reject this refund request?";
        }

        setConfirmModal({ isOpen: true, action, refundId, message: confirmMessage, title });
    };

    const executeAction = async () => {
        const { action, refundId } = confirmModal;
        if (!action || !refundId) return;

        setConfirmModal({ isOpen: false, action: null, refundId: null, message: '', title: '' });

        let actionPayload = '';

        if (action === 'approve' && roleContext === 'BRANCH_ADMIN') {
            actionPayload = 'ESCALATE';
        } else if (action === 'approve' && roleContext === 'MANAGING_DIRECTOR') {
            actionPayload = 'APPROVE';
        } else if (action === 'disburse' && roleContext === 'ACCOUNTANT') {
            actionPayload = 'DISBURSE';
        } else if (action === 'reject') {
            actionPayload = 'REJECT';
        }

        try {
            await axios.put(`http://localhost:3000/api/refunds/${refundId}/status`, { action: actionPayload }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast(`Refund processed successfully.`, 'success');
            fetchRefunds();
        } catch (error: any) {
            addToast(error.response?.data?.error || `Failed to process refund.`, 'error');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading refunds...</div>;
    }

    if (refunds.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border p-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <ArrowRightLeft size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">No Pending Refunds</h3>
                <p className="text-gray-500 mt-2">Your queue is clear.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left bg-white">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Client Info</th>
                        <th className="px-6 py-4">Sale Context</th>
                        <th className="px-6 py-4">Refund Matrix</th>
                        <th className="px-6 py-4">Reason / By</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {refunds.map(refund => (
                        <tr key={refund.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{refund.client?.fullName || 'Unknown Client'}</div>
                                <div className="text-sm text-gray-500">{refund.client?.phone || 'No phone provided'}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-800">{refund.sale.plot.prototype}</div>
                                <div className="text-xs text-gray-500">{refund.sale.plot.estate.name}</div>
                                <div className="text-xs font-bold mt-1 text-blue-600">Total Paid: ₦{refund.sale.totalPaid.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="bg-orange-50 p-2 rounded border border-orange-100 text-sm">
                                    <div className="flex justify-between mb-1 text-gray-700 font-medium"><span>Penalty (20%):</span> <span className="text-red-600">-₦{refund.penaltyAmount.toLocaleString()}</span></div>
                                    <div className="flex justify-between font-bold text-gray-900"><span>To Refund (80%):</span> <span className="text-green-600">₦{refund.refundAmount.toLocaleString()}</span></div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <p className="text-sm font-medium text-gray-800 max-w-xs truncate" title={refund.reason}>"{refund.reason}"</p>
                                <p className="text-xs text-gray-500 mt-1">By {refund.marketer?.fullName || 'Unknown'}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                                {roleContext === 'BRANCH_ADMIN' && refund.status === 'PENDING_BRANCH_ADMIN' && (
                                    <button 
                                        onClick={() => handleActionClick('approve', refund.id)}
                                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                                    >
                                        Vett & Escalate
                                    </button>
                                )}
                                {roleContext === 'MANAGING_DIRECTOR' && refund.status === 'PENDING_MD_APPROVAL' && (
                                    <button 
                                        onClick={() => handleActionClick('approve', refund.id)}
                                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700"
                                    >
                                        Approve Refund
                                    </button>
                                )}
                                {roleContext === 'ACCOUNTANT' && refund.status === 'APPROVED_BY_MD' && (
                                    <button 
                                        onClick={() => handleActionClick('disburse', refund.id)}
                                        className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center justify-center shadow-md w-full"
                                    >
                                        <CheckCircle size={16} className="mr-1.5" /> Disburse Cash
                                    </button>
                                )}
                                {((roleContext === 'BRANCH_ADMIN' && refund.status !== 'PENDING_BRANCH_ADMIN') || 
                                  (roleContext === 'MANAGING_DIRECTOR' && refund.status !== 'PENDING_MD_APPROVAL') || 
                                  (roleContext === 'ACCOUNTANT' && refund.status !== 'APPROVED_BY_MD') ||
                                  (roleContext === 'CUSTOMER_CARE')) && (
                                    <span className="text-gray-400 text-xs font-bold uppercase">{refund.status.replace(/_/g, ' ')}</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Custom Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px] p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
                        <div className={`px-6 py-5 border-b flex items-center space-x-3 ${confirmModal.action === 'reject' ? 'bg-red-50/40 border-red-100' : 'bg-gray-50/40 border-gray-100'}`}>
                            <div className={`p-2 rounded-full shadow-inner ${confirmModal.action === 'reject' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 font-medium text-[15px] leading-relaxed">{confirmModal.message}</p>
                            
                            {(confirmModal.action === 'disburse' || confirmModal.title === 'Approve Refund') && (
                                <p className="text-xs text-orange-500 mt-4 flex items-center gap-1.5 font-bold uppercase bg-orange-50 p-2 rounded-lg border border-orange-100">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    This action cannot be reversed.
                                </p>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-2xl border-t border-gray-100">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, action: null, refundId: null, message: '', title: '' })}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeAction}
                                className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0 flex items-center ${
                                    confirmModal.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 
                                    confirmModal.action === 'disburse' ? 'bg-orange-600 hover:bg-orange-700' :
                                    confirmModal.action === 'approve' && roleContext === 'MANAGING_DIRECTOR' ? 'bg-green-600 hover:bg-green-700' :
                                    'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {confirmModal.action === 'disburse' ? <CheckCircle size={16} className="mr-1.5" /> : null}
                                Confirm Action
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
