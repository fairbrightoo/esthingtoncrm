import { useState } from 'react';
import axios from 'axios';
import { Loader2, Users, DollarSign, Clock, Send, CreditCard, ChevronRight, TrendingUp } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Pagination, getPaginatedData } from './Pagination';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateString));
};

export const SalesPerformanceTab = ({ stats, user }: { stats: any; user: any }) => {
    const { toast } = useToast();
    const token = localStorage.getItem('token');

    const [activeTab, setActiveTab] = useState<'prospects' | 'clients'>('clients');
    const [leadsPage, setLeadsPage] = useState(1);
    const [leadsRowsPerPage, setLeadsRowsPerPage] = useState(10);
    const [salesPage, setSalesPage] = useState(1);
    const [salesRowsPerPage, setSalesRowsPerPage] = useState(10);

    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [messageType, setMessageType] = useState<'SMS' | 'EMAIL'>('SMS');
    const [messageContent, setMessageContent] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;
        setSendingMsg(true);
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/send`,
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

    const mData = stats?.marketerData || { recentProspects: [], recentClients: [], recentPayments: [] };

    return (
        <div className="space-y-6 mt-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                        <Users size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 truncate">My Prospects</p>
                        <h3 className="text-2xl font-bold text-gray-900 truncate" title={String((stats?.financial?.totalLeads || 0) - (stats?.financial?.clientLeads || 0))}>
                            {(stats?.financial?.totalLeads || 0) - (stats?.financial?.clientLeads || 0)}
                        </h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                        <Users size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 truncate">Converted Clients</p>
                        <h3 className="text-2xl font-bold text-gray-900 truncate" title={String(stats?.financial?.clientLeads || 0)}>
                            {stats?.financial?.clientLeads || 0}
                        </h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl shrink-0">
                        <DollarSign size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 truncate" title={`Paid Commissions (${stats?.financial?.commissionRate || 0}%)`}>Paid Commissions ({stats?.financial?.commissionRate || 0}%)</p>
                        <h3 className="text-2xl font-bold text-green-600 truncate" title={formatCurrency(stats?.financial?.paidCommissions || 0)}>
                            {formatCurrency(stats?.financial?.paidCommissions || 0)}
                        </h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                        <Clock size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 truncate">Pending Comms.</p>
                        <h3 className="text-xl font-bold text-amber-500 truncate" title={formatCurrency(stats?.financial?.pendingCommissions || 0)}>
                            {formatCurrency(stats?.financial?.pendingCommissions || 0)}
                        </h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4 lg:col-span-1 md:col-span-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm border border-emerald-100 shrink-0">
                        <TrendingUp size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider mb-1 truncate">Total Sales Generated</p>
                        <h3 className="text-2xl font-black text-emerald-600 drop-shadow-sm truncate" title={formatCurrency(stats?.financial?.totalSalesGenerated || 0)}>
                            {formatCurrency(stats?.financial?.totalSalesGenerated || 0)}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">Approved Only</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100 shrink-0">
                        <span className="text-2xl font-black">E</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-indigo-600/70 uppercase tracking-wider mb-1 truncate">EsthCoin Balance</p>
                        <h3 className="text-2xl font-black text-indigo-600 drop-shadow-sm truncate" title={String(Number(stats?.financial?.esthCoinBalance ?? user?.esthCoinBalance ?? 0).toFixed(2))}>
                            {Number(stats?.financial?.esthCoinBalance ?? user?.esthCoinBalance ?? 0).toFixed(2)}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">Digital Rewards</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Panel: Recent Entities */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 truncate">Pipeline Activity</h2>
                            <div className="flex bg-gray-100 rounded-lg p-1 ml-4 shrink-0">
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
                            {getPaginatedData((activeTab === 'clients' ? mData.recentClients : mData.recentProspects), leadsPage, leadsRowsPerPage).map((item: any) => (
                                <div key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-4 min-w-0">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                                            {item.fullName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">{item.fullName}</p>
                                            <p className="text-sm text-gray-500 truncate">{item.phone || 'No phone'} • Added {formatDate(item.date)}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openQuickMessage(item)}
                                        className="text-sm px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center shrink-0 ml-4"
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
                        <Pagination 
                            dataLength={(activeTab === 'clients' ? mData.recentClients : mData.recentProspects).length} 
                            currentPage={leadsPage} 
                            rowsPerPage={leadsRowsPerPage} 
                            setPage={setLeadsPage} 
                            setRowsPerPage={setLeadsRowsPerPage} 
                        />
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
                                    {getPaginatedData(mData.recentPayments, salesPage, salesRowsPerPage).map((p: any) => (
                                        <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors">
                                            <div className="flex items-center space-x-3 min-w-0 pr-2">
                                                <div className="p-2 bg-green-50 text-green-600 rounded-lg shrink-0">
                                                    <CreditCard size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate" title={p.clientName}>{p.clientName}</p>
                                                    <p className="text-xs text-gray-500 truncate" title={p.product}>{p.product}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-green-600">+{formatCurrency(p.amount)}</p>
                                                <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Pagination 
                            dataLength={mData.recentPayments.length} 
                            currentPage={salesPage} 
                            rowsPerPage={salesRowsPerPage} 
                            setPage={setSalesPage} 
                            setRowsPerPage={setSalesRowsPerPage} 
                        />
                    </div>
                </div>
            </div>

            {/* Referral Commissions Tracking Panels */}
            {((stats?.financial?.paidReferralCommissions > 0 || stats?.financial?.pendingReferralCommissions > 0) || mData.detailedDueReferralCommissions?.length > 0 || mData.detailedPaidReferralCommissions?.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {/* Due Referral Commissions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-indigo-100 bg-indigo-50/50">
                            <h2 className="text-lg font-bold text-indigo-800">Due Referral Commissions</h2>
                            <p className="text-xs text-indigo-600/70">From Downline Sales • Awaiting Disbursement</p>
                        </div>
                        <div className="p-2">
                            {mData.detailedDueReferralCommissions?.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">No referral commissions due</div>
                            ) : (
                                <div className="space-y-1">
                                    {mData.detailedDueReferralCommissions?.map((c: any) => (
                                        <div key={c.id} className="p-4 flex items-center justify-between hover:bg-indigo-50/30 rounded-xl transition-colors">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-sm font-semibold text-gray-900 truncate" title={c.marketerName}>{c.marketerName}</p>
                                                <p className="text-xs text-gray-500 truncate" title={`Sold to: ${c.clientName}`}>Sold to: {c.clientName}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-indigo-600">{formatCurrency(c.commission)}</p>
                                                <p className="text-[10px] uppercase font-bold text-indigo-600/50 bg-indigo-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Pending</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Paid Referral Commissions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-blue-100 bg-blue-50/50">
                            <h2 className="text-lg font-bold text-blue-800">Paid Referral Commissions</h2>
                            <p className="text-xs text-blue-600/70">From Downline Sales • Disbursed</p>
                        </div>
                        <div className="p-2">
                            {mData.detailedPaidReferralCommissions?.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">No paid referral commissions</div>
                            ) : (
                                <div className="space-y-1">
                                    {mData.detailedPaidReferralCommissions?.map((c: any) => (
                                        <div key={c.id} className="p-4 flex items-center justify-between hover:bg-blue-50/30 rounded-xl transition-colors">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-sm font-semibold text-gray-900 truncate" title={c.marketerName}>{c.marketerName}</p>
                                                <p className="text-xs text-gray-500 truncate" title={`Sold to: ${c.clientName}`}>Sold to: {c.clientName}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-blue-600">{formatCurrency(c.commission)}</p>
                                                <p className="text-[10px] uppercase font-bold text-blue-600/50 bg-blue-100 px-2 py-0.5 rounded-full inline-block mt-0.5">Paid {formatDate(c.date)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                        <div className="min-w-0 pr-2">
                                            <p className="text-sm font-semibold text-gray-900 truncate" title={c.clientName}>{c.clientName}</p>
                                            <p className="text-xs text-gray-500 truncate" title={c.product}>{c.product}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-orange-500">{formatCurrency(c.commission)}</p>
                                            <p className="text-xs text-gray-400 truncate">Payment: {formatCurrency(c.amount)}</p>
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
                                        <div className="min-w-0 pr-2">
                                            <p className="text-sm font-semibold text-gray-900 truncate" title={c.clientName}>{c.clientName}</p>
                                            <p className="text-xs text-gray-500 truncate" title={c.product}>{c.product}</p>
                                        </div>
                                        <div className="text-right shrink-0">
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
                            <h3 className="text-lg font-bold text-gray-900 truncate" title={`Message ${selectedClient.fullName}`}>Message {selectedClient.fullName}</h3>
                            <button onClick={() => setIsMessageModalOpen(false)} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2">×</button>
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
