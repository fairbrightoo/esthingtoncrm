import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Send, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export const ExecutiveMemos = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    
    const [memos, setMemos] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT'>('INBOX');
    const [showCompose, setShowCompose] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ isOpen: boolean, memoId: string, status: 'APPROVED' | 'DECLINED' | null }>({ isOpen: false, memoId: '', status: null });
    
    const [formData, setFormData] = useState<{ subject: string, message: string, recipientIds: string[] }>({ subject: '', message: '', recipientIds: [] });
    const [processing, setProcessing] = useState(false);
    
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    const isGmd = user?.role === 'GROUP_MANAGING_DIRECTOR';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [memosRes, contactsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/memos`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/memos/contacts`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setMemos(memosRes.data);
            setContacts(contactsRes.data);
        } catch (error) {
            addToast('Failed to load memos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMemo = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/memos`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('Memo sent successfully', 'success');
            setShowCompose(false);
            setFormData({ subject: '', message: '', recipientIds: [] });
            setDropdownOpen(false);
            fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to send memo', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleRespond = async () => {
        const { memoId, status } = confirmAction;
        if (!memoId || !status) return;
        
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/memos/${memoId}/respond`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast(`Memo marked as ${status}`, 'success');
            setConfirmAction({ isOpen: false, memoId: '', status: null });
            fetchData();
        } catch (error) {
            addToast('Failed to update memo', 'error');
            setConfirmAction({ isOpen: false, memoId: '', status: null });
        }
    };

    const inboxMemos = memos.filter(m => m.recipientId === user?.id);
    const sentMemos = memos.filter(m => m.senderId === user?.id);
    
    const displayMemos = activeTab === 'INBOX' ? inboxMemos : sentMemos;

    const availableRoles = ['ALL', ...Array.from(new Set(contacts.map(c => c.role)))];
    const filteredContacts = roleFilter === 'ALL' ? contacts : contacts.filter(c => c.role === roleFilter);

    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /></div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Executive Memos</h1>
                    <p className="text-gray-500 mt-1">Official communication channel for Director-level authorization.</p>
                </div>
                <button onClick={() => setShowCompose(true)} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm">
                    <Send size={18} />
                    <span>Compose Memo</span>
                </button>
            </header>

            {/* Compose Modal */}
            {showCompose && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center"><FileText className="mr-2 text-blue-600" /> New Executive Memo</h2>
                            <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={(e) => {
                            if (formData.recipientIds.length === 0) {
                                e.preventDefault();
                                addToast('Please select at least one recipient', 'error');
                                return;
                            }
                            handleSendMemo(e);
                        }} className="space-y-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                
                                {/* Selected Chips */}
                                {formData.recipientIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.recipientIds.map(id => {
                                            const contact = contacts.find(c => c.id === id);
                                            if (!contact) return null;
                                            return (
                                                <div key={id} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center text-sm border border-blue-100">
                                                    <span className="truncate max-w-[150px]">{contact.fullName}</span>
                                                    <button type="button" onClick={() => setFormData({...formData, recipientIds: formData.recipientIds.filter(rid => rid !== id)})} className="ml-2 hover:text-blue-900">&times;</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Dropdown Trigger */}
                                <div 
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg flex justify-between items-center cursor-pointer bg-white"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                >
                                    <span className={formData.recipientIds.length === 0 ? "text-gray-400" : "text-gray-700"}>
                                        {formData.recipientIds.length === 0 ? 'Select Recipients...' : `${formData.recipientIds.length} recipient(s) selected`}
                                    </span>
                                    <span className={`text-gray-400 transform transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                                </div>

                                {/* Dropdown Content */}
                                {dropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg flex flex-col" style={{ maxHeight: '350px' }}>
                                        {/* Filter Header */}
                                        <div className="p-3 bg-gray-50 border-b flex space-x-2 overflow-x-auto rounded-t-xl" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                            {availableRoles.map(role => (
                                                <button 
                                                    key={role} 
                                                    type="button" 
                                                    onClick={() => setRoleFilter(role)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${roleFilter === role ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                                >
                                                    {role.replace(/_/g, ' ')}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        {/* Select All Actions */}
                                        <div className="p-2 border-b flex justify-between bg-white items-center">
                                            <button 
                                                type="button"
                                                className="text-xs text-blue-600 font-medium hover:underline px-2 py-1"
                                                onClick={() => {
                                                    const newIds = Array.from(new Set([...formData.recipientIds, ...filteredContacts.map(c => c.id)]));
                                                    setFormData({...formData, recipientIds: newIds});
                                                }}
                                            >
                                                Select All Displayed
                                            </button>
                                            <button 
                                                type="button"
                                                className="text-xs text-red-600 font-medium hover:underline px-2 py-1"
                                                onClick={() => {
                                                    const idsToRemove = filteredContacts.map(c => c.id);
                                                    setFormData({...formData, recipientIds: formData.recipientIds.filter(id => !idsToRemove.includes(id))});
                                                }}
                                            >
                                                Deselect All Displayed
                                            </button>
                                        </div>

                                        {/* Contact List */}
                                        <div className="overflow-y-auto flex-1 p-2 space-y-1 rounded-b-xl">
                                            {filteredContacts.length === 0 ? (
                                                <div className="text-sm text-gray-500 text-center py-4">No contacts found for this role</div>
                                            ) : (
                                                filteredContacts.map(c => {
                                                    const isSelected = formData.recipientIds.includes(c.id);
                                                    return (
                                                        <label key={c.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                                                            <input 
                                                                type="checkbox" 
                                                                className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setFormData({...formData, recipientIds: [...formData.recipientIds, c.id]});
                                                                    } else {
                                                                        setFormData({...formData, recipientIds: formData.recipientIds.filter(id => id !== c.id)});
                                                                    }
                                                                }}
                                                            />
                                                            <div className="flex-1">
                                                                <div className="text-sm font-medium text-gray-800">{c.fullName}</div>
                                                                <div className="text-xs text-gray-500 mt-0.5">{c.role.replace(/_/g, ' ')} {c.branch ? `(${c.branch.name})` : '(Global)'}</div>
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject / Requisition Theme</label>
                                <input 
                                    required 
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 outline-none"
                                    value={formData.subject}
                                    onChange={e => setFormData({...formData, subject: e.target.value})}
                                    placeholder="e.g. Request for emergency server upgrade budget"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Message</label>
                                <textarea 
                                    required 
                                    rows={6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 outline-none resize-none"
                                    value={formData.message}
                                    onChange={e => setFormData({...formData, message: e.target.value})}
                                    placeholder="Explain the authorization required..."
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setShowCompose(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                                <button type="submit" disabled={processing} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center">
                                    {processing ? 'Sending...' : 'Send Memo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {confirmAction.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
                        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${confirmAction.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {confirmAction.status === 'APPROVED' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Confirm Action</h2>
                        <p className="text-gray-500 mb-6">Are you sure you want to mark this memo as <strong>{confirmAction.status}</strong>? This action cannot be undone.</p>
                        <div className="flex justify-center space-x-3">
                            <button 
                                onClick={() => setConfirmAction({ isOpen: false, memoId: '', status: null })}
                                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleRespond}
                                className={`px-5 py-2 text-white rounded-lg font-medium shadow-sm ${confirmAction.status === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                Yes, {confirmAction.status === 'APPROVED' ? 'Approve' : 'Decline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex border-b">
                    <button 
                        onClick={() => setActiveTab('INBOX')}
                        className={`flex-1 py-4 text-center font-medium ${activeTab === 'INBOX' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Inbox ({inboxMemos.filter(m => m.status === 'PENDING').length} Pending)
                    </button>
                    <button 
                        onClick={() => setActiveTab('SENT')}
                        className={`flex-1 py-4 text-center font-medium ${activeTab === 'SENT' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Sent Requests
                    </button>
                </div>

                <div className="divide-y divide-gray-100">
                    {displayMemos.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 italic">No memos found in {activeTab.toLowerCase()}.</div>
                    ) : (
                        displayMemos.map(memo => (
                            <div key={memo.id} className={`p-6 transition hover:bg-gray-50 ${memo.status === 'PENDING' ? 'bg-indigo-50/30' : ''}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">{memo.subject}</h3>
                                        <p className="text-sm text-gray-500 flex items-center mt-1">
                                            {activeTab === 'INBOX' ? (
                                                <span>From: <strong className="text-gray-700">{memo.sender.fullName}</strong> ({memo.sender.role.replace(/_/g, ' ')} {memo.branch ? `- ${memo.branch.name}` : ''})</span>
                                            ) : (
                                                <span>To: <strong className="text-gray-700">{memo.recipient.fullName}</strong> ({memo.recipient.role.replace(/_/g, ' ')} {memo.branch ? `- ${memo.branch.name}` : ''})</span>
                                            )}
                                            <span className="mx-2">&bull;</span>
                                            <span>{new Date(memo.createdAt).toLocaleString()}</span>
                                        </p>
                                    </div>
                                    
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border ${
                                        memo.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                                        memo.status === 'DECLINED' ? 'bg-red-50 text-red-700 border-red-200' :
                                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    }`}>
                                        {memo.status === 'APPROVED' && <CheckCircle size={14} />}
                                        {memo.status === 'DECLINED' && <XCircle size={14} />}
                                        {memo.status === 'PENDING' && <Clock size={14} />}
                                        <span>{memo.status}</span>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 whitespace-pre-wrap text-sm">
                                    {memo.message}
                                </div>

                                {activeTab === 'INBOX' && memo.status === 'PENDING' && (
                                    <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-100">
                                        <button 
                                            onClick={() => setConfirmAction({ isOpen: true, memoId: memo.id, status: 'DECLINED' })}
                                            className="px-4 py-2 border border-red-200 text-red-600 rounded flex items-center hover:bg-red-50 font-medium text-sm transition"
                                        >
                                            <XCircle size={16} className="mr-1" /> Decline
                                        </button>
                                        <button 
                                            onClick={() => setConfirmAction({ isOpen: true, memoId: memo.id, status: 'APPROVED' })}
                                            className="px-4 py-2 bg-green-600 text-white rounded flex items-center hover:bg-green-700 font-medium text-sm transition shadow-sm"
                                        >
                                            <CheckCircle size={16} className="mr-1" /> Approve
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
