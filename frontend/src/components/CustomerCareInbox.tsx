import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader2, Send, BotOff, Percent, User, Phone, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const CustomerCareInbox = () => {
    const { token } = useAuth();
    const { toast } = useToast();
    
    const [leads, setLeads] = useState<any[]>([]);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [messageDraft, setMessageDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchLeads = async () => {
        setIsLoadingLeads(true);
        try {
            // Fetch all leads (In a real scenario, you'd filter by branch/company which backend handles)
            const res = await axios.get('http://localhost:3000/api/leads?status=ALL', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Let's filter to those likely using WA (For MVP, just show all leads, sort by Recency)
            setLeads(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load inbox contacts");
        } finally {
            setIsLoadingLeads(false);
        }
    };

    const fetchLogs = async (leadId: string) => {
        setIsLoadingLogs(true);
        try {
            const res = await axios.get(`http://localhost:3000/api/communications/leads/${leadId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Reverse logs so oldest is at top, newest at bottom
            setLogs(res.data.reverse());
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (token) fetchLeads();
    }, [token]);

    useEffect(() => {
        if (selectedLead) {
            fetchLogs(selectedLead.id);
            // Polling for real-time feel (optional for MVP, but good for WA chat)
            const interval = setInterval(() => fetchLogs(selectedLead.id), 10000);
            return () => clearInterval(interval);
        }
    }, [selectedLead, token]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageDraft.trim() || !selectedLead) return;
        setIsSending(true);

        try {
            await axios.post('http://localhost:3000/api/communications/send', {
                leadId: selectedLead.id,
                type: 'WHATSAPP',
                content: messageDraft
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setMessageDraft('');
            await fetchLogs(selectedLead.id);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to send message");
        } finally {
            setIsSending(false);
        }
    };

    const handleTakeover = async () => {
        if (!selectedLead) return;
        try {
            await axios.put(`http://localhost:3000/api/leads/${selectedLead.id}`, {
                status: 'CONTACTED' // Disables AI Concierge safely
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success("Lead manually taken over. AI deactivated.");
            setSelectedLead({ ...selectedLead, status: 'CONTACTED' });
            
            // Re-fetch leads list to update status pill
            fetchLeads();
        } catch (error) {
            toast.error("Failed to take over lead");
        }
    };

    const handleSendPromo = async () => {
        if (!selectedLead) return;
        setIsSending(true);
        try {
            const promoMessage = `🎁 Special Offer! Use code ESTHINGTON5 for an instant 5% discount on your initial deposit if you secure your plot this week. Can I assist you with the paperwork?`;
            await axios.post('http://localhost:3000/api/communications/send', {
                leadId: selectedLead.id,
                type: 'WHATSAPP',
                content: promoMessage
            }, { headers: { Authorization: `Bearer ${token}` } });
            await fetchLogs(selectedLead.id);
            toast.success("Discount promotion sent!");
        } catch (error: any) {
            const serverMsg = error.response?.data?.error || "Failed to send promo";
            toast.error(serverMsg);
        } finally {
            setIsSending(false);
        }
    };

    const filteredLeads = leads.filter(l => 
        l.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        l.phone.includes(searchQuery)
    );

    return (
        <div className="flex bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden h-[800px] mb-8">
            
            {/* LEFT SIDEBAR - Contacts list */}
            <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/50">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-black text-gray-800 mb-4 tracking-tight">Omnichannel Inbox</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search names or numbers..." 
                            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto div-scrollbar p-2">
                    {isLoadingLeads ? (
                        <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-purple-600" /></div>
                    ) : (
                        filteredLeads.map(lead => (
                            <div 
                                key={lead.id} 
                                onClick={() => setSelectedLead(lead)}
                                className={`p-4 mx-2 my-1.5 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${selectedLead?.id === lead.id ? 'bg-purple-600 text-white shadow-md transform scale-[1.02]' : 'hover:bg-white border border-transparent hover:border-gray-200 text-gray-700'}`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0 ${selectedLead?.id === lead.id ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-purple-700'}`}>
                                    {lead.fullName.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-bold truncate">{lead.fullName}</p>
                                        {lead.status === 'PROSPECT' && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide ${selectedLead?.id === lead.id ? 'bg-white/30' : 'bg-emerald-100 text-emerald-700'}`}>
                                                AI ACTIVE
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs truncate opacity-80 flex items-center`}>
                                        <Phone size={12} className="mr-1 opacity-70" /> {lead.phone}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL - Chat View */}
            <div className="w-2/3 flex flex-col bg-slate-50 relative">
                {selectedLead ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm z-10">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
                                    {selectedLead.fullName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-800 text-lg tracking-tight">{selectedLead.fullName}</h3>
                                    <p className="text-sm text-gray-500 flex items-center font-medium">
                                        {selectedLead.phone}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex space-x-3">
                                <button 
                                    onClick={handleSendPromo}
                                    disabled={isSending}
                                    className="px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-sm font-bold flex items-center hover:bg-pink-100 transition-colors shadow-sm"
                                    title="Send a 5% Discount Offer"
                                >
                                    <Percent size={16} className="mr-1.5" /> Drop Promo
                                </button>
                                
                                {selectedLead.status === 'PROSPECT' ? (
                                    <button 
                                        onClick={handleTakeover}
                                        className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center hover:bg-black transition-colors shadow-sm"
                                    >
                                        <BotOff size={16} className="mr-1.5" /> Take Over Chat
                                    </button>
                                ) : (
                                    <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold flex items-center border border-emerald-100 shadow-sm">
                                        <CheckCircle2 size={16} className="mr-1.5" /> Active Client
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {isLoadingLogs ? (
                                <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-purple-600" /></div>
                            ) : logs.length === 0 ? (
                                <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <Send size={32} className="text-gray-300 ml-1" />
                                    </div>
                                    <p className="font-semibold text-lg text-gray-500">No communication history</p>
                                    <p className="text-sm mt-1">Send a message to start the conversation.</p>
                                </div>
                            ) : (
                                logs.map((log: any) => {
                                    const isOutbound = log.direction === 'OUTBOUND';
                                    return (
                                        <div key={log.id} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[75%] px-6 py-4 rounded-3xl shadow-sm text-sm ${isOutbound ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                                                <p className="whitespace-pre-wrap leading-relaxed">{log.content}</p>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2 font-medium tracking-wide px-2 uppercase">
                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.type}
                                            </p>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input Box */}
                        <div className="bg-white p-6 border-t border-gray-100">
                            <form onSubmit={handleSendMessage} className="flex relative">
                                <textarea
                                    className="w-full bg-gray-50 border-0 rounded-2xl py-4 pl-6 pr-24 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none header-scrollbar transition-shadow"
                                    placeholder={selectedLead.status === 'PROSPECT' ? "⚠️ The AI is currently managing this lead. Take over to chat manually!" : "Type a WhatsApp message..."}
                                    rows={2}
                                    value={messageDraft}
                                    onChange={(e) => setMessageDraft(e.target.value)}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter' && !e.shiftKey) { 
                                            e.preventDefault(); 
                                            handleSendMessage(e); 
                                        } 
                                    }}
                                />
                                <div className="absolute right-3 top-3">
                                    <button 
                                        type="submit" 
                                        disabled={isSending || !messageDraft.trim()} 
                                        className="w-12 h-12 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
                                    </button>
                                </div>
                            </form>
                            <p className="text-xs text-gray-400 mt-3 pl-4 flex items-center">
                                Press Enter to send quickly. WhatsApp API will handle delivery.
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-gray-400">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <Phone size={48} className="text-gray-300" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-500 mb-2">Select a Lead</h2>
                        <p className="text-gray-400 font-medium max-w-sm text-center leading-relaxed">Choose a conversation from the sidebar to view communication history and take over AI chats.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
