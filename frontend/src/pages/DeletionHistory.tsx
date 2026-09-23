import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface DeletionLog {
    id: string;
    saleId: string | null;
    deletedByUserId: string;
    deletedAt: string;
    reason: string | null;
    saleDataDump: string;
    deletedByUser: {
        fullName: string;
        email: string;
    };
    sale?: {
        id: string;
        status: string;
        totalPaid: number;
    };
}

export const DeletionHistory = () => {
    const { token, user } = useAuth();
    const [history, setHistory] = useState<DeletionLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (user?.role !== 'SUPER_ADMIN') return;
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sales/deletions/history`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHistory(res.data);
            } catch (error) {
                console.error('Failed to fetch deletion history', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [token, user]);

    if (user?.role !== 'SUPER_ADMIN') {
        return <div className="p-8 text-center text-red-500 font-bold">Unauthorized. Super Admin access required.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
                        <Trash2 className="mr-3 text-red-600" size={32} />
                        Sales Deletion History
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Audit log of all permanently deleted sales and reversed payments.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
            ) : history.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Deletions Yet</h3>
                    <p className="text-gray-500">There is no history of deleted sales in the system.</p>
                </div>
            ) : (
                <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 font-bold text-gray-700 text-sm">Date & Time</th>
                                    <th className="p-4 font-bold text-gray-700 text-sm">Deleted By</th>
                                    <th className="p-4 font-bold text-gray-700 text-sm">Reason</th>
                                    <th className="p-4 font-bold text-gray-700 text-sm">Data Snapshot</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((log) => {
                                    let parsedData: any = {};
                                    try { parsedData = JSON.parse(log.saleDataDump); } catch(e) {}
                                    
                                    return (
                                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 align-top">
                                                <div className="text-sm font-bold text-gray-900">{format(new Date(log.deletedAt), 'MMM dd, yyyy')}</div>
                                                <div className="text-xs text-gray-500">{format(new Date(log.deletedAt), 'h:mm a')}</div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <div className="text-sm font-bold text-gray-800">{log.deletedByUser.fullName}</div>
                                                <div className="text-xs text-gray-500">{log.deletedByUser.email}</div>
                                            </td>
                                            <td className="p-4 align-top max-w-xs">
                                                <div className="text-sm text-gray-700 font-medium whitespace-pre-wrap">
                                                    {log.reason || 'No reason provided'}
                                                </div>
                                            </td>
                                            <td className="p-4 align-top max-w-sm">
                                                <div className="bg-gray-100 rounded-lg p-2 text-xs font-mono text-gray-600 overflow-y-auto max-h-32">
                                                    Agreed Price: ₦{parsedData?.agreedPrice?.toLocaleString() || 0}
                                                    <br/>
                                                    Total Paid: ₦{parsedData?.totalPaid?.toLocaleString() || 0}
                                                    <br/>
                                                    Plot ID: {parsedData?.plotId || 'N/A'}
                                                    <br/>
                                                    {parsedData?.payments?.length || 0} reversed payment(s)
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
