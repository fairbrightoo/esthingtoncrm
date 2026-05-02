import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: string;
    createdAt: string;
    author: {
        id: string;
        fullName: string;
        role: string;
    };
}

export const Announcements = () => {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isCreating, setIsCreating] = useState(false);
    const [toastError, setToastError] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newPriority, setNewPriority] = useState('NORMAL');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchAnnouncements = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/announcements`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setAnnouncements(res.data);
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/announcements`, {
                title: newTitle,
                content: newContent,
                priority: newPriority
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setIsCreating(false);
            setNewTitle('');
            setNewContent('');
            setNewPriority('NORMAL');
            fetchAnnouncements();
        } catch (error) {
            console.error('Failed to create announcement:', error);
            setToastError(error.response?.data?.error || 'Broadcast failed. Please check your network and try again.');
            
            // Auto hide error after 5 seconds
            setTimeout(() => setToastError(null), 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this announcement?")) return;
        setDeletingId(id);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/announcements/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchAnnouncements();
        } catch (error) {
            console.error('Failed to delete announcement:', error);
            window.alert('Authorization failed: You do not have permission to delete this.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <Megaphone className="mr-3 text-blue-600" size={32} />
                        Internal Announcements
                    </h1>
                    <p className="text-gray-500 mt-2">Manage company-wide internal memos and broadcasts.</p>
                </div>
                {(user?.role === 'BRANCH_HR' || user?.role === 'SUPER_ADMIN' || user?.role === 'BRANCH_ADMIN') && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        <span>Create Announcement</span>
                    </button>
                )}
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">New Memo</h2>
                        <button type="button" onClick={() => { setIsCreating(false); setToastError(null); }} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
                    </div>

                    {toastError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start space-x-3 text-sm animate-in fade-in slide-in-from-top-2 border border-red-100">
                            <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                            <div>
                                <span className="font-semibold block">Broadcast Failed</span>
                                {toastError}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            required
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g., Q3 Performance Review Schedule"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                        <textarea
                            required
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            rows={4}
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="Write your announcement here..."
                        />
                    </div>

                    <div className="flex items-center space-x-6">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="priority"
                                value="NORMAL"
                                checked={newPriority === 'NORMAL'}
                                onChange={() => setNewPriority('NORMAL')}
                                className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-700">Normal Priority</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="priority"
                                value="HIGH"
                                checked={newPriority === 'HIGH'}
                                onChange={() => setNewPriority('HIGH')}
                                className="text-red-500 focus:ring-red-500 w-4 h-4"
                            />
                            <span className="text-sm font-medium text-red-600 flex items-center"><AlertTriangle size={14} className="mr-1" /> High Priority / Urgent</span>
                        </label>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Broadcasting...' : 'Broadcast Memo'}
                        </button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : announcements.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                    <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900">No Announcements Yet</h3>
                    <p className="text-gray-500 mt-2">When you broadcast a new memo, it will appear here and on the main dashboards.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((announcement) => (
                        <div
                            key={announcement.id}
                            className={`bg-white rounded-2xl p-6 shadow-sm border-l-4 ${announcement.priority === 'HIGH' ? 'border-l-red-500' : 'border-l-blue-500'} flex justify-between items-start transition-all hover:shadow-md`}
                        >
                            <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                    <h3 className="text-xl font-semibold text-gray-900">{announcement.title}</h3>
                                    {announcement.priority === 'HIGH' && (
                                        <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide flex items-center">
                                            <AlertTriangle size={12} className="mr-1" /> Urgent
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
                                <div className="mt-4 flex items-center text-sm text-gray-400 space-x-4">
                                    <span>By {announcement.author?.fullName} ({announcement.author?.role})</span>
                                    <span>•</span>
                                    <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            {(announcement.author?.id === user?.id || user?.role === 'SUPER_ADMIN' || user?.role === 'BRANCH_ADMIN') && (
                                <button
                                    onClick={() => handleDelete(announcement.id)}
                                    disabled={deletingId === announcement.id}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-4"
                                    title="Delete Announcement"
                                >
                                    {deletingId === announcement.id ? (
                                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 size={20} />
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
