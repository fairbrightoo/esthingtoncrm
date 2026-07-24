import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { CalendarClock, CheckCircle, XCircle, Search, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const HRLeaveManagement = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [vetModalData, setVetModalData] = useState<{ isOpen: boolean, leaveId: string | null, status: string | null }>({ isOpen: false, leaveId: null, status: null });
    const [vetRemarks, setVetRemarks] = useState('');

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = user?.role === 'MANAGING_DIRECTOR' 
                ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/leaves/company-leaves`
                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/leaves/branch-leaves`;
                
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setLeaves(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch leaves:', error);
            setLoading(false);
        }
    };

    const submitVetLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        const { leaveId, status } = vetModalData;
        if (!leaveId || !status) return;

        try {
            const endpoint = user?.role === 'MANAGING_DIRECTOR' 
                ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/leaves/${leaveId}/approve`
                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/leaves/${leaveId}/vet`;
            
            const payload = user?.role === 'MANAGING_DIRECTOR'
                ? { status, mdRemarks: vetRemarks }
                : { status, hrRemarks: vetRemarks };

            const token = localStorage.getItem('token');
            await axios.put(endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });
            addToast('Leave status updated successfully', 'success');
            setVetModalData({ isOpen: false, leaveId: null, status: null });
            setVetRemarks('');
            fetchLeaves();
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to update leave', 'error');
        }
    };

    const filteredLeaves = leaves.filter(l => filter === 'ALL' || l.status === filter);

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PENDING_HR_APPROVAL': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'PENDING_MD_APPROVAL': 'bg-blue-100 text-blue-800 border-blue-200',
            'APPROVED': 'bg-green-100 text-green-800 border-green-200',
            'REJECTED': 'bg-red-100 text-red-800 border-red-200',
        };
        const activeStyle = styles[status] || styles['PENDING_HR_APPROVAL'];
        return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${activeStyle}`}>{status.replace(/_/g, ' ')}</span>;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                        <CalendarClock size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
                        <p className="text-gray-500 text-sm">Review, vet, and authorize employee time-off requests</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm w-1/3">
                        <Search size={18} className="text-gray-400 mr-2" />
                        <input type="text" placeholder="Search by name..." className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm w-full" />
                    </div>
                    <select 
                        className="bg-white border text-sm rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    >
                        <option value="ALL">All Requests</option>
                        <option value="PENDING_HR_APPROVAL">HR Queue</option>
                        <option value="PENDING_MD_APPROVAL">MD Queue</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-500">Loading leave requests...</div>
                ) : filteredLeaves.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                        <CalendarClock size={48} className="text-gray-300 mb-4" />
                        <p>No leave requests found matching the current filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Employee</th>
                                    <th className="px-6 py-4 font-medium">Leave Type</th>
                                    <th className="px-6 py-4 font-medium">Duration</th>
                                    <th className="px-6 py-4 font-medium">Reason</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLeaves.map((leave) => (
                                    <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{leave.user?.fullName}</p>
                                            <p className="text-xs text-gray-500">{leave.user?.role?.replace('_', ' ')}</p>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-700">{leave.type}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-gray-600">
                                                <Clock size={14} className="mr-1.5" />
                                                <span>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 min-w-[200px] whitespace-normal text-gray-500 leading-relaxed text-sm">
                                            <div className="max-h-32 overflow-y-auto pr-1">
                                                {leave.reason}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(leave.status)}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {(user?.role === 'BRANCH_HR' && leave.status === 'PENDING_HR_APPROVAL') && (
                                                <div className="flex space-x-2">
                                                    <button onClick={() => setVetModalData({ isOpen: true, leaveId: leave.id, status: 'PENDING_MD_APPROVAL' })} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition-colors" title="Recommend to MD">
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button onClick={() => setVetModalData({ isOpen: true, leaveId: leave.id, status: 'REJECTED' })} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors" title="Reject Request">
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            )}
                                            {(user?.role === 'MANAGING_DIRECTOR' && leave.status === 'PENDING_MD_APPROVAL') && (
                                                <>
                                                    <button onClick={() => setVetModalData({ isOpen: true, leaveId: leave.id, status: 'APPROVED' })} className="flex items-center px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors">
                                                        <CheckCircle size={14} className="mr-1" /> Approve
                                                    </button>
                                                    <button onClick={() => setVetModalData({ isOpen: true, leaveId: leave.id, status: 'REJECTED' })} className="flex items-center mt-2 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors">
                                                        <XCircle size={14} className="mr-1" /> Deny
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {vetModalData.isOpen && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={submitVetLeave} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col transform transition-all">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">
                                {vetModalData.status === 'APPROVED' ? 'Approve Leave' : vetModalData.status === 'REJECTED' ? 'Reject Leave' : 'Recommend Leave'}
                            </h3>
                            <button type="button" onClick={() => setVetModalData({ isOpen: false, leaveId: null, status: null })} className="text-gray-400 hover:text-gray-600 transition">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">Please provide optional remarks or reasons for this action.</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                                <textarea rows={3} value={vetRemarks} onChange={e => setVetRemarks(e.target.value)} className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Enter your remarks..."></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-50 bg-gray-50 flex justify-end space-x-3">
                            <button type="button" onClick={() => {setVetModalData({ isOpen: false, leaveId: null, status: null }); setVetRemarks('');}} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all">Cancel</button>
                            <button type="submit" className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all ${vetModalData.status === 'REJECTED' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}>
                                Confirm Action
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
