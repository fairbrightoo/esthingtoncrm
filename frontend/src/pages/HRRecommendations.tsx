import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Users, Send, FileText, Activity, ArrowUpCircle, XCircle, AlertTriangle, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const HRRecommendations = () => {
    const { token, user } = useAuth();
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [targetUserId, setTargetUserId] = useState('');
    const [type, setType] = useState('PROMOTION');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, [token]);

    const fetchData = async () => {
        try {
            const [recRes, usersRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gm/hr/recommendations`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/branch`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setRecommendations(recRes.data);
            // Don't let GM recommend themselves
            setStaffList(usersRes.data.filter((u: any) => u.id !== user?.id));
        } catch (error) {
            console.error("Failed to load HR recommendation data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gm/hr/recommendations`, {
                targetUserId, type, reason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("HR Recommendation dispatched successfully!");
            setTargetUserId('');
            setType('PROMOTION');
            setReason('');
            fetchData();
        } catch (error) {
            console.error("Failed to dispatch recommendation", error);
            toast.error("Failed to dispatch recommendation");
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeIcon = (t: string) => {
        switch(t) {
            case 'PROMOTION': return <ArrowUpCircle size={16} className="text-green-600 mr-2" />;
            case 'TERMINATION': return <XCircle size={16} className="text-red-600 mr-2" />;
            case 'QUERY': return <AlertTriangle size={16} className="text-amber-600 mr-2" />;
            case 'AWARD': return <Award size={16} className="text-blue-600 mr-2" />;
            default: return <FileText size={16} className="text-gray-600 mr-2" />;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Users size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">New Memo to HR</h2>
                    </div>
                    
                    <form onSubmit={handleDispatch} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Staff Member</label>
                            <select 
                                required
                                value={targetUserId}
                                onChange={e => setTargetUserId(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="" disabled>-- Select Staff --</option>
                                {staffList.map(s => (
                                    <option key={s.id} value={s.id}>{s.fullName} ({s.role.replace(/_/g, ' ')})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation Type</label>
                            <select 
                                required
                                value={type}
                                onChange={e => setType(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="PROMOTION">Recommend Promotion</option>
                                <option value="AWARD">Recommend Performance Award</option>
                                <option value="QUERY">Recommend Disciplinary Query</option>
                                <option value="TERMINATION">Recommend Termination / Firing</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Official Reason / Justification</label>
                            <textarea 
                                required
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                rows={5}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                placeholder="Detail exactly why this action is being recommended..."
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={submitting || !targetUserId}
                            className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Dispatching...' : <><Send size={18} className="mr-2" /> Send to HR Desk</>}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">HR Recommendation Log</h2>
                    <p className="text-gray-500 text-sm mt-1">History of official memos sent from your desk to Human Resources</p>
                </div>

                {loading ? (
                    <div className="text-center p-10 text-gray-500 animate-pulse">Loading HR Logs...</div>
                ) : recommendations.length === 0 ? (
                    <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center shadow-sm">
                        <Activity size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No HR memos dispatched</h3>
                        <p className="text-gray-500 mt-2">Use the panel on the left to submit an official recommendation to Branch HR.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recommendations.map(r => (
                            <div key={r.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center mb-2">
                                        {getTypeIcon(r.type)}
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {r.type.replace(/_/g, ' ')} <span className="text-gray-400 font-normal mx-2">for</span> {r.targetUser?.fullName}
                                        </h3>
                                    </div>
                                    <p className="text-gray-700 text-sm">{r.reason}</p>
                                    <p className="text-xs text-gray-500 mt-3 flex items-center">
                                        Dispatched on {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${r.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                        {r.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};