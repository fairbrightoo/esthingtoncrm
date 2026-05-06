import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Globe, Send, User, Search, MapPin } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const GMNetwork = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    const [directory, setDirectory] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGM, setSelectedGM] = useState<any>(null);
    const [messageInput, setMessageInput] = useState('');

    useEffect(() => {
        fetchNetworkData();
    }, [token]);

    const fetchNetworkData = async () => {
        try {
            const [dirRes, msgRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gm/network/directory`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gm/network/messages`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            // Filter out self from directory
            setDirectory(dirRes.data.filter((gm: any) => gm.id !== user?.id));
            setMessages(msgRes.data.reverse()); // Reverse to show oldest at top for chat flow
        } catch (error) {
            console.error("Failed to fetch network data", error);
            addToast("Failed to connect to GM Network", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGM || !messageInput.trim()) return;

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gm/network/messages`, {
                recipientId: selectedGM.id,
                message: messageInput
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Optimistically update
            setMessages([...messages, res.data.directMessage]);
            setMessageInput('');
            
            // Re-fetch to get populated relations
            fetchNetworkData();
        } catch (error) {
            console.error("Failed to send message", error);
            addToast("Failed to send message", 'error');
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse text-gray-500">Connecting to secure GM Network...</div>;

    const chatHistory = selectedGM ? messages.filter(m => 
        (m.senderId === user?.id && m.recipientId === selectedGM.id) || 
        (m.recipientId === user?.id && m.senderId === selectedGM.id)
    ) : [];

    return (
        <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
            <div className="mb-6 flex items-center space-x-3">
                <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                    <Globe size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">GM Network</h1>
                    <p className="text-gray-500">Secure peer-to-peer communication across the Esthington Group.</p>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex overflow-hidden">
                
                {/* Directory Sidebar */}
                <div className="w-80 border-r border-gray-100 bg-gray-50/50 flex flex-col">
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search Network..." 
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {directory.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">No other General Managers found in the network.</div>
                        ) : (
                            directory.map(gm => (
                                <button 
                                    key={gm.id}
                                    onClick={() => setSelectedGM(gm)}
                                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-white transition-colors flex items-center space-x-3 ${selectedGM?.id === gm.id ? 'bg-white border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 font-bold">
                                        {gm.fullName.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-gray-900 truncate">{gm.fullName}</h3>
                                        <p className="text-xs text-gray-500 truncate flex items-center mt-0.5">
                                            <MapPin size={10} className="mr-1" /> {gm.branch?.name || 'Head Office'}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white">
                    {selectedGM ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                        {selectedGM.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-gray-900">{selectedGM.fullName}</h2>
                                        <p className="text-xs text-gray-500">{selectedGM.company?.name} • {selectedGM.branch?.name}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                                {chatHistory.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                                        <Globe size={48} className="opacity-20" />
                                        <p>Start a secure conversation with {selectedGM.fullName.split(' ')[0]}</p>
                                    </div>
                                ) : (
                                    chatHistory.map((msg, idx) => {
                                        const isMe = msg.senderId === user?.id;
                                        return (
                                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none shadow-sm'}`}>
                                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                                    <p className={`text-[10px] mt-2 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-gray-100 bg-white">
                                <form onSubmit={handleSendMessage} className="flex space-x-2">
                                    <input 
                                        type="text"
                                        value={messageInput}
                                        onChange={e => setMessageInput(e.target.value)}
                                        placeholder="Type a secure message..."
                                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!messageInput.trim()}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center font-medium shadow-sm shadow-indigo-200"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <Globe size={40} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-500 mb-2">Select a GM to chat</h3>
                            <p className="text-sm">Connect with other General Managers across the network.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};