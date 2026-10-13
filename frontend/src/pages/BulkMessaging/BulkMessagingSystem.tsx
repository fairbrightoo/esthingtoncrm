import React, { useState, useRef, useEffect } from 'react';
import { 
    Lock, 
    Mail, 
    MessageSquare, 
    Send, 
    FileSpreadsheet, 
    Sparkles, 
    Image as ImageIcon, 
    Users, 
    CheckCircle, 
    XCircle, 
    RefreshCw, 
    AlertCircle,
    Clock,
    BookOpen,
    UploadCloud,
    X,
    Filter,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Contact, BroadcastContact, LiveLogEntry } from './types';
import { parseSpreadsheetFile } from './spreadsheetParser';
import { normalizePhoneNumber, formatPhoneDisplay } from './phoneUtils';
import { BroadcastPhonebook } from './BroadcastPhonebook';
import { BroadcastHistory } from './BroadcastHistory';

const PASSCODE = "2026"; 

export const BulkMessagingSystem = () => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [authError, setAuthError] = useState('');

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<'BROADCAST' | 'PHONEBOOK' | 'HISTORY'>('BROADCAST');

    // Audience Mode: File Upload vs Phonebook Picker
    const [audienceSource, setAudienceSource] = useState<'FILE' | 'PHONEBOOK'>('FILE');

    // Broadcast Form State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [messageTemplate, setMessageTemplate] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [attachments, setAttachments] = useState<{name: string, content: string}[]>([]);
    const [senderId, setSenderId] = useState('DOUBLE KING');
    const [channel, setChannel] = useState<'SMS' | 'EMAIL'>('SMS');
    const [aiPrompt, setAiPrompt] = useState('');

    // Spreadsheet Auto-sync settings
    const [autoSyncToPhonebook, setAutoSyncToPhonebook] = useState(true);
    const [autoSyncTag, setAutoSyncTag] = useState('');

    // Phonebook Audience Selector Modal / Filter
    const [showPhonebookPicker, setShowPhonebookPicker] = useState(false);
    const [phonebookAudience, setPhonebookAudience] = useState<BroadcastContact[]>([]);
    const [selectedPhonebookIds, setSelectedPhonebookIds] = useState<Set<string>>(new Set());
    const [pickerTagFilter, setPickerTagFilter] = useState('');
    const [pickerSearch, setPickerSearch] = useState('');
    const [isLoadingAudience, setIsLoadingAudience] = useState(false);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    
    // Status & Progress State
    const [isDrafting, setIsDrafting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<LiveLogEntry[]>([]);
    const [lastCompletedCampaignId, setLastCompletedCampaignId] = useState<string | null>(null);

    // Live counts for tabs
    const [phonebookCount, setPhonebookCount] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

    // Load filter tags and contact count when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadPhonebookMeta();
        }
    }, [isAuthenticated]);

    const loadPhonebookMeta = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/bulk-messaging/contacts/filters`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailableTags(res.data.tags || []);
            setPhonebookCount(res.data.totalContacts || 0);
        } catch (err) {
            console.error("Failed to load phonebook metadata:", err);
        }
    };

    // Universal Spreadsheet Ingestion (.csv, .xlsx, .xls)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processSpreadsheet(file);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) await processSpreadsheet(file);
    };

    const processSpreadsheet = async (file: File) => {
        try {
            const result = await parseSpreadsheetFile(file);
            setContacts(result.contacts);
            setUploadedFileName(result.filename);
            // Default auto-sync tag to file name without extension
            const defaultTagName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
            setAutoSyncTag(defaultTagName);
            addToast(`Loaded ${result.totalCount} recipients (${result.validPhoneCount} valid numbers)`, "success");
        } catch (err: any) {
            addToast(`Error reading file: ${err.message}`, "error");
        }
    };

    // Phonebook Selector Operations
    const openPhonebookAudiencePicker = async () => {
        setShowPhonebookPicker(true);
        setIsLoadingAudience(true);
        try {
            const res = await axios.get(`${API_URL}/api/bulk-messaging/contacts/audience`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allContacts: BroadcastContact[] = res.data.contacts || [];
            setPhonebookAudience(allContacts);
            // Pre-select all by default
            setSelectedPhonebookIds(new Set(allContacts.map(c => c.id)));
        } catch (err) {
            console.error("Failed to fetch audience contacts:", err);
            addToast("Failed to fetch phonebook contacts", "error");
        } finally {
            setIsLoadingAudience(false);
        }
    };

    const handleToggleSelectAllPicker = () => {
        const filtered = getFilteredPickerContacts();
        if (selectedPhonebookIds.size === filtered.length && filtered.length > 0) {
            setSelectedPhonebookIds(new Set());
        } else {
            setSelectedPhonebookIds(new Set(filtered.map(c => c.id)));
        }
    };

    const handleToggleSelectOnePicker = (id: string) => {
        setSelectedPhonebookIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getFilteredPickerContacts = () => {
        return phonebookAudience.filter(c => {
            const matchesTag = pickerTagFilter ? c.tags.includes(pickerTagFilter) : true;
            const matchesSearch = pickerSearch.trim()
                ? c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                  c.phone.includes(pickerSearch.replace(/[^0-9]/g, '')) ||
                  (c.email && c.email.toLowerCase().includes(pickerSearch.toLowerCase())) ||
                  (c.site && c.site.toLowerCase().includes(pickerSearch.toLowerCase()))
                : true;
            return matchesTag && matchesSearch;
        });
    };

    const handleConfirmPhonebookSelection = () => {
        const selected = phonebookAudience
            .filter(c => selectedPhonebookIds.has(c.id))
            .map(c => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email || '',
                site: c.site || '',
                gender: c.gender || '',
                title: c.title || undefined
            }));

        setContacts(selected);
        setUploadedFileName(`Phonebook Selection (${selected.length} contacts)`);
        setShowPhonebookPicker(false);
        addToast(`Selected ${selected.length} contacts from Phonebook`, "success");
    };

    // AI Message Composer
    const handleDraftWithAI = async () => {
        if (!aiPrompt) return;
        setIsDrafting(true);
        try {
            const res = await axios.post(`${API_URL}/api/bulk-messaging/draft`, 
                { prompt: aiPrompt },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessageTemplate(res.data.text);
            if (channel === 'EMAIL' && !emailSubject) {
                try {
                    const subjRes = await axios.post(`${API_URL}/api/bulk-messaging/draft`, 
                        { prompt: `Generate a short, catchy email subject line (max 6 words) for this email: ${res.data.text}` },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    setEmailSubject(subjRes.data.text.replace(/["']/g, ''));
                } catch (e) {}
            }
            addToast("AI Draft generated successfully!", "success");
        } catch (error: any) {
            console.error("Draft error:", error);
            addToast(`Draft failed: ${error.response?.data?.error || error.message}`, "error");
        } finally {
            setIsDrafting(false);
        }
    };

    // Queue Batch Process and Auto-Record Campaign + Sync
    const processBatchQueue = async (targetContacts: Contact[]) => {
        setIsSending(true);
        setProgress(0);
        
        let newLogs: LiveLogEntry[] = targetContacts.map(c => ({ id: c.id, contact: c, status: 'Pending' }));
        setLogs(newLogs);

        const batchSize = 20;
        let processedCount = 0;
        const allFinalResults: any[] = [];

        for (let i = 0; i < targetContacts.length; i += batchSize) {
            const batch = targetContacts.slice(i, i + batchSize);
            
            try {
                const res = await axios.post(`${API_URL}/api/bulk-messaging/send-batch`, {
                    contacts: batch,
                    messageTemplate,
                    emailSubject,
                    attachments,
                    senderId,
                    channel
                }, { headers: { Authorization: `Bearer ${token}` } });

                const batchResults = res.data.results || [];
                allFinalResults.push(...batchResults);
                
                newLogs = newLogs.map(log => {
                    const result = batchResults.find((r: any) => r.id === log.id);
                    if (result) {
                        return { ...log, status: result.status, reason: result.reason };
                    }
                    return log;
                });
                
                setLogs([...newLogs]);

            } catch (error: any) {
                // Mark entire batch as failed
                const failedBatchResults = batch.map(b => ({
                    id: b.id,
                    name: b.name,
                    phone: b.phone,
                    email: b.email,
                    status: 'Failed',
                    reason: 'Network/Server Error'
                }));
                allFinalResults.push(...failedBatchResults);

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

        // 1. Auto-save Campaign to Persistent Database History
        try {
            const campaignRes = await axios.post(`${API_URL}/api/bulk-messaging/campaigns`, {
                title: emailSubject || `${channel} Broadcast - ${new Date().toLocaleDateString()}`,
                channel,
                senderId,
                subject: channel === 'EMAIL' ? emailSubject : undefined,
                messageTemplate,
                results: allFinalResults
            }, { headers: { Authorization: `Bearer ${token}` } });

            setLastCompletedCampaignId(campaignRes.data.campaign?.id || null);
        } catch (campErr) {
            console.error("Failed to persist campaign record:", campErr);
        }

        // 2. Auto-sync Contacts to Phonebook if checked
        if (autoSyncToPhonebook && audienceSource === 'FILE' && targetContacts.length > 0) {
            try {
                await axios.post(`${API_URL}/api/bulk-messaging/contacts/sync`, {
                    contacts: targetContacts,
                    tag: autoSyncTag.trim() || undefined
                }, { headers: { Authorization: `Bearer ${token}` } });
                loadPhonebookMeta();
            } catch (syncErr) {
                console.error("Failed to auto-sync contacts to phonebook:", syncErr);
            }
        }

        addToast("Broadcast processing completed and saved to history!", "success");
    };

    const handleLaunchCampaign = () => {
        if (contacts.length === 0) return addToast("Please select or import audience first", "error");
        if (!messageTemplate) return addToast("Please enter a message to broadcast", "error");
        if (channel === 'EMAIL' && !emailSubject) return addToast("Please enter an email subject line", "error");
        processBatchQueue(contacts);
    };

    const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                return addToast(`File ${file.name} is too large (max 5MB)`, "error");
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                const base64Data = base64.split(',')[1];
                setAttachments(prev => [...prev, { name: file.name, content: base64Data }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Callback when user clicks "Resend Failed" from Campaign History
    const handleResendFromHistory = (
        failedRecipients: Contact[], 
        originalTemplate: string, 
        origChannel: 'SMS' | 'EMAIL', 
        origSender: string, 
        origSubject?: string
    ) => {
        setContacts(failedRecipients);
        setMessageTemplate(originalTemplate);
        setChannel(origChannel);
        setSenderId(origSender);
        if (origSubject) setEmailSubject(origSubject);
        setUploadedFileName(`Resending ${failedRecipients.length} Failed Recipients`);
        setActiveTab('BROADCAST');
        addToast(`Loaded ${failedRecipients.length} failed recipients into Composer`, "success");
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
                            Enter the secure passcode to access the independent broadcast system.
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
            {/* Top Navigation Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                            <Send size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Esthington Broadcast Engine</h1>
                            <p className="text-xs text-gray-500 font-medium">Independent Multi-Channel Messaging Suite</p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('BROADCAST')}
                            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                                activeTab === 'BROADCAST'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Send size={14} />
                            <span>New Broadcast</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('PHONEBOOK')}
                            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                                activeTab === 'PHONEBOOK'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <BookOpen size={14} />
                            <span>Phonebook</span>
                            {phonebookCount !== null && (
                                <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full">
                                    {phonebookCount.toLocaleString()}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('HISTORY')}
                            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                                activeTab === 'HISTORY'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Clock size={14} />
                            <span>Campaign History</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                    >
                        <Lock size={13} className="mr-1" />
                        Lock System
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* TAB 1: NEW BROADCAST */}
                {activeTab === 'BROADCAST' && (
                    <div className="space-y-6">
                        {/* Live Dispatch Progress Banner */}
                        {isSending && (
                            <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between animate-pulse">
                                <div className="space-y-1">
                                    <h4 className="font-bold flex items-center text-sm">
                                        <RefreshCw size={16} className="animate-spin mr-2" />
                                        Dispatching Broadcast ({progress}%)
                                    </h4>
                                    <p className="text-xs text-blue-100">
                                        Sending {contacts.length} messages via {channel} through {senderId}...
                                    </p>
                                </div>
                                <span className="text-2xl font-black">{progress}%</span>
                            </div>
                        )}

                        {/* Composer Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Audience & Channels */}
                            <div className="space-y-6">
                                {/* Step 1: Import / Select Audience */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-extrabold text-gray-900 flex items-center text-base">
                                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs mr-2 font-black">1</span>
                                            Target Audience
                                        </h3>
                                        {contacts.length > 0 && (
                                            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                                                {contacts.length.toLocaleString()} Ready
                                            </span>
                                        )}
                                    </div>

                                    {/* Source Switcher */}
                                    <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setAudienceSource('FILE')}
                                            className={`py-2 rounded-lg transition ${
                                                audienceSource === 'FILE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                        >
                                            Spreadsheet (.xlsx / .csv)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAudienceSource('PHONEBOOK')}
                                            className={`py-2 rounded-lg transition ${
                                                audienceSource === 'PHONEBOOK' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                        >
                                            From Phonebook
                                        </button>
                                    </div>

                                    {/* Option A: Spreadsheet Ingestion */}
                                    {audienceSource === 'FILE' && (
                                        <div className="space-y-3">
                                            <div
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={handleDrop}
                                                onClick={() => fileInputRef.current?.click()}
                                                className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center group bg-gray-50/50"
                                            >
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileUpload}
                                                    accept=".csv,.xlsx,.xls"
                                                    className="hidden"
                                                />
                                                <UploadCloud className="text-gray-400 group-hover:text-blue-500 transition mb-2" size={32} />
                                                <span className="text-xs font-bold text-gray-700">
                                                    Drag & Drop or Click to Upload
                                                </span>
                                                <span className="text-[11px] text-gray-400 mt-1">
                                                    Excel (.xlsx, .xls) & CSV files supported
                                                </span>
                                            </div>

                                            {uploadedFileName && (
                                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                                                    <div className="flex items-center space-x-2 truncate">
                                                        <FileSpreadsheet className="text-blue-600 shrink-0" size={16} />
                                                        <span className="font-bold text-blue-900 truncate">{uploadedFileName}</span>
                                                    </div>
                                                    <span className="text-blue-700 font-bold shrink-0">{contacts.length} rows</span>
                                                </div>
                                            )}

                                            {/* Auto-Sync Checkbox (User requested) */}
                                            <div className="pt-2 border-t border-gray-100 space-y-2">
                                                <label className="flex items-start space-x-2.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={autoSyncToPhonebook}
                                                        onChange={(e) => setAutoSyncToPhonebook(e.target.checked)}
                                                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    />
                                                    <span className="text-xs font-medium text-gray-700">
                                                        Auto-sync imported contacts to Phonebook (smart deduplication)
                                                    </span>
                                                </label>

                                                {autoSyncToPhonebook && (
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                            Assign Group / Tag
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={autoSyncTag}
                                                            onChange={(e) => setAutoSyncTag(e.target.value)}
                                                            placeholder="e.g. Double King Villa Subscribers"
                                                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Option B: Choose from Phonebook */}
                                    {audienceSource === 'PHONEBOOK' && (
                                        <div className="space-y-3">
                                            <button
                                                type="button"
                                                onClick={openPhonebookAudiencePicker}
                                                className="w-full py-3.5 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2"
                                            >
                                                <Users size={16} />
                                                <span>Choose Contacts / Groups from Phonebook</span>
                                            </button>

                                            {contacts.length > 0 && (
                                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between">
                                                    <span className="font-semibold text-gray-700">{uploadedFileName || "Phonebook Contacts"}</span>
                                                    <span className="font-bold text-blue-600">{contacts.length} Selected</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Step 3: Media & Channels */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
                                    <h3 className="font-extrabold text-gray-900 flex items-center text-base">
                                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xs mr-2 font-black">3</span>
                                        Channels & Delivery
                                    </h3>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                            Send As (Sender ID)
                                        </label>
                                        <input
                                            type="text"
                                            value={senderId}
                                            onChange={(e) => setSenderId(e.target.value)}
                                            placeholder="DOUBLE KING"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            For SMS: Use approved Termii sender ID (e.g. DOUBLE KING).
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                            Message Channel
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setChannel('SMS')}
                                                className={`py-3 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-2 ${
                                                    channel === 'SMS'
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                <MessageSquare size={16} />
                                                <span>SMS Blast</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setChannel('EMAIL')}
                                                className={`py-3 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-2 ${
                                                    channel === 'EMAIL'
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                <Mail size={16} />
                                                <span>Email Broadcast</span>
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={isSending || contacts.length === 0}
                                        onClick={handleLaunchCampaign}
                                        className="w-full mt-4 py-4 px-6 rounded-2xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
                                    >
                                        {isSending ? (
                                            <>
                                                <RefreshCw size={18} className="animate-spin" />
                                                <span>Processing Broadcast...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                <span>Launch Campaign ({contacts.length.toLocaleString()})</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Right Column: AI Message Composer */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-sm space-y-5">
                                    <h3 className="font-extrabold text-gray-900 flex items-center text-base">
                                        <span className="w-6 h-6 bg-pink-100 text-pink-600 rounded-lg flex items-center justify-center text-xs mr-2 font-black">2</span>
                                        AI Message Composer
                                    </h3>

                                    {/* AI Prompt Box */}
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100 space-y-2">
                                        <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider">
                                            Draft with AI Copilot
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder="e.g. Write a warm update to Double King Villa subscribers announcing our move to the new site"
                                                className="flex-1 px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleDraftWithAI}
                                                disabled={isDrafting || !aiPrompt}
                                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-purple-500/20 disabled:opacity-50"
                                            >
                                                {isDrafting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                <span>Draft</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dynamic Email Subject (When Email selected) */}
                                    {channel === 'EMAIL' && (
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    Email Subject Line *
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (messageTemplate) {
                                                            setAiPrompt(`Generate a 5-word catchy email subject line for: ${messageTemplate}`);
                                                            handleDraftWithAI();
                                                        }
                                                    }}
                                                    className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center space-x-1"
                                                >
                                                    <Sparkles size={12} className="mr-0.5" />
                                                    Auto-Generate Subject
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={emailSubject}
                                                onChange={(e) => setEmailSubject(e.target.value)}
                                                placeholder="e.g. Important Update Regarding Your Double King Villa Subscription"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                            />
                                        </div>
                                    )}

                                    {/* Message Body Content */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Message Content
                                            </label>
                                            <div className="text-[11px] font-semibold text-gray-400 space-x-1">
                                                <span>Variables:</span>
                                                <span className="font-mono text-purple-600 bg-purple-50 px-1 rounded">{"{{Name}}"}</span>
                                                <span className="font-mono text-purple-600 bg-purple-50 px-1 rounded">{"{{Site}}"}</span>
                                                <span className="font-mono text-purple-600 bg-purple-50 px-1 rounded">{"{{Title}}"}</span>
                                            </div>
                                        </div>

                                        <textarea
                                            rows={9}
                                            value={messageTemplate}
                                            onChange={(e) => setMessageTemplate(e.target.value)}
                                            placeholder="Type your message here or generate one with AI..."
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition leading-relaxed"
                                        />

                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>{messageTemplate.length} characters</span>
                                            {channel === 'SMS' && (
                                                <span>~{Math.ceil((messageTemplate.length || 1) / 160)} SMS segment(s)</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Media & Attachments (Email only) */}
                                    {channel === 'EMAIL' && (
                                        <div className="pt-2 border-t border-gray-100 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    Media & File Attachments (Images, PDFs, Docs)
                                                </label>
                                                <label className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center">
                                                    <ImageIcon size={14} className="mr-1" />
                                                    Add Files
                                                    <input
                                                        type="file"
                                                        multiple
                                                        onChange={handleAttachment}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>

                                            {attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {attachments.map((att, idx) => (
                                                        <div key={idx} className="bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-2">
                                                            <span className="truncate max-w-xs">{att.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeAttachment(idx)}
                                                                className="text-gray-400 hover:text-rose-600"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Active Batch Execution Logs (Real-time Feedback) */}
                                {logs.length > 0 && (
                                    <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center">
                                                <Clock size={16} className="mr-2 text-gray-400" />
                                                Active Dispatch Logs ({logs.filter(l => l.status === 'Success').length}/{logs.length})
                                            </h4>
                                            {lastCompletedCampaignId && (
                                                <button
                                                    onClick={() => setActiveTab('HISTORY')}
                                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
                                                >
                                                    View in Campaign Archives
                                                    <ChevronRight size={14} className="ml-0.5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 text-xs">
                                            {logs.slice(0, 50).map((l) => (
                                                <div key={l.id} className="py-2.5 flex items-center justify-between">
                                                    <span className="font-semibold text-gray-800">{l.contact.name}</span>
                                                    <span className="text-gray-500 font-mono">
                                                        {l.contact.phone ? formatPhoneDisplay(l.contact.phone) : l.contact.email}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        l.status === 'Success' ? 'bg-emerald-100 text-emerald-700' :
                                                        l.status === 'Failed' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {l.status}
                                                    </span>
                                                </div>
                                            ))}
                                            {logs.length > 50 && (
                                                <p className="text-center text-gray-400 pt-2 text-[11px]">
                                                    Showing first 50 recipients. Full audit logs saved to Campaign History.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: PHONEBOOK */}
                {activeTab === 'PHONEBOOK' && (
                    <BroadcastPhonebook
                        token={token}
                        onSelectAudienceForBroadcast={(selected) => {
                            setContacts(selected.map(s => ({
                                id: s.id,
                                name: s.name,
                                phone: s.phone,
                                email: s.email || '',
                                site: s.site || '',
                                gender: s.gender || '',
                                title: s.title || undefined
                            })));
                            setUploadedFileName(`Phonebook (${selected.length} contacts)`);
                            setActiveTab('BROADCAST');
                            addToast(`Loaded ${selected.length} contacts into Composer`, "success");
                        }}
                    />
                )}

                {/* TAB 3: CAMPAIGN HISTORY */}
                {activeTab === 'HISTORY' && (
                    <BroadcastHistory
                        token={token}
                        onResendCampaign={handleResendFromHistory}
                    />
                )}
            </main>

            {/* Phonebook Audience Selector Modal */}
            {showPhonebookPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Select Audience from Phonebook</h3>
                                <p className="text-xs text-gray-500">Pick specific contacts or filter by tag/site.</p>
                            </div>
                            <button onClick={() => setShowPhonebookPicker(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search & Tag Filter */}
                        <div className="py-3 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={pickerSearch}
                                    onChange={(e) => setPickerSearch(e.target.value)}
                                    placeholder="Search by name, phone, or site..."
                                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <select
                                value={pickerTagFilter}
                                onChange={(e) => setPickerTagFilter(e.target.value)}
                                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Groups / Tags</option>
                                {availableTags.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleToggleSelectAllPicker}
                                className="px-3 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
                            >
                                {selectedPhonebookIds.size === getFilteredPickerContacts().length && getFilteredPickerContacts().length > 0 ? "Deselect All" : "Select All"}
                            </button>
                        </div>

                        {/* Contacts List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 py-2">
                            {isLoadingAudience ? (
                                <div className="p-12 text-center text-gray-400">
                                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                    Loading contacts...
                                </div>
                            ) : getFilteredPickerContacts().length === 0 ? (
                                <div className="p-12 text-center text-gray-400 font-medium text-xs">
                                    No contacts match criteria.
                                </div>
                            ) : (
                                getFilteredPickerContacts().map((c) => {
                                    const isSelected = selectedPhonebookIds.has(c.id);
                                    return (
                                        <div
                                            key={c.id}
                                            onClick={() => handleToggleSelectOnePicker(c.id)}
                                            className={`p-3 flex items-center justify-between cursor-pointer rounded-xl transition ${
                                                isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 pointer-events-none"
                                                />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900">{c.name}</p>
                                                    <p className="text-[11px] text-gray-500 font-mono">{formatPhoneDisplay(c.phone)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {c.site && (
                                                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full mr-2">
                                                        {c.site}
                                                    </span>
                                                )}
                                                {c.tags && c.tags.length > 0 && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full">
                                                        {c.tags[0]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700">
                                {selectedPhonebookIds.size.toLocaleString()} contacts selected
                            </span>
                            <div className="space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPhonebookPicker(false)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmPhonebookSelection}
                                    disabled={selectedPhonebookIds.size === 0}
                                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                                >
                                    Use Selected Contacts
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
