import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { RequisitionForm } from '../components/RequisitionForm';
import { Plus, Clock, CheckCircle, XCircle, FileSpreadsheet, ArrowRightLeft } from 'lucide-react';
import { RefundQueue } from '../components/RefundQueue';

export const BranchRequisitions = () => {
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'REQUISITIONS' | 'REFUNDS'>('REQUISITIONS');

    const { user } = useAuth();
    const token = localStorage.getItem('token');
    
    // Hide refunds from HR roles
    const canViewRefunds = !['BRANCH_HR', 'HR_MANAGER'].includes(user?.role || '');

    const fetchRequisitions = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequisitions(res.data);
        } catch (error) {
            console.error("Failed to fetch requisitions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequisitions();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING_MD_APPROVAL': return <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit"><Clock size={12}/> Pending Approval</span>;
            case 'APPROVED_BY_MD': return <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1 w-fit"><CheckCircle size={12}/> MD Approved</span>;
            case 'DISBURSED': return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1 w-fit"><CheckCircle size={12}/> Funds Disbursed</span>;
            case 'REJECTED': return <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit"><XCircle size={12}/> Rejected</span>;
            default: return <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Branch Requisitions</h1>
                    <p className="text-gray-500">Submit and track requests for materials, imprest, or operational expenses.</p>
                </div>
                <button 
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition shadow-sm"
                >
                    <Plus size={20} />
                    New Requisition
                </button>
            </div>
            
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-transparent w-full max-w-5xl rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <RequisitionForm onClose={() => setShowForm(false)} onSuccess={() => {
                            setShowForm(false);
                            fetchRequisitions();
                        }} />
                    </div>
                </div>
            )}

            
            {canViewRefunds && (
                <div className="flex bg-gray-100 rounded-lg p-1 w-fit mb-6">
                    <button
                        onClick={() => setActiveTab('REQUISITIONS')}
                        className={`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 ${activeTab === 'REQUISITIONS' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <FileSpreadsheet size={16} /> Requisitions
                    </button>
                    <button
                        onClick={() => setActiveTab('REFUNDS')}
                        className={`px-6 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 ${activeTab === 'REFUNDS' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <ArrowRightLeft size={16} /> Client Refunds
                    </button>
                </div>
            )}

            {activeTab === 'REFUNDS' && <RefundQueue roleContext={user?.role as any} />}

            {activeTab === 'REQUISITIONS' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                    ) : requisitions.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No requisitions found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-gray-600">Reference / Title</th>
                                        <th className="px-6 py-4 font-bold text-gray-600">Category</th>
                                        <th className="px-6 py-4 font-bold text-gray-600">Total Requested</th>
                                        <th className="px-6 py-4 font-bold text-gray-600">Status</th>
                                        <th className="px-6 py-4 font-bold text-gray-600">Date Submitted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {requisitions.map((req) => (
                                        <tr key={req.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4 font-bold text-gray-800">{req.title}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 rounded text-xs border border-gray-200 text-gray-600 font-bold bg-white">{req.category}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-gray-600">
                                                ₦{req.items?.reduce((sum: number, item: any) => sum + (item.qty * item.unitPrice), 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                                            <td className="px-6 py-4 text-gray-500">{new Date(req.requestDate).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
