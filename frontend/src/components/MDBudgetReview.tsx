import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calculator, CheckCircle, XCircle } from 'lucide-react';

export const MDBudgetReview = () => {
    const { token } = useAuth();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchBudgets = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/budgets`, { headers: { Authorization: `Bearer ${token}` } });
            // MD should only review DRAFT / PENDING logic
            setBudgets(res.data.filter((b: any) => b.status === 'DRAFT' || b.status === 'PENDING_MD_APPROVAL'));
        } catch (err) {
            console.error("Error fetching budgets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudgets();
    }, []);

    const handleApproval = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        const action = status === 'APPROVED' ? 'Approve' : 'Reject';
        if (!confirm(`Are you sure you want to ${action} this branch budget?`)) return;
        
        try {
            setActionLoading(true);
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/budgets/md-approve/${id}`, { status }, { headers: { Authorization: `Bearer ${token}` } });
            await fetchBudgets();
        } catch (err) {
            alert(`Failed to ${action} budget.`);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Calculator className="text-blue-600" size={20} /> Pending Branch Budgets
                </h3>
            </div>
            
            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading pending budgets...</div>
            ) : budgets.length === 0 ? (
                <div className="p-10 text-center text-gray-500">No branch budgets currently waiting for MD approval.</div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {budgets.map((b) => {
                        const calcedTotal = b.items?.reduce((s: number, i: any) => s + i.amountAllocated, 0) || 0;
                        return (
                        <div key={b.id} className="p-6 hover:bg-gray-50/30 transition">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-bold text-gray-900 text-lg">{b.title}</h4>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-700`}>
                                            Awaiting MD Approval
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        <span className="font-semibold text-gray-700">{b.branch?.name}</span> • {new Date(b.periodStartDate).toLocaleDateString()} to {new Date(b.periodEndDate).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-blue-500 mt-1">Prepared by: {b.preparedByUser?.fullName}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Requested Total</div>
                                    <div className="text-2xl font-black text-blue-700">₦{calcedTotal.toLocaleString()}</div>
                                </div>
                            </div>
                            
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-gray-500 bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-2 font-bold">Category</th>
                                            <th className="px-4 py-2 font-bold text-right">Amount (₦)</th>
                                            <th className="px-4 py-2 font-bold pl-8">Notes / Justification</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {b.items?.map((item: any) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-2 text-gray-800 font-medium">{item.category}</td>
                                                <td className="px-4 py-2 text-gray-800 font-mono text-right">{item.amountAllocated.toLocaleString()}</td>
                                                <td className="px-4 py-2 text-gray-500 pl-8 text-xs">{item.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    disabled={actionLoading}
                                    onClick={() => handleApproval(b.id, 'REJECTED')}
                                    className="px-4 py-2 flex items-center gap-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition"
                                >
                                    <XCircle size={16} /> Reject
                                </button>
                                <button 
                                    disabled={actionLoading}
                                    onClick={() => handleApproval(b.id, 'APPROVED')}
                                    className="px-6 py-2 flex items-center gap-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md font-medium transition"
                                >
                                    <CheckCircle size={16} /> Approve Budget
                                </button>
                            </div>
                        </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};
