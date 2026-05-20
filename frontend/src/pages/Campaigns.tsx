import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Send, Filter, CheckCircle, Mail, MessageSquare, Phone, RefreshCcw, AlertCircle, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
// @ts-ignore
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface CampaignLog {
    id: string;
    status: 'SENT' | 'FAILED';
    providerId: string | null;
    createdAt: string;
    lead: {
        id: string;
        fullName: string;
        phone: string | null;
        email: string | null;
    }
}

interface Campaign {
    id: string;
    name: string;
    type: 'EMAIL' | 'SMS' | 'WHATSAPP';
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'COMPLETED';
    filters: string;
    createdAt: string;
    template?: { content: string };
    stats?: { sent: number; failed: number };
}

interface Template {
    id: string;
    name: string;
    content: string;
    type: 'EMAIL' | 'SMS' | 'WHATSAPP';
}

export const Campaigns = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [waTemplates, setWaTemplates] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toast } = useToast();

    // New Campaign Form State
    const [name, setName] = useState('');
    const [type, setType] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('SMS');
    const [content, setContent] = useState('');
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Filters
    const [genderFilter, setGenderFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('');
    const [estateFilter, setEstateFilter] = useState('All');
    const [estates, setEstates] = useState<any[]>([]);

    const [isSending, setIsSending] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [waMessageType, setWaMessageType] = useState<'TEMPLATE' | 'CUSTOM'>('TEMPLATE');

    // Logs Modal State
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [campaignLogs, setCampaignLogs] = useState<CampaignLog[]>([]);
    const [logsTab, setLogsTab] = useState<'SENT' | 'FAILED'>('SENT');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        fetchCampaigns();
        fetchTemplates();
        fetchWhatsAppTemplates();
        fetchEstates();
    }, []);

    const fetchWhatsAppTemplates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/whatsapp-templates`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setWaTemplates(res.data);
        } catch (error) {
            console.error("Failed to load WA templates", error);
        }
    };

    const fetchEstates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setEstates(res.data);
        } catch (error) {
            console.error("Failed to load estates", error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/templates`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setTemplates(res.data);
        } catch (error) {
            console.error("Failed to load templates", error);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/campaigns`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setCampaigns(res.data);
        } catch (error) {
            console.error("Failed to load campaigns", error);
        }
    };

    const openLogsModal = async (campaign: Campaign, defaultTab: 'SENT' | 'FAILED') => {
        setSelectedCampaign(campaign);
        setLogsTab(defaultTab);
        setIsLogsModalOpen(true);
        setIsLoadingLogs(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/campaigns/${campaign.id}/logs`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setCampaignLogs(res.data);
        } catch (error) {
            console.error("Failed to load campaign logs", error);
            toast.error("Failed to load campaign logs");
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleResendFailed = async () => {
        if (!selectedCampaign) return;
        setIsResending(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/campaigns/${selectedCampaign.id}/resend-failed`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success(`Resent ${res.data.resent} failed messages successfully!`);
            // Refresh logs and campaigns to update stats
            openLogsModal(selectedCampaign, 'FAILED'); 
            fetchCampaigns();
        } catch (error: any) {
            console.error("Failed to resend", error);
            toast.error(error.response?.data?.error || "Failed to resend failed messages.");
        } finally {
            setIsResending(false);
        }
    };

    const handleCreateAndSend = async () => {
        if (!name || !content) {
            toast.error("Please fill in all fields.");
            return;
        }

        setIsSending(true);
        try {
            // 1. WhatsApp Media Pre-Upload (If attached)
            let waMediaId: string | undefined;
            let waMediaType: string | undefined;
            if (type === 'WHATSAPP' && mediaFile) {
                const formData = new FormData();
                formData.append('media', mediaFile);
                const mediaRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/meta-upload`, formData, {
                    headers: { 
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                waMediaId = mediaRes.data.mediaId;
                waMediaType = mediaRes.data.mediaType;
            }

            // 2. Draft Template Creation
            let templateId = selectedTemplateId;
            if (saveAsTemplate || !templateId) {
                const templateRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/templates`, {
                    name: type === 'WHATSAPP' ? name : (saveAsTemplate ? `${name} Template` : `Draft Template - ${name}`),
                    type,
                    content
                }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                templateId = templateRes.data.id;
            }

            // 3. Create Campaign Draft
            const filters: any = { gender: genderFilter, status: statusFilter, source: sourceFilter };
            if (statusFilter === 'CLIENT' && estateFilter !== 'All') {
                filters.estateId = estateFilter;
                const est = estates.find(e => e.id === estateFilter);
                if (est) filters.estateName = est.name;
            }
            if (waMediaId && waMediaType) {
                filters.waMediaId = waMediaId;
                filters.waMediaType = waMediaType;
            }

            const campaignRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/campaigns`, {
                name,
                type,
                templateId,
                filters
            }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

            const campaignId = campaignRes.data.id;

            // 3. Trigger Send Immediately
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/campaigns/${campaignId}/send`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            toast.success("Campaign sent successfully!");
            setIsModalOpen(false);
            fetchCampaigns();

            // Reset Form
            setName('');
            setContent('');
            setGenderFilter('All');
            setStatusFilter('All');
            setSourceFilter('');
            setEstateFilter('All');
            setSaveAsTemplate(false);
            setSelectedTemplateId('');
            setMediaFile(null);
            setWaMessageType('TEMPLATE');
            fetchTemplates();

        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to send campaign");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Campaigns</h1>
                    <p className="text-gray-500">Manage and send bulk communications to your leads.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={20} />
                    <span>New Campaign</span>
                </button>
            </div>

            {/* Campaign List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Campaign Name</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Audience Filters</th>
                            <th className="px-6 py-4 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {campaigns.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                                <td className="px-6 py-4 flex items-center space-x-2">
                                    {c.type === 'SMS' && <MessageSquare size={16} className="text-blue-500" />}
                                    {c.type === 'EMAIL' && <Mail size={16} className="text-purple-500" />}
                                    {c.type === 'WHATSAPP' && <Phone size={16} className="text-green-500" />}
                                    <span className="text-sm">{c.type}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {c.status === 'COMPLETED' ? (
                                        <div className="flex flex-col space-y-1">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 w-fit">
                                                DELIVERED
                                            </span>
                                            {c.stats && (
                                                <div className="text-xs text-gray-500">
                                                    <span 
                                                        onClick={() => openLogsModal(c, 'SENT')}
                                                        className="text-green-600 font-semibold cursor-pointer hover:underline"
                                                    >
                                                        {c.stats.sent} Sent
                                                    </span> 
                                                    {' '}•{' '}
                                                    <span 
                                                        onClick={() => openLogsModal(c, 'FAILED')}
                                                        className="text-red-500 font-semibold cursor-pointer hover:underline"
                                                    >
                                                        {c.stats.failed} Failed
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {c.status}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                    {/* Display nice summary of filters */}
                                    {(() => {
                                        try {
                                            const f = JSON.parse(c.filters);
                                            const parts = [];
                                            if (f.gender !== 'All') parts.push(f.gender);
                                            if (f.status !== 'All') parts.push(f.status);
                                            if (f.source) parts.push(`Source: ${f.source}`);
                                            if (f.estateName) parts.push(`Estate: ${f.estateName}`);
                                            return parts.length > 0 ? parts.join(', ') : 'All Leads';
                                        } catch { return 'Invalid Filters'; }
                                    })()}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-500 text-sm">
                                    {new Date(c.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                    No campaigns found. create your first one!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">×</button>

                        <h2 className="text-2xl font-bold mb-6">Create New Campaign</h2>

                        <div className="space-y-6">
                            {/* Basics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Campaign Name {type === 'WHATSAPP' && '(Will be auto-filled by Template)'}
                                    </label>
                                    <input
                                        value={name} onChange={e => {
                                            if (type !== 'WHATSAPP') setName(e.target.value);
                                        }}
                                        disabled={type === 'WHATSAPP'}
                                        className="w-full border rounded-lg p-2 disabled:bg-gray-100 disabled:text-gray-500"
                                        placeholder="e.g. Christmas Promo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                                    <select
                                        value={type} onChange={e => setType(e.target.value as any)}
                                        className="w-full border rounded-lg p-2"
                                    >
                                        <option value="SMS">SMS</option>
                                        <option value="EMAIL">Email</option>
                                        <option value="WHATSAPP">WhatsApp</option>
                                    </select>
                                </div>
                            </div>

                            {/* Audience Filters */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                    <Filter size={16} className="mr-2" /> Target Audience
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
                                        <select
                                            value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
                                            className="w-full text-sm border rounded p-1.5"
                                        >
                                            <option value="All">All Genders</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Lead Status</label>
                                        <select
                                            value={statusFilter} onChange={e => {
                                                setStatusFilter(e.target.value);
                                                if (e.target.value !== 'CLIENT') setEstateFilter('All');
                                            }}
                                            className="w-full text-sm border rounded p-1.5"
                                        >
                                            <option value="All">All Statuses</option>
                                            <option value="PROSPECT">Prospect</option>
                                            <option value="CLIENT">Client</option>
                                            <option value="CLOSED_LOST">Closed Lost</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Source (Optional)</label>
                                        <input
                                            value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                                            className="w-full text-sm border rounded p-1.5"
                                            placeholder="e.g. Facebook"
                                        />
                                    </div>
                                    {statusFilter === 'CLIENT' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Subscribed Estate</label>
                                            <select
                                                value={estateFilter} onChange={e => setEstateFilter(e.target.value)}
                                                className="w-full text-sm border rounded p-1.5"
                                            >
                                                <option value="All">All Estates</option>
                                                {estates.map(e => (
                                                    <option key={e.id} value={e.id}>{e.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Message Content */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Message Content</label>
                                    <div className="flex items-center space-x-2">
                                        <select
                                            value={selectedTemplateId}
                                            onChange={(e) => {
                                                const tid = e.target.value;
                                                setSelectedTemplateId(tid);
                                                if (tid) {
                                                    const t = templates.find(temp => temp.id === tid);
                                                    if (t) setContent(t.content);
                                                }
                                            }}
                                            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-gray-50 hover:bg-white"
                                        >
                                            <option value="">Load an existing Template...</option>
                                            {templates.filter(t => t.type === type).map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {type === 'WHATSAPP' && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Campaign Type</label>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setWaMessageType('TEMPLATE')}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${waMessageType === 'TEMPLATE' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Meta Template
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setWaMessageType('CUSTOM')}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${waMessageType === 'CUSTOM' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Custom Message
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {(type === 'WHATSAPP' && waMessageType === 'TEMPLATE') ? (
                                    <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mt-2 text-sm border border-blue-100">
                                        <div className="font-semibold mb-2 flex items-center">
                                            <AlertCircle size={16} className="mr-2" />
                                            WhatsApp campaigns require pre-approved templates from Meta.
                                        </div>
                                        <select
                                            value={name}
                                            onChange={(e) => {
                                                const selectedName = e.target.value;
                                                const selectedT = waTemplates.find(t => t.name === selectedName);
                                                setName(selectedName);
                                                setContent(`META_TEMPLATE|${selectedName}|${selectedT?.language || 'en_US'}`);
                                            }}
                                            className="w-full p-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Select an Approved Meta Template --</option>
                                            {waTemplates.map(t => (
                                                <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                                            ))}
                                        </select>
                                        
                                        {name && (
                                            <div className="mt-4 pt-4 border-t border-blue-200">
                                                <label className="block text-xs font-medium text-blue-900 mb-1">
                                                    Does this Meta template expect a Media Header?
                                                </label>
                                                <input 
                                                    type="file" 
                                                    onChange={(e) => e.target.files && setMediaFile(e.target.files[0])}
                                                    accept="image/*,video/*,application/pdf"
                                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" 
                                                />
                                                <p className="text-xs text-blue-600 mt-1">If attached, we will securely upload this directly to Meta for the broadcast.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : type === 'EMAIL' ? (
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-2">
                                        <ReactQuill
                                            theme="snow"
                                            value={content}
                                            onChange={setContent}
                                            className="h-48"
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, false] }],
                                                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                                                    ['link'],
                                                    ['clean']
                                                ],
                                            }}
                                        />
                                        <div className="h-10 border-t bg-gray-50" /> {/* Pad toolbar bottom */}
                                    </div>
                                ) : (
                                    <div>
                                        {type === 'WHATSAPP' && waMessageType === 'CUSTOM' && (
                                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mb-2 border border-amber-100 flex items-center">
                                                <AlertCircle size={14} className="mr-1 inline flex-shrink-0" />
                                                Custom messages will ONLY be delivered to leads who have replied to your business within the last 24 hours.
                                            </div>
                                        )}
                                        <textarea
                                            value={content} onChange={e => setContent(e.target.value)}
                                            className="w-full border rounded-lg p-3 h-32 text-sm font-mono mt-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder={`Type your ${type} message here...`}
                                        />
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-3">
                                    <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                                        <input type="checkbox" checked={saveAsTemplate} onChange={e => setSaveAsTemplate(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span>Save this message as a reusable Template</span>
                                    </label>

                                    {type !== 'EMAIL' && (
                                        <p className="text-xs text-gray-400 font-mono">{content.length} / 160 characters</p>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateAndSend}
                                    disabled={isSending}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {isSending ? (
                                        <><span>Sending...</span></>
                                    ) : (
                                        <><Send size={18} /><span>Send Campaign</span></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Logs Modal */}
            {isLogsModalOpen && selectedCampaign && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 relative flex flex-col max-h-[90vh]">
                        <button onClick={() => setIsLogsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>

                        <div className="mb-4">
                            <h2 className="text-xl font-bold">{selectedCampaign.name} - Delivery Logs</h2>
                            <p className="text-sm text-gray-500">See exactly who received and who missed this campaign.</p>
                        </div>

                        {/* Tabs */}
                        <div className="flex space-x-4 border-b border-gray-200 mb-4">
                            <button
                                onClick={() => setLogsTab('SENT')}
                                className={`pb-2 text-sm font-medium border-b-2 transition ${logsTab === 'SENT' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <CheckCircle size={16} className="inline mr-1" />
                                {selectedCampaign.stats?.sent || 0} Sent Successfully
                            </button>
                            <button
                                onClick={() => setLogsTab('FAILED')}
                                className={`pb-2 text-sm font-medium border-b-2 transition ${logsTab === 'FAILED' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <AlertCircle size={16} className="inline mr-1" />
                                {selectedCampaign.stats?.failed || 0} Failed to Deliver
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoadingLogs ? (
                                <div className="py-12 flex justify-center text-gray-400">Loading details...</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-left text-gray-500 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Contact Name</th>
                                            <th className="px-4 py-2">Details (Email/Phone)</th>
                                            <th className="px-4 py-2">{logsTab === 'FAILED' ? 'Error Detail' : 'Provider Ref'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {campaignLogs.filter(l => l.status === logsTab).map(log => (
                                            <tr key={log.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{log.lead.fullName}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {selectedCampaign.type === 'EMAIL' ? log.lead.email : log.lead.phone}
                                                </td>
                                                <td 
                                                    className="px-4 py-3 text-gray-500 max-w-sm break-words" 
                                                    title={log.providerId || 'Unknown'}
                                                >
                                                    {log.providerId || 'Unknown'}
                                                </td>
                                            </tr>
                                        ))}
                                        {campaignLogs.filter(l => l.status === logsTab).length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                                                    No {logsTab.toLowerCase()} contacts found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Resend Action in Footer */}
                        <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-4 rounded-lg">
                            <span className="text-sm text-gray-500 mb-4 sm:mb-0">
                                {logsTab === 'FAILED' && campaignLogs.filter(l => l.status === 'FAILED').length > 0
                                    ? "Would you like to retry sending failed messages?"
                                    : "You can close this window when done."}
                            </span>
                            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                                <button onClick={() => setIsLogsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 bg-white border border-gray-300 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-gray-200">
                                    Close
                                </button>
                                {logsTab === 'FAILED' && campaignLogs.filter(l => l.status === 'FAILED').length > 0 && (
                                    <button
                                        onClick={handleResendFailed}
                                        disabled={isResending}
                                        className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        <RefreshCcw size={16} className={`mr-2 ${isResending ? 'animate-spin' : ''}`} />
                                        {isResending ? 'Resending...' : 'Resend All Failed'}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};
