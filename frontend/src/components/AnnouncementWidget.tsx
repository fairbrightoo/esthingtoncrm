import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, AlertTriangle, ChevronRight, X } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: string;
    createdAt: string;
    isGlobalBroadcast?: boolean;
    author: {
        fullName: string;
        role: string;
    };
}

export const AnnouncementWidget = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMemo, setSelectedMemo] = useState<Announcement | null>(null);

    useEffect(() => {
        const fetchAnnouncements = async () => {
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
        fetchAnnouncements();
    }, []);

    if (isLoading) return null; // Or a subtle skeleton
    if (announcements.length === 0) return null; // Don't show the widget if there are no memos

    // Show latest 3 memos on the widget, let users click to read more
    const recentMemos = announcements.slice(0, 3);

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-6 shadow-sm mb-8 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute right-0 top-0 -mt-10 -mr-10 opacity-5 transform rotate-12 pointer-events-none">
                <Megaphone size={160} />
            </div>

            <div className="flex items-center space-x-3 mb-6 relative z-10">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                    <Megaphone size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Notice Board</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {recentMemos.map((memo) => (
                    <button
                        key={memo.id}
                        onClick={() => setSelectedMemo(memo)}
                        className={`text-left bg-white rounded-xl p-5 shadow-sm border ${memo.isGlobalBroadcast ? 'border-indigo-400 shadow-indigo-100' : memo.priority === 'HIGH' ? 'border-red-200' : 'border-gray-100'} hover:shadow-md hover:-translate-y-0.5 transition-all group relative overflow-hidden`}
                    >
                        {memo.isGlobalBroadcast && (
                            <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                                <div className="absolute transform rotate-45 bg-indigo-600 text-white text-[9px] font-black tracking-widest py-1 right-[-35px] top-[15px] w-[120px] text-center shadow-sm">
                                    GLOBAL
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-2 hidden md:hidden">
                           {/* Hidden element to maintain flex consistency if needed */}
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-md">
                                {new Date(memo.createdAt).toLocaleDateString()}
                            </span>
                            {memo.priority === 'HIGH' && !memo.isGlobalBroadcast && (
                                <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center">
                                    <AlertTriangle size={10} className="mr-1" /> Urgent
                                </span>
                            )}
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                            {memo.title}
                        </h3>
                        <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                            {memo.content}
                        </p>
                        <div className="mt-4 flex items-center text-blue-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Read full memo <ChevronRight size={14} className="ml-1" />
                        </div>
                    </button>
                ))}
            </div>

            {/* Read Modal */}
            {selectedMemo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                        onClick={() => setSelectedMemo(null)}
                    ></div>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
                        <div className={`px-8 py-6 border-b flex justify-between items-start ${selectedMemo.isGlobalBroadcast ? 'bg-indigo-50/50 border-indigo-100' : selectedMemo.priority === 'HIGH' ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-100'}`}>
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedMemo.title}</h2>
                                    {selectedMemo.isGlobalBroadcast ? (
                                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase flex items-center shadow-sm border border-indigo-200">
                                            <Megaphone size={12} className="mr-1" /> Global
                                        </span>
                                    ) : selectedMemo.priority === 'HIGH' && (
                                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase flex items-center">
                                            <AlertTriangle size={12} className="mr-1" /> Urgent
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 font-medium">
                                    From {selectedMemo.author.fullName} ({selectedMemo.author.role.replace(/_/g, ' ')}) • {new Date(selectedMemo.createdAt).toLocaleString()}
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedMemo(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-8 py-8">
                            <div className="prose prose-blue max-w-none">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                                    {selectedMemo.content}
                                </p>
                            </div>
                        </div>
                        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button 
                                onClick={() => setSelectedMemo(null)}
                                className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors text-sm shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
