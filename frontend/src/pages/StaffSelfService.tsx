import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CalendarClock, AlertTriangle, CheckCircle, Target, MessageSquare, XCircle, Clock, ArrowRightLeft, FileText, Building2, Calendar, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { ClockInComponent } from '../components/ClockInComponent';
import { TransferLetterModal } from '../components/TransferLetterModal';

export const StaffSelfService = () => {
    const { addToast } = useToast();
    
    const [leaves, setLeaves] = useState<any[]>([]);
    const [queries, setQueries] = useState<any[]>([]);
    const [appraisals, setAppraisals] = useState<any[]>([]);
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [transfers, setTransfers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ATTENDANCE');

    // Transfer Letter Modal
    const [letterModal, setLetterModal] = useState<{ isOpen: boolean; transfer: any | null }>({
        isOpen: false,
        transfer: null
    });

    // New Leave Form
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveType, setLeaveType] = useState('ANNUAL');
    const [leaveStart, setLeaveStart] = useState('');
    const [leaveEnd, setLeaveEnd] = useState('');
    const [leaveReason, setLeaveReason] = useState('');

    // Query Reply Modal
    const [replyModalData, setReplyModalData] = useState<{ isOpen: boolean, queryId: string | null }>({ isOpen: false, queryId: null });
    const [queryReply, setQueryReply] = useState('');

    useEffect(() => {
        fetchMyData();
    }, []);

    const fetchMyData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [lRes, qRes, aRes, attRes, trfRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/leaves/my-leaves`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/queries/my-queries`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/appraisals/my-appraisals`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/attendance/my-records`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/transfers`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
            ]);
            setLeaves(lRes.data);
            setQueries(qRes.data);
            setAppraisals(aRes.data);
            setAttendanceHistory(attRes.data);
            setTransfers(trfRes.data || []);
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    };

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/leaves`, {
                startDate: leaveStart, endDate: leaveEnd, type: leaveType, reason: leaveReason
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            addToast('Leave request submitted successfully.', 'success');
            setShowLeaveModal(false);
            fetchMyData();
        } catch (error) {
            addToast('Failed to apply for leave.', 'error');
        }
    };

    const submitQueryReply = async (e: React.FormEvent) => {
        e.preventDefault();
        const { queryId } = replyModalData;
        if (!queryId || !queryReply) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/queries/${queryId}/reply`, { staffReply: queryReply }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('Query response submitted.', 'success');
            setReplyModalData({ isOpen: false, queryId: null });
            setQueryReply('');
            fetchMyData();
        } catch (error) {
            addToast('Failed to submit response.', 'error');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Staff HR Self-Service</h1>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl p-1 shadow-sm border border-gray-100 inline-flex flex-wrap">
                <button onClick={() => setActiveTab('ATTENDANCE')} className={`px-6 py-2.5 rounded-lg text-sm font-medium flex items-center ${activeTab === 'ATTENDANCE' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Clock size={16} className="mr-2" /> Daily Attendance
                </button>
                <button onClick={() => setActiveTab('LEAVES')} className={`px-6 py-2.5 rounded-lg text-sm font-medium flex items-center ${activeTab === 'LEAVES' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <CalendarClock size={16} className="mr-2" /> My Leaves
                </button>
                <button onClick={() => setActiveTab('QUERIES')} className={`px-6 py-2.5 rounded-lg text-sm font-medium flex items-center ${activeTab === 'QUERIES' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <AlertTriangle size={16} className="mr-2" /> Disciplinary
                    {queries.filter(q => q.status === 'OPEN').length > 0 && (
                        <span className="ml-2 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                            {queries.filter(q => q.status === 'OPEN').length}
                        </span>
                    )}
                </button>
                <button onClick={() => setActiveTab('APPRAISALS')} className={`px-6 py-2.5 rounded-lg text-sm font-medium flex items-center ${activeTab === 'APPRAISALS' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <Target size={16} className="mr-2" /> Appraisals
                </button>
                <button onClick={() => setActiveTab('TRANSFERS')} className={`px-6 py-2.5 rounded-lg text-sm font-medium flex items-center ${activeTab === 'TRANSFERS' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <ArrowRightLeft size={16} className="mr-2" /> Redeployments
                    {transfers.length > 0 && (
                        <span className="ml-2 bg-emerald-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                            {transfers.length}
                        </span>
                    )}
                </button>
            </div>

            {loading ? (
                <div className="p-10 text-center text-gray-500 bg-white rounded-xl">Loading...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
                    {/* ATTENDANCE TAB */}
                    {activeTab === 'ATTENDANCE' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <ClockInComponent onClockInSuccess={fetchMyData} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Recent Attendance Records</h3>
                                    {attendanceHistory.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No attendance records found for this month.</p>
                                    ) : (
                                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                            {attendanceHistory.map(record => (
                                                <div key={record.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                                                            <p><span className="font-semibold">In:</span> {record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '--:--'}</p>
                                                            <p><span className="font-semibold">Out:</span> {record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '--:--'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 sm:mt-0 text-right">
                                                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                            record.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 
                                                            record.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' : 
                                                            record.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-200 text-gray-700'
                                                        }`}>
                                                            {record.status}
                                                        </span>
                                                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{record.method}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LEAVES TAB */}
                    {activeTab === 'LEAVES' && (
                        <div>
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                                <h3 className="font-semibold text-gray-800">Leave History</h3>
                                <button onClick={() => setShowLeaveModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">Request Time Off</button>
                            </div>
                            {leaves.length === 0 ? (
                                <p className="p-8 text-center text-gray-500">You have no leave history.</p>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 border-b">
                                        <tr>
                                            <th className="px-6 py-3">Type</th>
                                            <th className="px-6 py-3">Duration</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaves.map(l => (
                                            <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-medium">{l.type}</td>
                                                <td className="px-6 py-4">{new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${l.status === 'APPROVED' ? 'bg-green-100 text-green-800' : l.status==='REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{l.status.replace(/_/g, ' ')}</span>
                                                    {l.mdRemarks && <p className="text-xs text-gray-500 mt-1">MD Note: {l.mdRemarks}</p>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* QUERIES TAB */}
                    {activeTab === 'QUERIES' && (
                        <div>
                            <div className="p-5 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-semibold text-red-800">Disciplinary Inbox</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {queries.length === 0 ? (
                                    <div className="text-center text-green-600 p-8 flex flex-col items-center">
                                        <CheckCircle size={48} className="mb-4 opacity-50" />
                                        <p className="font-medium text-lg">Clean Record!</p>
                                        <p className="text-sm">You have no active queries or warnings.</p>
                                    </div>
                                ) : (
                                    queries.map(q => (
                                        <div key={q.id} className={`p-5 border rounded-xl ${q.status === 'OPEN' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900">{q.subject}</h4>
                                                <span className={`text-xs px-2 py-1 rounded font-bold ${q.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{q.status}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 bg-white/60 p-3 rounded-lg mb-4">{q.description}</p>
                                            
                                            {q.status === 'OPEN' && (
                                                <button onClick={() => setReplyModalData({ isOpen: true, queryId: q.id })} className="flex items-center text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition shadow-sm">
                                                    <MessageSquare size={16} className="mr-2" /> Submit Explanation
                                                </button>
                                            )}
                                            {q.status !== 'OPEN' && (
                                                <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm text-gray-600">
                                                    <strong>Your Reply:</strong> {q.staffReply}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* APPRAISALS TAB */}
                    {activeTab === 'APPRAISALS' && (
                        <div>
                            <div className="p-5 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-semibold text-purple-800">My Performance Reviews</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {appraisals.length === 0 ? (
                                    <p className="col-span-full text-center p-8 text-gray-500">No appraisals have been conducted yet.</p>
                                ) : (
                                    appraisals.map(app => (
                                        <div key={app.id} className="border border-purple-100 bg-gradient-to-br from-white to-purple-50/50 p-5 rounded-xl shadow-sm">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-4">
                                                <h4 className="font-bold text-gray-900">{app.period}</h4>
                                                <span className={`text-lg font-black ${app.score >= 80 ? 'text-green-600' : 'text-orange-500'}`}>{app.score.toFixed(1)}%</span>
                                            </div>
                                            <p className="text-sm text-gray-600 italic">"{app.remarks}"</p>
                                            <div className="mt-4 text-xs text-gray-400 border-t pt-2">Reviewed by HR Admin</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* TRANSFERS TAB */}
                    {activeTab === 'TRANSFERS' && (
                        <div>
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-emerald-800">Branch Transfers & Redeployments</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Track your official station transfers, approval statuses, and download internal redeployment letters.</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {transfers.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400">
                                        <ArrowRightLeft className="mx-auto mb-3 text-gray-300" size={36} />
                                        <p className="font-medium text-gray-600">No transfer or redeployment records found.</p>
                                        <p className="text-xs text-gray-400 mt-1">When HR or Management initiates an internal transfer, your record and approval progress will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {transfers.map(trf => {
                                            const isApprovedOrCompleted = ['APPROVED_SCHEDULED', 'COMPLETED'].includes(trf.status);
                                            return (
                                                <div key={trf.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow transition space-y-4">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded">
                                                                    {trf.referenceNumber}
                                                                </span>
                                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                                    trf.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                                    trf.status === 'APPROVED_SCHEDULED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                                    trf.status === 'PENDING_RELEASING_MD' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                                    trf.status === 'PENDING_RECEIVING_MD' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                                                    'bg-red-100 text-red-800 border border-red-200'
                                                                }`}>
                                                                    {trf.status === 'COMPLETED' ? 'Completed & Active' :
                                                                     trf.status === 'APPROVED_SCHEDULED' ? 'Approved (Scheduled)' :
                                                                     trf.status === 'PENDING_RELEASING_MD' ? 'Awaiting Origin MD Release' :
                                                                     trf.status === 'PENDING_RECEIVING_MD' ? 'Awaiting Destination MD Intake' :
                                                                     trf.status === 'REJECTED_BY_RELEASING_MD' ? 'Declined by Origin MD' :
                                                                     trf.status === 'DECLINED_BY_RECEIVING_MD' ? 'Declined by Destination MD' : trf.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-400 mt-1">Initiated on {new Date(trf.createdAt).toLocaleDateString()}</p>
                                                        </div>

                                                        {isApprovedOrCompleted && (
                                                            <button
                                                                onClick={() => setLetterModal({ isOpen: true, transfer: trf })}
                                                                className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                                                            >
                                                                <FileText size={14} /> Official Transfer Letter
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Origin Station</p>
                                                            <div className="flex items-center gap-2">
                                                                <Building2 size={15} className="text-gray-500" />
                                                                <span className="font-bold text-gray-800">{trf.fromBranch?.name || 'N/A'}</span>
                                                            </div>
                                                            <p className="text-gray-500 mt-1">Role: <span className="font-semibold text-gray-700">{trf.previousRole?.replace(/_/g, ' ')}</span></p>
                                                        </div>

                                                        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                                                            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Destination Station</p>
                                                            <div className="flex items-center gap-2">
                                                                <Building2 size={15} className="text-emerald-700" />
                                                                <span className="font-bold text-emerald-900">{trf.toBranch?.name || 'N/A'}</span>
                                                            </div>
                                                            <p className="text-emerald-700 mt-1">Role: <span className="font-semibold text-emerald-900">{trf.newRole?.replace(/_/g, ' ')}</span></p>
                                                        </div>

                                                        <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                                                            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">Timeline & Reason</p>
                                                            <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                                                                <Calendar size={14} />
                                                                Effective: {new Date(trf.effectiveDate).toLocaleDateString()}
                                                            </div>
                                                            <p className="text-gray-600 mt-1 truncate" title={trf.reason}>Reason: {trf.reason}</p>
                                                        </div>
                                                    </div>

                                                    {trf.justification && (
                                                        <div className="text-xs bg-gray-50 p-3 rounded-lg border border-gray-100 text-gray-600">
                                                            <span className="font-semibold text-gray-700">Remarks:</span> {trf.justification}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Leave Upload Modal */}
            {showLeaveModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleApplyLeave} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 bg-indigo-50 border-b border-indigo-100">
                            <h3 className="text-lg font-bold text-indigo-900">Request Time Off</h3>
                        </div>
                        <div className="p-6 space-y-4 flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                                <select required value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5">
                                    <option value="ANNUAL">Annual Leave</option>
                                    <option value="SICK">Sick/Medical Leave</option>
                                    <option value="MATERNITY">Maternity/Paternity</option>
                                    <option value="OTHER">Other Excused Absence</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input required type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input required type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Reason</label>
                                <textarea required rows={3} value={leaveReason} onChange={e => setLeaveReason(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Please provide specific reasoning..."></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowLeaveModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">Cancel</button>
                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">Submit Request</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Query Reply Modal */}
            {replyModalData.isOpen && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={submitQueryReply} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col transform transition-all">
                        <div className="p-6 border-b border-red-100 bg-red-50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                            <h3 className="text-lg font-bold text-red-900 flex items-center">
                                <AlertTriangle size={20} className="mr-2 text-red-600" /> Official Explanation Form
                            </h3>
                            <button type="button" onClick={() => { setReplyModalData({ isOpen: false, queryId: null }); setQueryReply(''); }} className="text-red-400 hover:text-red-700 transition">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">Please provide a detailed and honest explanation regarding the disciplinary query raised against you.</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Your Defense</label>
                                <textarea required rows={5} value={queryReply} onChange={e => setQueryReply(e.target.value)} className="w-full bg-gray-50 border border-gray-300 focus:bg-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all" placeholder="Type your full, comprehensive explanation here..."></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-50 bg-gray-50 flex justify-end space-x-3">
                            <button type="button" onClick={() => { setReplyModalData({ isOpen: false, queryId: null }); setQueryReply(''); }} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all">Cancel</button>
                            <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-500/20 transition-all">
                                Submit Defense
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Transfer Letter Modal */}
            <TransferLetterModal
                isOpen={letterModal.isOpen}
                transfer={letterModal.transfer}
                onClose={() => setLetterModal({ isOpen: false, transfer: null })}
            />
        </div>
    );
};
