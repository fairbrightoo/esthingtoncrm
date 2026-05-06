import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const GMAdvisoryQueue = () => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const { branchName } = useParams();
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequisitions();
    }, [token]);

    const fetchRequisitions = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter to only show pending MD approval
            const pending = res.data.filter((r: any) => r.status === 'PENDING_MD_APPROVAL');
            setRequisitions(pending);
        } catch (error) {
            console.error("Failed to fetch requisitions", error);
            addToast("Failed to load advisory queue", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRecommend = async (id: string, recommendation: 'RECOMMENDED' | 'NOT_RECOMMENDED') => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/gm-recommend/${id}`, {
                gmRecommendation: recommendation
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast(`Marked as ${recommendation === 'RECOMMENDED' ? 'Recommended' : 'Not Recommended'}`, 'success');
            fetchRequisitions(); // Refresh list
        } catch (error) {
            console.error("Failed to submit recommendation", error);
            addToast("Failed to submit recommendation", 'error');
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse text-gray-500">Loading Advisory Queue...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Advisory Queue</h1>
                <p className="text-gray-500 mt-2">Review pending requisitions and attach your advisory tag for the Managing Director.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search requisitions..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Title / Description</th>
                                <th className="p-4 font-semibold">Requested By</th>
                                <th className="p-4 font-semibold text-right">Amount (₦)</th>
                                <th className="p-4 font-semibold text-center">Your Advisory</th>
                                <th className="p-4 font-semibold text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {requisitions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        No pending requisitions require your advisory at this time.
                                    </td>
                                </tr>
                            ) : (
                                requisitions.map((req) => {
                                    const totalAmount = req.items?.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) || 0;
                                    
                                    return (
                                        <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <p className="font-bold text-gray-900">{req.title}</p>
                                                <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{req.description}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-medium text-gray-800">{req.requestedByUser?.fullName}</p>
                                                <p className="text-xs text-gray-500">{req.category}</p>
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-900">
                                                {totalAmount.toLocaleString()}
                                            </td>
                                            <td className="p-4 text-center">
                                                {req.gmRecommendation === 'PENDING' && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                        <Clock size={12} className="mr-1" /> Pending
                                                    </span>
                                                )}
                                                {req.gmRecommendation === 'RECOMMENDED' && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                        <CheckCircle size={12} className="mr-1" /> Recommended
                                                    </span>
                                                )}
                                                {req.gmRecommendation === 'NOT_RECOMMENDED' && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                        <XCircle size={12} className="mr-1" /> Not Recommended
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center space-x-2">
                                                    <button 
                                                        onClick={() => handleRecommend(req.id, 'RECOMMENDED')}
                                                        className={`p-2 rounded-lg transition-colors ${req.gmRecommendation === 'RECOMMENDED' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'}`}
                                                        title="Recommend for Approval"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRecommend(req.id, 'NOT_RECOMMENDED')}
                                                        className={`p-2 rounded-lg transition-colors ${req.gmRecommendation === 'NOT_RECOMMENDED' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'}`}
                                                        title="Do Not Recommend"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};