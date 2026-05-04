import React, { useState, useEffect } from 'react';
import { MessageCircle, Settings, Plus, Search, Filter, AlertTriangle, CheckCircle, X, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const HelpdeskTickets = () => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [tickets, setTickets] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL', leadId: '' });
    const [submitting, setSubmitting] = useState(false);
    
    const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false);
    const [leadSearch, setLeadSearch] = useState('');

    const fetchTicketsAndLeads = async () => {
        try {
            const [ticketsRes, leadsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setTickets(ticketsRes.data);
            setLeads(leadsRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicketsAndLeads();
    }, [token]);

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tickets`, newTicket, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Ticket created successfully!", "success");
            setIsCreateModalOpen(false);
            setNewTicket({ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL', leadId: '' });
            fetchTicketsAndLeads();
        } catch (error) {
            addToast("Failed to create ticket", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tickets/${id}`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Ticket status updated", "success");
            fetchTicketsAndLeads();
        } catch (error) {
            addToast("Failed to update status", "error");
        }
    };

    const stats = {
        highPriority: tickets.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length,
        open: tickets.filter(t => t.status === 'OPEN').length,
        inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        resolved: tickets.filter(t => t.status === 'RESOLVED').length
    };

    const filteredTickets = tickets.filter(t => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.lead?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MessageCircle className="text-blue-600" />
                        Helpdesk & Support Tickets
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage client complaints, requests, and inquiries in a centralized queue.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition flex items-center gap-2"
                    >
                        <Plus size={18} /> New Ticket
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                 <div className="bg-red-50 text-red-700 p-4 rounded-xl shadow-sm border border-red-100 flex flex-col">
                    <span className="text-xs font-bold uppercase mb-1">High Priority</span>
                    <span className="text-3xl font-black">{stats.highPriority}</span>
                 </div>
                 <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl shadow-sm border border-yellow-100 flex flex-col">
                    <span className="text-xs font-bold uppercase mb-1">Open Tickets</span>
                    <span className="text-3xl font-black">{stats.open}</span>
                 </div>
                 <div className="bg-blue-50 text-blue-700 p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col">
                    <span className="text-xs font-bold uppercase mb-1">In Progress</span>
                    <span className="text-3xl font-black">{stats.inProgress}</span>
                 </div>
                 <div className="bg-green-50 text-green-700 p-4 rounded-xl shadow-sm border border-green-100 flex flex-col">
                    <span className="text-xs font-bold uppercase mb-1">Resolved</span>
                    <span className="text-3xl font-black">{stats.resolved}</span>
                 </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search tickets or clients..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-64 text-sm"
                        />
                    </div>
                    <button className="flex items-center gap-2 text-gray-500 text-sm font-medium hover:text-gray-800 px-3 py-1 bg-white border rounded">
                        <Filter size={14} /> Filter
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-gray-400">Loading tickets...</div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 text-center relative overflow-hidden h-full">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative mb-4 z-10 w-16 h-16 flex items-center justify-center text-blue-500">
                                <MessageCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 z-10">Inbox Zero</h3>
                            <p className="text-gray-500 mt-2 max-w-sm z-10">No active helpdesk tickets. Your support queue is completely clear!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredTickets.map(ticket => (
                                <div key={ticket.id} className="p-4 hover:bg-gray-50 transition flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                        {ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? (
                                            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                                <AlertTriangle size={18} />
                                            </div>
                                        ) : ticket.status === 'RESOLVED' ? (
                                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                                <CheckCircle size={18} />
                                            </div>
                                        ) : (
                            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <MessageCircle size={18} />
                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-bold text-gray-900 truncate">{ticket.title}</h4>
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-200 text-gray-600">{ticket.category}</span>
                                            {ticket.priority === 'HIGH' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-600">HIGH PRIORITY</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mb-1">{ticket.description}</p>
                                        <div className="text-xs text-gray-400 flex items-center gap-2">
                                            <span>Client: <span className="font-medium text-gray-600">{ticket.lead?.fullName || 'N/A'}</span></span>
                                            <span>•</span>
                                            <span>Agent: {ticket.creator?.fullName}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                        <select 
                                            value={ticket.status}
                                            onChange={(e) => updateStatus(ticket.id, e.target.value)}
                                            className={`text-xs font-bold rounded px-2 py-1 outline-none cursor-pointer border ${
                                                ticket.status === 'OPEN' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                ticket.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-green-50 text-green-700 border-green-200'
                                            }`}
                                        >
                                            <option value="OPEN">OPEN</option>
                                            <option value="IN_PROGRESS">IN PROGRESS</option>
                                            <option value="RESOLVED">RESOLVED</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Ticket Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleCreateTicket} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-800">New Helpdesk Ticket</h2>
                            <button type="button" onClick={() => setIsCreateModalOpen(false)}>
                                <X size={20} className="text-gray-400 hover:text-gray-700" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Client / Lead (Optional)</label>
                                <div 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer flex justify-between items-center"
                                    onClick={() => setIsLeadDropdownOpen(!isLeadDropdownOpen)}
                                >
                                    <span className={newTicket.leadId ? "text-gray-900 font-medium" : "text-gray-500"}>
                                        {newTicket.leadId && leads.find(l => l.id === newTicket.leadId) 
                                            ? `${leads.find(l => l.id === newTicket.leadId)?.fullName} (${leads.find(l => l.id === newTicket.leadId)?.phone})` 
                                            : '-- General / Internal --'}
                                    </span>
                                    <ChevronDown size={16} className="text-gray-400" />
                                </div>
                                
                                {isLeadDropdownOpen && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 flex flex-col">
                                        <div className="p-2 border-b border-gray-100">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
                                                <input 
                                                    type="text" 
                                                    autoFocus
                                                    placeholder="Search name or phone..." 
                                                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    value={leadSearch}
                                                    onChange={e => setLeadSearch(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto">
                                            <div 
                                                className="px-3 py-2.5 text-sm hover:bg-blue-50 cursor-pointer text-gray-500 transition-colors"
                                                onClick={() => { setNewTicket({...newTicket, leadId: ''}); setIsLeadDropdownOpen(false); setLeadSearch(''); }}
                                            >
                                                -- General / Internal --
                                            </div>
                                            {leads.filter(l => l.fullName.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone?.includes(leadSearch)).map(lead => (
                                                <div 
                                                    key={lead.id}
                                                    className="px-3 py-2.5 text-sm hover:bg-blue-50 cursor-pointer text-gray-800 transition-colors border-t border-gray-50"
                                                    onClick={() => { setNewTicket({...newTicket, leadId: lead.id}); setIsLeadDropdownOpen(false); setLeadSearch(''); }}
                                                >
                                                    <span className="font-bold">{lead.fullName}</span> 
                                                    <span className="text-gray-400 text-xs ml-2">{lead.phone}</span>
                                                </div>
                                            ))}
                                            {leads.filter(l => l.fullName.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone?.includes(leadSearch)).length === 0 && (
                                                <div className="px-3 py-4 text-center text-sm text-gray-400">No matching clients found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subject / Title</label>
                                <input required type="text" value={newTicket.title} onChange={e => setNewTicket({...newTicket, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Missing receipt for initial deposit" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                                <textarea required rows={3} value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Details about the issue..."></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Priority</label>
                                    <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent!</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                                    <select value={newTicket.category} onChange={e => setNewTicket({...newTicket, category: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                        <option value="GENERAL">General Support</option>
                                        <option value="BILLING">Billing & Refunds</option>
                                        <option value="TECHNICAL">Technical Issue</option>
                                        <option value="SALES">Sales Inquiry</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                            <button type="submit" disabled={submitting} className={`px-6 py-2 rounded-lg text-white font-bold transition shadow-md ${submitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                {submitting ? 'Creating...' : 'Create Ticket'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
