import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Send, Users, MessageCircle, User } from 'lucide-react';

export const TeamComms = () => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    
    const [team, setTeam] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // 1. Fetch Team
    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data && res.data.length > 0) {
                    setTeam(res.data[0]);
                }
            } catch (error) {
                console.error("Failed to fetch team", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTeam();
    }, [token]);

    // 2. Fetch Messages (Poll every 5s)
    useEffect(() => {
        if (!team) return;

        const fetchMessages = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams/${team.id}/messages`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(res.data);
                setTimeout(scrollToBottom, 100);
            } catch (error) {
                console.error("Failed to fetch messages", error);
            }
        };

        fetchMessages(); // Initial fetch
        const interval = setInterval(fetchMessages, 5000); // Poll every 5s
        
        return () => clearInterval(interval);
    }, [team, token]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !team) return;

        setIsSending(true);
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams/${team.id}/messages`,
                { content: newMessage },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Optimistically add message
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error("Failed to send message", error);
            addToast("Failed to send message", "error");
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) return <div className="p-6">Loading team communications...</div>;

    if (!team) return (
        <div className="p-10 text-center">
            <h2 className="text-2xl font-bold text-gray-800">No Team Assigned</h2>
            <p className="text-gray-500 mt-2">You are not currently assigned to a team. Communications are restricted.</p>
        </div>
    );

    return (
        <div className="p-6 flex flex-col h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="bg-white rounded-t-2xl shadow-sm border border-gray-200 p-4 flex justify-between items-center z-10 relative">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <MessageCircle size={20} className="mr-2 text-blue-600" />
                        {team.name} Comms
                    </h1>
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <Users size={12} className="mr-1" /> {team._count?.members || 0} Members
                    </p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-50 border-x border-gray-200 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <MessageCircle size={48} className="mb-2 opacity-50" />
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.id;
                        const sender = msg.sender || { fullName: 'Unknown User', role: 'UNKNOWN' };
                        
                        // Simple grouping to hide duplicate avatars if consecutive messages from same sender
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;

                        return (
                            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && showAvatar && (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs mr-2 flex-shrink-0">
                                        {sender.passportUrl ? (
                                            <img src={sender.passportUrl.startsWith('http') ? sender.passportUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${sender.passportUrl}`} className="w-full h-full rounded-full object-cover" alt={sender.fullName} />
                                        ) : sender.fullName.charAt(0)}
                                    </div>
                                )}
                                {!isMe && !showAvatar && <div className="w-8 mr-2 flex-shrink-0"></div>}
                                
                                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                    {!isMe && showAvatar && (
                                        <div className="flex items-baseline space-x-2 mb-1">
                                            <span className="text-xs font-semibold text-gray-700">{sender.fullName}</span>
                                            <span className="text-[10px] text-gray-400">{sender.role.replace('_', ' ')}</span>
                                        </div>
                                    )}
                                    <div 
                                        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                                            isMe 
                                                ? 'bg-blue-600 text-white rounded-tr-sm' 
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    </div>
                                    <span className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border border-gray-200 rounded-b-2xl p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message to the team..." 
                        className="flex-1 border border-gray-200 bg-gray-50 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                        disabled={isSending}
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim() || isSending}
                        className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center w-12 h-12"
                    >
                        <Send size={18} className={newMessage.trim() ? "translate-x-0.5" : ""} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TeamComms;
