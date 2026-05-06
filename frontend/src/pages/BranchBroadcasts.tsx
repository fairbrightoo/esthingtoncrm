import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Send, Clock, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const BranchBroadcasts = () => {
    const { token } = useAuth();
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchBroadcasts();
    }, [token]);

    const fetchBroadcasts = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gm/broadcasts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBroadcasts(res.data);
        } catch (error) {
            console.error("Failed to fetch broadcasts", error);
            toast.error("Failed to load broadcasts");
        } finally {
            setLoading(false);
        }
    };

    const handleDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gm/broadcasts`, {
                title, content
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Broadcast dispatched successfully!");
            setTitle('');
            setContent('');
            fetchBroadcasts();
        } catch (error) {
            console.error("Failed to dispatch broadcast", error);
            toast.error("Failed to dispatch broadcast");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Megaphone size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">New Broadcast</h2>
                    </div>
                    
                    <form onSubmit={handleDispatch} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject / Title</label>
                            <input 
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                placeholder="e.g. Mandatory Saturday Operation"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea 
                                required
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={6}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none"
                                placeholder="Type your broadcast message to the branch here..."
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full flex items-center justify-center py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Dispatching...' : <><Send size={18} className="mr-2" /> Dispatch Now</>}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dispatch History</h2>
                    <p className="text-gray-500 text-sm mt-1">Recent broadcasts sent from your desk</p>
                </div>

                {loading ? (
                    <div className="text-center p-10 text-gray-500 animate-pulse">Loading history...</div>
                ) : broadcasts.length === 0 ? (
                    <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center shadow-sm">
                        <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No broadcasts yet</h3>
                        <p className="text-gray-500 mt-2">Use the panel on the left to dispatch your first message to the branch.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {broadcasts.map(b => (
                            <div key={b.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">{b.title}</h3>
                                    <span className="flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                                        <Clock size={12} className="mr-1" />
                                        {new Date(b.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{b.content}</p>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                        Sent by {b.author?.fullName}
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