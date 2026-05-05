import { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, AlertTriangle, Search, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ArchiveItem {
    id: string;
    title: string;
    content: string;
    priority: string;
    createdAt: string;
    readAt: string;
    isGlobalBroadcast: boolean;
    author: {
        fullName: string;
        role: string;
    };
}

export const NoticeArchive = () => {
    const { token } = useAuth();
    const [archive, setArchive] = useState<ArchiveItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    useEffect(() => {
        const fetchArchive = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/announcements/archive`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setArchive(res.data);
            } catch (error) {
                console.error('Failed to load notice archive', error);
            } finally {
                setLoading(false);
            }
        };
        fetchArchive();
    }, [token]);

    const filteredArchive = archive.filter(item => {
        if (filterType === 'GLOBAL' && !item.isGlobalBroadcast) return false;
        if (filterType === 'COMPANY' && item.isGlobalBroadcast) return false;
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query);
        }
        return true;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
            <header className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-8 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Megaphone size={120} />
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight">Notice Archive</h1>
                    <p className="mt-2 text-blue-100 max-w-xl">
                        A permanent record of all the company announcements and global broadcasts you have acknowledged.
                    </p>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search notices by keyword..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <Filter className="text-gray-400" size={18} />
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full sm:w-48 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="ALL">All Notices</option>
                            <option value="GLOBAL">Global Chairman Only</option>
                            <option value="COMPANY">Company HR Only</option>
                        </select>
                    </div>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredArchive.length === 0 ? (
                        <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl">
                            <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-700 mb-2">No archived notices found</h3>
                            <p>You have not acknowledged any notices yet, or no notices match your search.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredArchive.map((memo) => (
                                <div key={memo.id} className={`border p-6 rounded-xl relative overflow-hidden transition-all hover:shadow-md ${memo.isGlobalBroadcast ? 'border-indigo-200 bg-indigo-50/10' : 'border-gray-200 bg-white'}`}>
                                    {memo.isGlobalBroadcast && (
                                        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                                            <div className="absolute transform rotate-45 bg-indigo-600 text-white text-[9px] font-black tracking-widest py-1 right-[-35px] top-[15px] w-[120px] text-center shadow-sm">
                                                GLOBAL
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                                        <div>
                                            <div className="flex items-center space-x-3 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900">{memo.title}</h3>
                                                {memo.priority === 'HIGH' && !memo.isGlobalBroadcast && (
                                                    <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center">
                                                        <AlertTriangle size={10} className="mr-1" /> Urgent
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                From <span className="font-semibold text-gray-700">{memo.author.fullName}</span> ({memo.author.role.replace(/_/g, ' ')})
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 px-2.5 py-1 rounded-md inline-block">
                                                Dispatched: {new Date(memo.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Read: {new Date(memo.readAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="prose prose-sm max-w-none mt-4 border-t border-gray-100 pt-4">
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {memo.content}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
