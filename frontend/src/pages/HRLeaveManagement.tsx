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
    const [search, setSearch] = useState('');
    const [vetModalData, setVetModalData] = useState<{ isOpen: boolean, leaveId: string | null, status: string | null }>({ isOpen: false, leaveId: null, status: null });
    const [vetRemarks, setVetRemarks] = useState('');

    const isDirector = ['MANAGING_DIRECTOR', 'GROUP_MANAGING_DIRECTOR', 'SUPER_ADMIN', 'GLOBAL_CHAIRMAN'].includes(user?.role || '');
    const isHR = user?.role === 'BRANCH_HR';

    useEffect(() => {
        fetchLeaves();
    }, [user?.role]);

    const fetchLeaves = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = isDirector 
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
            const endpoint = isDirector 
                ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/leaves/${leaveId}/approve`
                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/leaves/${leaveId}/vet`;
            
            const payload = isDirector
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

    const filteredLeaves = leaves.filter(l => {
        const matchesFilter = filter === 'ALL' || l.status === filter;
        const matchesSearch = !search.trim() || 
            l.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            l.reason?.toLowerCase().includes(search.toLowerCase()) ||
            l.type?.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PENDING_HR_APPROVAL': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'PENDING_MD_APPROVAL': 'bg-blue-100 text-blue-800 border-blue-200',
            'APPROVED': 'bg-green-100 text-green-800 border-green-200',
            'REJECTED': 'bg-red-100 text-red-800 border-red-200',
        };
        const activeStyle = styles[status] || styles['PENDING_HR_APPROVAL'];
        
        let label = status.replace(/_/g, ' ');
        if (status === 'PENDING_MD_APPROVAL') {
            label = 'PENDING MD/GMD APPROVAL';
        }

        return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${activeStyle}`}>{label}</span>;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                    <div className="flex items-center bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm w-full md:w-1/3">
                        <Search size={18} className="text-gray-400 mr-2 shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Search by employee name or reason..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm w-full" 
                        />
                    </div>
                    <select 
                        className="bg-white border text-sm rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm font-medium"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    >
                        <option value="ALL">All Requests</option>
                        <option value="PENDING_HR_APPROVAL">HR Queue</option>
                        <option value="PENDING_MD_APPROVAL">MD / GMD Queue</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-500 font-medium">Loading leave requests...</div>
                ) : filteredLeaves.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                        <CalendarClock size={48} className="text-gray-300 mb-4" />
                        <p className="font-medium text-gray-700">No leave requests found matching the current filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Employee</th>
                                    <th className="px-6 py-4 font-semibold">Leave Type</th>
                                    <th className="px-6 py-4 font-semibold">Duration</th>
                                    <th className="px-6 py-4 font-semibold">Reason</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
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
                                            <div className="flex items-center text-gray-600 text-xs font-medium">
                                                <Clock size={14} className="mr-1.5 text-gray-400" />
                                                <span>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 min-w-[200px] whitespace-normal text-gray-500 leading-relaxed text-sm">
                                            <div className="max-h-32 overflow-y-auto pr-1">
                                                {leave.reason}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(leave.status)}
                                            {leave.mdRemarks && (
                                                <p className="text-[11px] text-gray-500 mt-1 max-w-[200px] truncate" title={leave.mdRemarks}>
                                                    <span className="font-semibold text-gray-700">Remark:</span> {leave.mdRemarks}
                                                </p>
                                            )}
                                            {leave.hrRemarks && !leave.mdRemarks && (
                                                <p className="text-[11px] text-gray-500 mt-1 max-w-[200px] truncate" title={leave.hrRemarks}>
                                                    <span className="font-semibold text-gray-700">HR:</span> {leave.hrRemarks}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {/* HR Vetting Actions (HR can recommend to MD/GMD or reject if pending HR approval) */}
                                            {isHR && leave.status === 'PENDING_HR_APPROVAL' && (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button 
                                                        onClick={() => setVetModalData({ isOpen: true, leaveId: leave.id, status: 'PENDING_MD_APPROVAL' })} 
                                                        className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold shadow-sm" 
                                                        title="Recommend to MD / GMD"
                                                    >
                                                        <CheckCircle size={14} className="mr-1" />
                                                        <span>Recommend</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => setVetModalData({ isOpen: true, leaveId: leave.id, status: 'REJECTED' })} 
                                                        className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold shadow-sm" 
                                                        title="Reject Request"
                                                    >
                                                        <XCircle size={14} className="mr-1" />
                                                        <span>Reject</span>
                                                    </button>
                                                </div>
                                            )}

                                            {/* Director Actions: Both MD & GMD can approve or deny in MD Queue OR override HR if in HR Queue */}
                                            {isDirector && (leave.status === 'PENDING_MD_APPROVAL' || leave.status === 'PENDING_HR_APPROVAL') && (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button 
                                                        onClick={() => setVetModalData({ isOpen: true, leaveId: leave.id, status: 'APPROVED' })} 
                                                        className="flex items-center px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors shadow-sm"
                                                        title={leave.status === 'PENDING_HR_APPROVAL' ? "Direct Approve (Override HR)" : "Approve Leave Request"}
                                                    >
                                                        <CheckCircle size={14} className="mr-1" />
                                                        <span>{leave.status === 'PENDING_HR_APPROVAL' ? 'Direct Approve' : 'Approve'}</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => setVetModalData({ isOpen: true, leaveId: leave.id, status: 'REJECTED' })} 
                                                        className="flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors shadow-sm"
                                                        title="Deny / Reject Leave Request"
                                                    >
                                                        <XCircle size={14} className="mr-1" />
                                                        <span>Deny</span>
                                                    </button>
                                                </div>
                                            )}

                                            {(leave.status === 'APPROVED' || leave.status === 'REJECTED') && (
                                                <span className="text-xs text-gray-400 font-medium italic">
                                                    Completed
                                                </span>
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
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                            <h3 className="text-lg font-bold text-gray-900">
                                {vetModalData.status === 'APPROVED' 
                                    ? (isDirector ? 'Authorize Leave Request' : 'Approve Leave') 
                                    : vetModalData.status === 'REJECTED' 
                                    ? 'Reject Leave Request' 
                                    : 'Recommend Leave to Executives'}
                            </h3>
                            <button type="button" onClick={() => setVetModalData({ isOpen: false, leaveId: null, status: null })} className="text-gray-400 hover:text-gray-600 transition">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                {vetModalData.status === 'APPROVED' 
                                    ? 'Confirm authorization for this employee time-off request. You may add executive remarks below.'
                                    : 'Please provide optional remarks or reasons for this action.'}
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                                <textarea 
                                    rows={3} 
                                    value={vetRemarks} 
                                    onChange={e => setVetRemarks(e.target.value)} 
                                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                                    placeholder="Enter your remarks..."
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-50 bg-gray-50 flex justify-end space-x-3">
                            <button 
                                type="button" 
                                onClick={() => {setVetModalData({ isOpen: false, leaveId: null, status: null }); setVetRemarks('');}} 
                                className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all ${
                                    vetModalData.status === 'REJECTED' 
                                        ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                                }`}
                            >
                                Confirm Action
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

