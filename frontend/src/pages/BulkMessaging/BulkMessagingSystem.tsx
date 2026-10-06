import React, { useState, useRef } from 'react';
import { Lock, Mail, MessageSquare, Send, FileSpreadsheet, Sparkles, Image as ImageIcon, Users, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const PASSCODE = "2026"; 

interface Contact {
    id: string;
    name: string;
    phone: string;
    email: string;
    site: string;
    gender: string;
}

interface LogEntry {
    id: string;
    contact: Contact;
    status: 'Success' | 'Failed' | 'Pending';
    reason?: string;
}

export const BulkMessagingSystem = () => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [authError, setAuthError] = useState('');

    // Form State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messageTemplate, setMessageTemplate] = useState('');
    const [senderId, setSenderId] = useState('DOUBLEKING');
    const [channel, setChannel] = useState<'SMS' | 'EMAIL'>('SMS');
    const [aiPrompt, setAiPrompt] = useState('');
    
    // Status State
    const [isDrafting, setIsDrafting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode === PASSCODE) {
            setIsAuthenticated(true);
            setAuthError('');
        } else {
            setAuthError('Invalid Passcode');
            setPasscode('');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const processFile = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsedContacts: Contact[] = results.data.map((row: any, index) => ({
                    id: `csv-${index}`,
                    name: row['Name'] || row['Full Name'] || row['Client Name'] || '',
                    phone: row['Phone'] || row['Phone Number'] || row['Contact'] || '',
                    email: row['Email'] || row['Email Address'] || '',
                    site: row['Site'] || row['Property'] || row['Site Subscribed'] || '',
                    gender: row['Gender'] || row['Sex'] || ''
                }));
                
                setContacts(parsedContacts);
                addToast(`Imported ${parsedContacts.length} contacts successfully`, "success");
            },
            error: (error) => {
                addToast("Error parsing file: " + error.message, "error");
            }
        });
    };

    const handleDraftWithAI = async () => {
        if (!aiPrompt) return;
        setIsDrafting(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bulk-messaging/draft`, 
                { prompt: aiPrompt },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessageTemplate(res.data.text);
            addToast("AI Draft generated successfully!", "success");
        } catch (error: any) {
            console.error("Draft error:", error);
            addToast(`Draft failed: ${error.response?.data?.error || error.message}`, "error");
        } finally {
            setIsDrafting(false);
        }
    };

    const processBatchQueue = async (targetContacts: Contact[]) => {
        setIsSending(true);
        setProgress(0);
        
        let newLogs: LogEntry[] = targetContacts.map(c => ({ id: c.id, contact: c, status: 'Pending' }));
        setLogs(newLogs);

        const batchSize = 20;
        let processedCount = 0;

        for (let i = 0; i < targetContacts.length; i += batchSize) {
            const batch = targetContacts.slice(i, i + batchSize);
            
            try {
                const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bulk-messaging/send-batch`, {
                    contacts: batch,
                    messageTemplate,
                    senderId,
                    channel
                }, { headers: { Authorization: `Bearer ${token}` } });

                const batchResults = res.data.results;
                
                newLogs = newLogs.map(log => {
                    const result = batchResults.find((r: any) => r.id === log.id);
                    if (result) {
                        return { ...log, status: result.status, reason: result.reason };
                    }
                    return log;
                });
                
                setLogs([...newLogs]);

            } catch (error) {
                // Mark entire batch as failed
                newLogs = newLogs.map(log => {
                    if (batch.find(b => b.id === log.id)) {
                        return { ...log, status: 'Failed', reason: 'Network/Server Error' };
                    }
                    return log;
                });
                setLogs([...newLogs]);
            }

            processedCount += batch.length;
            setProgress(Math.round((processedCount / targetContacts.length) * 100));
        }

        setIsSending(false);
        addToast("Campaign processing completed", "success");
    };

    const handleLaunchCampaign = () => {
        if (contacts.length === 0) return addToast("Please import contacts first", "error");
        if (!messageTemplate) return addToast("Please enter a message to send", "error");
        processBatchQueue(contacts);
    };

    const handleResendFailed = () => {
        const failedContacts = logs.filter(l => l.status === 'Failed').map(l => l.contact);
        if (failedContacts.length === 0) return;
        processBatchQueue(failedContacts);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-2xl">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900">Broadcast Engine</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Enter the secure passcode to access the bulk messaging system.
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                        <div>
                            <input
                                type="password"
                                required
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                className="appearance-none rounded-xl relative block w-full px-4 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="••••"
                            />
                        </div>
                        {authError && <p className="text-red-500 text-sm text-center font-medium">{authError}</p>}
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition shadow-lg"
                        >
                            Unlock System
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                            <Send size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Esthington Broadcast Engine</h1>
                            <p className="text-xs text-gray-500 font-medium">Independent Bulk Messaging System</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsAuthenticated(false)}
                        className="text-sm text-gray-500 hover:text-gray-900 font-medium flex items-center space-x-1"
                    >
                        <Lock size={14} />
                        <span>Lock System</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {logs.length > 0 && (
                    <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                                <AlertCircle size={20} className="text-blue-600"/>
                                <span>Campaign Logs</span>
                            </h2>
                            {isSending ? (
                                <div className="flex items-center space-x-3">
                                    <div className="text-sm font-bold text-blue-600">{progress}%</div>
                                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleResendFailed}
                                    disabled={logs.filter(l => l.status === 'Failed').length === 0}
                                    className="flex items-center space-x-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-200 transition disabled:opacity-50"
                                >
                                    <RefreshCw size={14} />
                                    <span>Resend Failed</span>
                                </button>
                            )}
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.contact.name || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{channel === 'SMS' ? log.contact.phone : log.contact.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {log.status === 'Success' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1"/> Success</span>}
                                                {log.status === 'Failed' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12} className="mr-1"/> Failed</span>}
                                                {log.status === 'Pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Pending...</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">{log.reason || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Data & Setup */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">1. Import Audience</h2>
                                </div>
                                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{contacts.length} loaded</span>
                            </div>
                            
                            <input 
                                type="file" 
                                accept=".csv" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                            />
                            
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-indigo-50 hover:border-indigo-400 transition cursor-pointer"
                            >
                                <Users size={32} className="mx-auto text-gray-400 mb-3" />
                                <p className="text-sm font-medium text-gray-900">Drag & Drop or Click to Upload CSV</p>
                                <p className="text-xs text-gray-500 mt-1">Columns: Name, Phone, Email, Site, Gender</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                    <ImageIcon size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">3. Media & Channels</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Send As (Sender ID)</label>
                                    <select 
                                        value={senderId}
                                        onChange={(e) => setSenderId(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="DOUBLEKING">Double King Estate</option>
                                        <option value="ROYALTON">Royalton Links</option>
                                        <option value="ESTHINGTON">Esthington Group</option>
                                        <option value="N-Alert">N-Alert (Generic)</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message Channel</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => setChannel('SMS')}
                                            className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold border transition ${channel === 'SMS' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <MessageSquare size={16} />
                                            <span>SMS</span>
                                        </button>
                                        <button 
                                            onClick={() => setChannel('EMAIL')}
                                            className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold border transition ${channel === 'EMAIL' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <Mail size={16} />
                                            <span>Email</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: AI Composer */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                        <Sparkles size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">2. AI Message Composer</h2>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-100 mb-4">
                                <label className="block text-sm font-bold text-purple-900 mb-2">Draft with AI</label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="text" 
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="E.g., Tell Double King subscribers to come for allocation..."
                                    />
                                    <button 
                                        onClick={handleDraftWithAI}
                                        disabled={isDrafting || !aiPrompt}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 flex items-center space-x-1 disabled:opacity-50"
                                    >
                                        <Sparkles size={16} />
                                        <span>{isDrafting ? 'Drafting...' : 'Draft'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                                    <span>Message Content</span>
                                    <span className="text-xs text-gray-500">Variables: {'{{Name}}'}, {'{{Site}}'}, {'{{Title}}'}</span>
                                </label>
                                <textarea 
                                    value={messageTemplate}
                                    onChange={(e) => setMessageTemplate(e.target.value)}
                                    className="flex-1 w-full border border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px]"
                                    placeholder="Type your message here or use AI to draft..."
                                ></textarea>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                                <button 
                                    onClick={handleLaunchCampaign}
                                    disabled={isSending || contacts.length === 0 || !messageTemplate}
                                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition flex items-center space-x-2 disabled:opacity-50"
                                >
                                    <Send size={18} />
                                    <span>{isSending ? 'Sending Campaign...' : 'Launch Campaign'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
