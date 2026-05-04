import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Loader2, Users, Send, Gift, TrendingUp, MessageCircle, MessageSquare, Bot } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { AnnouncementWidget } from '../components/AnnouncementWidget';
import { CustomerCareInbox } from '../components/CustomerCareInbox';
import { DailyAIOutreach } from '../components/DailyAIOutreach';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateString));
};

export const CustomerCareDashboard = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const token = localStorage.getItem('token');

    const [stats, setStats] = useState<any>(null);
    const [birthdays, setBirthdays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH'>('ALL');
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INBOX' | 'AI_OUTREACH'>('OVERVIEW');

    // Quick Message State
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [messageType, setMessageType] = useState<'SMS' | 'EMAIL'>('SMS');
    const [messageContent, setMessageContent] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!stats) setIsLoading(true); // Only show massive loader on first fetch
            try {
                let currentMonthStart = '';
                let currentMonthEnd = '';
                
                if (timeFilter === 'THIS_MONTH') {
                    const now = new Date();
                    currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
                } else if (timeFilter === 'LAST_MONTH') {
                    const now = new Date();
                    currentMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
                    currentMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
                }

                const query = timeFilter !== 'ALL' ? `?startDate=${currentMonthStart}&endDate=${currentMonthEnd}` : '';

                const [statsRes, birthdaysRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/stats${query}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/events/clients`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                setStats(statsRes.data);
                setBirthdays(birthdaysRes.data.upcomingBirthdays || []);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, [token, timeFilter]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;
        setSendingMsg(true);
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communications/send`,
                {
                    leadId: selectedClient.id,
                    type: messageType,
                    content: messageContent
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`${messageType} sent successfully!`);
            setIsMessageModalOpen(false);
            setMessageContent('');
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message. Please try again.');
        } finally {
            setSendingMsg(false);
        }
    };

    const openQuickMessage = (client: any, template = '') => {
        setSelectedClient(client);
        setMessageContent(template);
        setIsMessageModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-purple-600" size={48} />
            </div>
        );
    }

    const mData = stats?.marketerData || { recentProspects: [], recentClients: [], recentPayments: [] };

    return (
        <div className="space-y-6">
            {/* Premium Welcome Banner */}
            <div className="relative overflow-hidden bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 rounded-3xl shadow-xl border border-blue-500 mb-8">
                <div className="absolute top-0 right-0 p-8 opacity-[0.08] pointer-events-none">
                    <MessageCircle size={280} className="transform -rotate-12" />
                </div>
                <div className="relative p-10 md:p-14 text-white z-10 flex flex-col justify-center min-h-[250px]">
                    <span className="bg-blue-900/40 border border-blue-400/30 text-blue-100 text-xs font-black tracking-widest uppercase px-4 py-1.5 rounded-full inline-block mb-6 w-max backdrop-blur-md shadow-sm">
                        {user?.branch?.name} Customer Experience Hub
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-md">
                        Hello, {user?.fullName?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl opacity-90 leading-relaxed">
                        You are the voice of our brand. Nurture client relationships, resolve support inquiries, and turn prospects into lifelong patrons today.
                    </p>
                </div>
            </div>

            <AnnouncementWidget />

            {/* Main Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-8 mt-2">
                <button 
                    onClick={() => setActiveTab('OVERVIEW')} 
                    className={`pb-4 px-6 font-bold text-sm transition-all border-b-[3px] flex items-center ${activeTab === 'OVERVIEW' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
                >
                    Dashboard Overview
                </button>
                <button 
                    onClick={() => setActiveTab('INBOX')} 
                    className={`pb-4 px-6 font-bold text-sm transition-all border-b-[3px] flex items-center ${activeTab === 'INBOX' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
                >
                    <MessageSquare size={16} className="mr-2" />
                    Omnichannel Inbox
                </button>
                <button 
                    onClick={() => setActiveTab('AI_OUTREACH')} 
                    className={`pb-4 px-6 font-bold text-sm transition-all border-b-[3px] flex items-center ${activeTab === 'AI_OUTREACH' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
                >
                    <Bot size={16} className="mr-2" />
                    AI Outreach
                </button>
            </div>

            {activeTab === 'INBOX' ? (
                <CustomerCareInbox />
            ) : activeTab === 'AI_OUTREACH' ? (
                <DailyAIOutreach />
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-0">Overview Metrics</h2>
                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm w-max">
                    <button onClick={() => setTimeFilter('ALL')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${timeFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>All Time</button>
                    <button onClick={() => setTimeFilter('THIS_MONTH')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${timeFilter === 'THIS_MONTH' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>This Month</button>
                    <button onClick={() => setTimeFilter('LAST_MONTH')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${timeFilter === 'LAST_MONTH' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>Last Month</button>
                </div>
            </div>

            {/* Premium Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><Users size={100} /></div>
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4"><Users size={24} /></div>
                    <h3 className="text-gray-500 font-semibold text-sm mb-1">Total Active Clients</h3>
                    <p className="text-3xl font-black text-gray-900">{stats?.financial?.clientLeads || 0}</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><Gift size={100} /></div>
                    <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center mb-4"><Gift size={24} /></div>
                    <h3 className="text-gray-500 font-semibold text-sm mb-1">Upcoming Birthdays</h3>
                    <div className="flex items-end space-x-3">
                        <p className="text-3xl font-black text-gray-900">{birthdays.length}</p>
                        {birthdays.length > 0 && <span className="bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded-full font-bold mb-1">Action Needed</span>}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500"><Users size={100} /></div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><Users size={24} /></div>
                    <h3 className="text-gray-500 font-semibold text-sm mb-1">New Prospects</h3>
                    <p className="text-3xl font-black text-gray-900">{(stats?.financial?.totalLeads || 0) - (stats?.financial?.clientLeads || 0)}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 shadow-md border border-emerald-400 flex flex-col relative overflow-hidden group hover:shadow-lg transition-all text-white transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500"><TrendingUp size={100} /></div>
                    <div className="w-12 h-12 bg-emerald-800/40 backdrop-blur-sm text-emerald-50 rounded-xl flex items-center justify-center mb-4 border border-emerald-400/30 shadow-inner"><TrendingUp size={24} /></div>
                    <h3 className="text-emerald-100 font-bold text-xs uppercase tracking-wider mb-1">Branch Corporate Sales</h3>
                    <p className="text-3xl font-black drop-shadow-sm">{formatCurrency(stats?.financial?.totalRevenue || 0)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Upcoming Birthdays */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center space-x-3 bg-gradient-to-r from-pink-50 to-white">
                            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                                <Gift size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800">Client Birthdays (Next 30 Days)</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {birthdays.length === 0 ? (
                                <div className="p-10 text-center text-gray-500">
                                    <Gift size={48} className="mx-auto mb-4 text-gray-200" />
                                    No client birthdays coming up in the next 30 days.
                                </div>
                            ) : (
                                birthdays.map((client) => (
                                    <div key={client.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center space-x-4">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                {client.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-lg">{client.fullName}</p>
                                                <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">{formatDate(client.nextBirthday)}</span>
                                                    <span>•</span>
                                                    <span className={client.daysAway === 0 ? 'text-pink-600 font-bold' : client.daysAway <= 7 ? 'text-amber-600 font-medium' : ''}>
                                                        {client.daysAway === 0 ? 'Today! 🎉' : `in ${client.daysAway} days`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openQuickMessage(client, `Happy Birthday ${client.fullName}! 🎉 Wishing you a fantastic day from all of us at Esthington.`)}
                                            className="text-sm px-5 py-2.5 bg-pink-50 text-pink-600 rounded-xl font-semibold hover:bg-pink-100 transition-colors flex items-center shadow-sm"
                                        >
                                            Send Wish <Send size={16} className="ml-2" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Recent Clients */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800">Latest Client Onboardings</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {mData.recentClients.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No recent clients onboarded</div>
                            ) : (
                                mData.recentClients.map((c: any) => (
                                    <div key={c.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{c.fullName}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{c.phone}</p>
                                        </div>
                                        <button 
                                            onClick={() => openQuickMessage(c)}
                                            className="p-2 bg-gray-50 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                        >
                                            <MessageCircle size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Message Modal */}
            {isMessageModalOpen && selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Message {selectedClient.fullName}</h3>
                            <button onClick={() => setIsMessageModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSendMessage} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="radio" value="SMS" checked={messageType === 'SMS'} onChange={() => setMessageType('SMS')} className="text-purple-600 focus:ring-purple-500" />
                                            <span className="text-sm text-gray-700">SMS</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="radio" value="EMAIL" checked={messageType === 'EMAIL'} onChange={() => setMessageType('EMAIL')} className="text-purple-600 focus:ring-purple-500" />
                                            <span className="text-sm text-gray-700">Email</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={messageContent}
                                        onChange={(e) => setMessageContent(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                        placeholder={`Hi ${selectedClient.fullName}, ...`}
                                    ></textarea>
                                </div>
                                <div className="pt-4 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsMessageModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendingMsg}
                                        className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors flex items-center disabled:opacity-50 shadow-sm"
                                    >
                                        {sendingMsg ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send className="mr-2" size={16} />}
                                        Send Message
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
};
