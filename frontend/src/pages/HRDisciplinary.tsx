import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FileText, Send, UserX, AlertTriangle, CheckCircle, Search, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const HRDisciplinary = () => {
    const { addToast } = useToast();
    const [queries, setQueries] = useState<any[]>([]);
    const [branchStaff, setBranchStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [viewReplyModal, setViewReplyModal] = useState<{isOpen: boolean, replyText: string}>({isOpen: false, replyText: ''});
    const [resolveModal, setResolveModal] = useState<{isOpen: boolean, queryId: string | null}>({isOpen: false, queryId: null});
    
    // New Query Form
    const [targetStaffId, setTargetStaffId] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('MEDIUM');

    useEffect(() => {
        fetchQueries();
        fetchBranchStaff();
    }, []);

    const fetchQueries = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/queries/branch-queries`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQueries(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch queries', error);
            setLoading(false);
        }
    };

    const fetchBranchStaff = async () => {
        try {
            const token = localStorage.getItem('token');
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const coId = userData.companyId || userData.company?.id;
            const brId = userData.branchId || userData.branch?.id;
            
            if (coId && brId) {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${coId}/branches/${brId}/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBranchStaff(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch branch staff', error);
        }
    };

    const handleIssueQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/queries`, {
                staffId: targetStaffId, subject, description, severity
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            addToast('Disciplinary Query issued successfully.', 'success');
            setShowModal(false);
            setSubject(''); setDescription(''); setTargetStaffId('');
            fetchQueries();
        } catch (error) {
            addToast('Failed to issue query', 'error');
        }
    };

    const handleResolve = async () => {
        const queryId = resolveModal.queryId;
        if (!queryId) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/queries/${queryId}/resolve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('Query resolved successfully.', 'success');
            setResolveModal({isOpen: false, queryId: null});
            fetchQueries();
        } catch (error) {
            addToast('Failed to resolve query', 'error');
        }
    };

    const getSeverityBadge = (level: string) => {
        if(level === 'HIGH') return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold tracking-wide">HIGH SEVERITY</span>;
        if(level === 'MEDIUM') return <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-bold tracking-wide">MEDIUM</span>;
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold tracking-wide">LOW</span>;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-red-50 rounded-lg text-red-600">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Disciplinary Tracker</h1>
                        <p className="text-gray-500 text-sm">Issue and resolve official queries for branch staff</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                >
                    <UserX size={18} />
                    <span>Issue Query</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Loading queries...</div>
                ) : queries.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                        <FileText size={48} className="text-gray-300 mb-4" />
                        <p>No disciplinary queries found in this branch.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">To Staff</th>
                                    <th className="px-6 py-4 font-medium w-1/4">Subject & Severity</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {queries.map((q) => (
                                    <tr key={q.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {new Date(q.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{q.staff?.fullName}</p>
                                            <p className="text-xs text-gray-500">{q.staff?.role?.replace('_', ' ')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-800">{q.subject}</p>
                                            <div className="mt-1">{getSeverityBadge(q.severity)}</div>
                                            <p className="text-xs text-gray-500 mt-2 truncate" title={q.description}>{q.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                                q.status === 'OPEN' ? 'bg-red-50 text-red-700 border-red-200' :
                                                q.status === 'ANSWERED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-green-50 text-green-700 border-green-200'
                                            }`}>
                                                {q.status}
                                            </span>
                                            {q.status === 'ANSWERED' && (
                                                <p className="text-xs mt-2 text-indigo-600 hover:text-indigo-800 transition-colors hover:underline cursor-pointer font-bold inline-flex items-center" onClick={() => setViewReplyModal({ isOpen: true, replyText: q.staffReply })}>
                                                    View Reply
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {q.status !== 'RESOLVED' && (
                                                <button onClick={() => setResolveModal({isOpen: true, queryId: q.id})} className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                                                    Mark Resolved
                                                </button>
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
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleIssueQuery} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Issue Disciplinary Query</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Staff Member</label>
                                <select required value={targetStaffId} onChange={e => setTargetStaffId(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5">
                                    <option value="">-- Select Staff --</option>
                                    {branchStaff.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Query Subject</label>
                                <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Unexcused Absence" className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Severity Level</label>
                                <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5">
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
                                <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide full context for this query..." className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5"></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button type="submit" className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 shadow-sm">
                                <Send size={16} className="mr-2" /> Send Query
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* View Reply Modal */}
            {viewReplyModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col transform transition-all overflow-hidden">
                        <div className="p-6 border-b border-indigo-100 bg-indigo-50 flex justify-between items-center text-indigo-900">
                            <h3 className="text-lg font-bold flex items-center">
                                <AlertTriangle size={20} className="mr-2 text-indigo-600" /> Staff Explanation
                            </h3>
                            <button type="button" onClick={() => setViewReplyModal({ isOpen: false, replyText: '' })} className="text-indigo-400 hover:text-indigo-700 transition">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-8 bg-white min-h-[150px]">
                            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap font-medium italic">"{viewReplyModal.replyText}"</p>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button type="button" onClick={() => setViewReplyModal({ isOpen: false, replyText: '' })} className="px-6 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-all shadow-sm">
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolve Confirmation Modal */}
            {resolveModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col transform transition-all overflow-hidden text-center p-6">
                        <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Resolve Query?</h3>
                        <p className="text-sm text-gray-500 mb-6">Are you sure you want to officially mark this disciplinary action as resolved? This action will formally close the case.</p>
                        <div className="flex space-x-3 w-full">
                            <button onClick={() => setResolveModal({isOpen: false, queryId: null})} className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all">Cancel</button>
                            <button onClick={handleResolve} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm shadow-green-500/20 rounded-xl transition-all">Yes, Resolve</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
