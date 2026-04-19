import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Loader2, Users, DollarSign, Clock, Send, CreditCard, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { AnnouncementWidget } from '../components/AnnouncementWidget';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateString));
};

export const MarketerDashboard = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const token = localStorage.getItem('token');

    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'prospects' | 'clients'>('clients');

    // Quick Message State
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [messageType, setMessageType] = useState<'SMS' | 'EMAIL'>('SMS');
    const [messageContent, setMessageContent] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    const [dateFilter, setDateFilter] = useState('ALL');

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                let params = '';
                if (dateFilter !== 'ALL') {
                    const now = new Date();
                    let start = '';
                    let end = now.toISOString();

                    if (dateFilter === 'THIS_MONTH') {
                        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    } else if (dateFilter === 'LAST_MONTH') {
                        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
                        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
                    } else if (dateFilter === 'THIS_YEAR') {
                        start = new Date(now.getFullYear(), 0, 1).toISOString();
                    }
                    params = `?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
                }

                const response = await axios.get(`http://localhost:3000/api/analytics/stats${params}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch marketer stats", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [token, dateFilter]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;
        setSendingMsg(true);
        try {
            await axios.post(
                'http://localhost:3000/api/communications/send',
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

    const openQuickMessage = (client: any) => {
        setSelectedClient(client);
        setIsMessageModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }

    const mData = stats?.marketerData || { recentProspects: [], recentClients: [], recentPayments: [] };

    return (
        <div className="space-y-6">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Hello, {user?.fullName?.split(' ')[0]} 👋</h1>
                    <p className="text-gray-500 mt-2">Here is a summary of your workspace and commissions.</p>
                </div>
                <div className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100">
                    <Calendar size={18} className="text-indigo-500" />
                    <select 
                        className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer pr-2"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    >
                        <option value="ALL">All Time</option>
                        <option value="THIS_MONTH">This Month</option>
                        <option value="LAST_MONTH">Last Month</option>
                        <option value="THIS_YEAR">This Year</option>
                    </select>
                </div>
            </div>

            <AnnouncementWidget />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">My Prospects</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats?.financial?.salesCount || 0}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Converted Clients</p>
                        <h3 className="text-2xl font-bold text-gray-900">{mData.recentClients.length}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Paid Commissions ({stats?.financial?.commissionRate}%)</p>
                        <h3 className="text-2xl font-bold text-green-600">{formatCurrency(stats?.financial?.paidCommissions || 0)}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Pending Comms.</p>
                        <h3 className="text-xl font-bold text-amber-500">{formatCurrency(stats?.financial?.pendingCommissions || 0)}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4 lg:col-span-1 md:col-span-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm border border-emerald-100">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider mb-1">Total Sales Generated</p>
                        <h3 className="text-2xl font-black text-emerald-600 drop-shadow-sm">{formatCurrency(stats?.financial?.totalSalesGenerated || 0)}</h3>
                        <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">Approved Only</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Panel: Recent Entities */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800">Pipeline Activity</h2>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveTab('clients')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'clients' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Latest Clients
                                </button>
                                <button
                                    onClick={() => setActiveTab('prospects')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'prospects' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Fresh Prospects
                                </button>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {(activeTab === 'clients' ? mData.recentClients : mData.recentProspects).map((item: any) => (
                                <div key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                            {item.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{item.fullName}</p>
                                            <p className="text-sm text-gray-500">{item.phone || 'No phone'} • Added {formatDate(item.date)}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openQuickMessage(item)}
                                        className="text-sm px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center"
                                    >
                                        Message <ChevronRight size={16} className="ml-1" />
                                    </button>
                                </div>
                            ))}
                            {(activeTab === 'clients' ? mData.recentClients : mData.recentProspects).length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    No {activeTab} found yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Recent Payments Made by Clients */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800">Recent Client Payments</h2>
                        </div>
                        <div className="p-2">
                            {mData.recentPayments.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No recent payments</div>
                            ) : (
                                <div className="space-y-1">
                                    {mData.recentPayments.map((p: any) => (
                                        <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                                    <CreditCard size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{p.clientName}</p>
                                                    <p className="text-xs text-gray-500">{p.product}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-600">+{formatCurrency(p.amount)}</p>
                                                <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Commissions Tracking Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Due Commissions */}
                <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                     <div className="px-6 py-5 border-b border-orange-100 bg-orange-50/50">
                        <h2 className="text-lg font-bold text-orange-800">Due Commissions</h2>
                        <p className="text-xs text-orange-600/70">Approved & Awaiting Accountant Disbursement</p>
                    </div>
                    <div className="p-2">
                        {mData.detailedDueCommissions?.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">No commissions due at this time</div>
                        ) : (
                            <div className="space-y-1">
                                {mData.detailedDueCommissions?.map((c: any) => (
                                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-orange-50/30 rounded-xl transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{c.clientName}</p>
                                            <p className="text-xs text-gray-500">{c.product}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-orange-500">{formatCurrency(c.commission)}</p>
                                            <p className="text-xs text-gray-400">Payment: {formatCurrency(c.amount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Paid Commissions */}
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                     <div className="px-6 py-5 border-b border-emerald-100 bg-emerald-50/50">
                        <h2 className="text-lg font-bold text-emerald-800">Paid Commissions</h2>
                        <p className="text-xs text-emerald-600/70">Successfully Disbursed</p>
                    </div>
                    <div className="p-2">
                        {mData.detailedPaidCommissions?.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">No paid commissions found</div>
                        ) : (
                            <div className="space-y-1">
                                {mData.detailedPaidCommissions?.map((c: any) => (
                                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-emerald-50/30 rounded-xl transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{c.clientName}</p>
                                            <p className="text-xs text-gray-500">{c.product}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-600">{formatCurrency(c.commission)}</p>
                                            <p className="text-[10px] uppercase font-bold text-emerald-600/50 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Paid {formatDate(c.date)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                            <input type="radio" value="SMS" checked={messageType === 'SMS'} onChange={() => setMessageType('SMS')} className="text-indigo-600 focus:ring-indigo-500" />
                                            <span className="text-sm text-gray-700">SMS</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="radio" value="EMAIL" checked={messageType === 'EMAIL'} onChange={() => setMessageType('EMAIL')} className="text-indigo-600 focus:ring-indigo-500" />
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
                                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                                        className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center disabled:opacity-50"
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
        </div>
    );
};
