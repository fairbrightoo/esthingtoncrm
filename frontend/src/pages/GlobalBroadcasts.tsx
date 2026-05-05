import { useState, useEffect } from 'react';
import axios from 'axios';
import { Megaphone, Send, Users, Building, Building2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const GlobalBroadcasts = () => {
    const { token } = useAuth();
    const [audienceType, setAudienceType] = useState('ALL_STAFF');
    const [targetId, setTargetId] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [messageType, setMessageType] = useState('EMAIL');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{success: boolean, message: string} | null>(null);

    const [companies, setCompanies] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [fetchingHistory, setFetchingHistory] = useState(false);

    useEffect(() => {
        fetchCompanies();
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setFetchingHistory(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/broadcast-history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (error) {
            console.error("Failed to load broadcast history", error);
        } finally {
            setFetchingHistory(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`);
            setCompanies(res.data);
        } catch (error) {
            console.error("Failed to load companies", error);
        }
    };

    const fetchBranches = async (companyId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches`);
            setBranches(res.data);
        } catch (error) {
            console.error("Failed to load branches", error);
        }
    };

    const handleAudienceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setAudienceType(val);
        setTargetId('');
        if (val === 'COMPANY' && companies.length > 0) {
            setTargetId(companies[0].id);
        }
    };

    const handleCompanySelectForBranch = (e: React.ChangeEvent<HTMLSelectElement>) => {
        fetchBranches(e.target.value);
    };

    const handleSend = async () => {
        if (!content) {
            setStatus({ success: false, message: "Message content cannot be empty."});
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/broadcast`, {
                audienceType,
                targetId,
                subject,
                content,
                type: messageType
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus({ success: true, message: res.data.message });
            setContent('');
            setSubject('');
            fetchHistory();
        } catch (error: any) {
            setStatus({ success: false, message: error.response?.data?.error || "Failed to send broadcast." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
            <header className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-8 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Megaphone size={120} />
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight">Global Broadcast Center</h1>
                    <p className="mt-2 text-blue-100 max-w-xl">
                        Instantly dispatch official communications to the entire organization, specific subsidiaries, or key executive groups.
                    </p>
                </div>
            </header>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                {status && (
                    <div className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${status.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        {status.success ? <CheckCircle className="text-green-600 mt-0.5" /> : <AlertCircle className="text-red-600 mt-0.5" />}
                        <div className={`text-sm font-medium ${status.success ? 'text-green-800' : 'text-red-800'}`}>
                            {status.message}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Configuration */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                <Users size={16} className="mr-2 text-gray-400" />
                                Target Audience
                            </label>
                            <select 
                                value={audienceType}
                                onChange={handleAudienceChange}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            >
                                <option value="ALL_STAFF">Entire Group Staff (All Companies)</option>
                                <option value="ALL_MDS">All Managing Directors</option>
                                <option value="COMPANY">Specific Subsidiary / Company</option>
                                <option value="BRANCH">Specific Branch</option>
                            </select>
                        </div>

                        {audienceType === 'COMPANY' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                    <Building2 size={16} className="mr-2 text-gray-400" />
                                    Select Subsidiary
                                </label>
                                <select 
                                    value={targetId}
                                    onChange={(e) => setTargetId(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                >
                                    <option value="">Select a company...</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {audienceType === 'BRANCH' && (
                            <div className="animate-fade-in space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Filter by Company first</label>
                                    <select 
                                        onChange={handleCompanySelectForBranch}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select parent company...</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                        <Building size={16} className="mr-2 text-gray-400" />
                                        Select Branch
                                    </label>
                                    <select 
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={branches.length === 0}
                                    >
                                        <option value="">{branches.length === 0 ? 'Select company first...' : 'Select a branch...'}</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Method</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center font-bold ${messageType === 'EMAIL' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                    <input type="radio" name="delivery" className="hidden" checked={messageType === 'EMAIL'} onChange={() => setMessageType('EMAIL')} />
                                    Official Email
                                </label>
                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center font-bold ${messageType === 'SMS' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                    <input type="radio" name="delivery" className="hidden" checked={messageType === 'SMS'} onChange={() => setMessageType('SMS')} />
                                    SMS Alert
                                </label>
                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center font-bold ${messageType === 'DASHBOARD' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                    <input type="radio" name="delivery" className="hidden" checked={messageType === 'DASHBOARD'} onChange={() => setMessageType('DASHBOARD')} />
                                    Dashboard Notice
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Message Composer */}
                    <div className="space-y-6">
                        {messageType === 'EMAIL' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Subject Line</label>
                                <input 
                                    type="text" 
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Urgent Update Regarding Q3 Targets"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Message Body</label>
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Type your broadcast message here..."
                                rows={8}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium text-gray-800"
                            ></textarea>
                            <p className="text-xs text-gray-400 mt-2 text-right">
                                {content.length} characters
                            </p>
                        </div>

                        <button 
                            onClick={handleSend}
                            disabled={loading || !content || (['COMPANY', 'BRANCH'].includes(audienceType) && !targetId)}
                            className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center group"
                        >
                            {loading ? (
                                <RefreshCw className="animate-spin" />
                            ) : (
                                <>
                                    Dispatch Broadcast
                                    <Send size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* History Section */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Megaphone size={20} className="mr-2 text-blue-600" />
                    Broadcast History
                </h3>
                
                {fetchingHistory ? (
                    <div className="flex justify-center p-8">
                        <RefreshCw className="animate-spin text-blue-600" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-xl">
                        No broadcasts have been dispatched yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((item) => (
                            <div key={item.id} className="border border-gray-100 p-5 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-800">{item.title}</h4>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                                        {new Date(item.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.content}</p>
                                <div className="flex items-center text-xs font-semibold text-gray-500 space-x-4">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                                        To: {item.audienceType.replace('_', ' ')}
                                    </span>
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100">
                                        Via: {item.deliveryType}
                                    </span>
                                    {item.deliveryType !== 'DASHBOARD' && (
                                        <span className="text-green-600 flex items-center">
                                            <CheckCircle size={12} className="mr-1" />
                                            {item.successCount} Delivered
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
