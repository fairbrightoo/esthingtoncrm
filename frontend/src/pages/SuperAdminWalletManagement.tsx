import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ShieldAlert, 
    Settings, 
    Gift, 
    Users, 
    CreditCard, 
    DollarSign, 
    Search, 
    CheckCircle, 
    Save, 
    RefreshCcw, 
    X, 
    TrendingUp, 
    Wallet 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface TariffData {
    smsRatePerPage: number;
    emailRatePerMsg: number;
    waRatePerMsg: number;
    minTopupAmount: number;
    defaultWelcomeCredit: number;
}

interface StatsData {
    totalWallets: number;
    totalSystemBalance: number;
    totalRecharged: number;
    totalSpent: number;
}

interface StaffUser {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    role: string;
    company?: { id: string; name: string };
    branch?: { id: string; name: string };
    wallet?: {
        id: string;
        balance: number;
        currency: string;
        updatedAt: string;
    };
    walletTransactions?: any[];
}

export const SuperAdminWalletManagement = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [tariff, setTariff] = useState<TariffData>({
        smsRatePerPage: 9.50,
        emailRatePerMsg: 2.50,
        waRatePerMsg: 15.00,
        minTopupAmount: 3000.00,
        defaultWelcomeCredit: 100.00
    });

    const [stats, setStats] = useState<StatsData>({
        totalWallets: 0,
        totalSystemBalance: 0,
        totalRecharged: 0,
        totalSpent: 0
    });

    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingTariff, setIsSavingTariff] = useState(false);

    // Gift Modal State
    const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
    const [giftAmount, setGiftAmount] = useState<string>('1000');
    const [giftNote, setGiftNote] = useState<string>('Performance Allowance');
    const [isGifting, setIsGifting] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        if (user?.role === 'SUPER_ADMIN') {
            loadAdminData();
        }
    }, [user]);

    const loadAdminData = async () => {
        setIsLoading(true);
        try {
            const [tariffRes, staffRes] = await Promise.all([
                axios.get(`${API_URL}/api/wallet/admin/tariff`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${API_URL}/api/wallet/admin/staff-wallets`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            if (tariffRes.data?.tariff) {
                setTariff(tariffRes.data.tariff);
            }
            if (tariffRes.data?.stats) {
                setStats(tariffRes.data.stats);
            }
            setStaffList(staffRes.data || []);
        } catch (error: any) {
            console.error("Failed to load admin wallet data:", error);
            toast.error("Failed to load wallet configuration and staff balances");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTariff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingTariff(true);
        try {
            const res = await axios.put(`${API_URL}/api/wallet/admin/tariff`, tariff, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success(res.data.message || "Tariff configuration updated successfully!");
        } catch (error: any) {
            console.error("Update Tariff Error:", error);
            toast.error(error.response?.data?.error || "Failed to update tariffs");
        } finally {
            setIsSavingTariff(false);
        }
    };

    const handleOpenGiftModal = (staff: StaffUser) => {
        setSelectedStaff(staff);
        setGiftAmount('1000');
        setGiftNote('Admin Special Allowance');
        setIsGiftModalOpen(true);
    };

    const handleConfirmGift = async () => {
        if (!selectedStaff) return;
        const amt = Number(giftAmount);
        if (!amt || amt <= 0) {
            toast.error("Please enter a valid gift amount greater than 0");
            return;
        }

        setIsGifting(true);
        try {
            const res = await axios.post(`${API_URL}/api/wallet/admin/gift`, {
                targetUserId: selectedStaff.id,
                amount: amt,
                note: giftNote
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            toast.success(res.data.message || `Gifted ₦${amt.toLocaleString()} to ${selectedStaff.fullName}`);
            setIsGiftModalOpen(false);
            loadAdminData();
        } catch (error: any) {
            console.error("Gift balance error:", error);
            toast.error(error.response?.data?.error || "Failed to gift balance to staff");
        } finally {
            setIsGifting(false);
        }
    };

    if (user?.role !== 'SUPER_ADMIN') {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center">
                <div className="bg-red-50 border border-red-200 rounded-3xl p-8">
                    <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-900">Access Restricted</h2>
                    <p className="text-sm text-red-700 mt-2">
                        Messaging Tariff Governance and Staff Wallet Gifting are accessible <strong>solely to the Super Administrator</strong>.
                    </p>
                </div>
            </div>
        );
    }

    const filteredStaff = staffList.filter(s => {
        const matchesSearch = 
            s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.branch?.name && s.branch.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-tr from-indigo-700 to-indigo-950 text-white rounded-2xl shadow-lg shadow-indigo-900/30">
                            <Settings className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                                    Messaging Tariff & Wallet Control
                                </h1>
                                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                                    Super Admin Sole Authority
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">
                                Configure unit rates for SMS/Email/WhatsApp, manage minimum top-up thresholds, and gift staff messaging balances.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={loadAdminData}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                >
                    <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Stats
                </button>
            </div>

            {/* System Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Staff Wallets</p>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalWallets}</h3>
                        <p className="text-xs text-gray-500 mt-1">Across all branches & companies</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Outstanding Balances</p>
                        <h3 className="text-2xl font-black text-indigo-600 mt-1">₦{stats.totalSystemBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p className="text-xs text-gray-500 mt-1">Combined staff balance pool</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Paystack Recharges</p>
                        <h3 className="text-2xl font-black text-emerald-600 mt-1">₦{stats.totalRecharged.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p className="text-xs text-gray-500 mt-1">Settled into owner account</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <CreditCard className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Messages Sent (Spent)</p>
                        <h3 className="text-2xl font-black text-purple-600 mt-1">₦{stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p className="text-xs text-gray-500 mt-1">Depleted from staff wallets</p>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Master Tariff Configuration Form */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Master Tariff & Threshold Controls</h2>
                        <p className="text-xs text-gray-500">
                            Set group pricing per outbound channel. All campaign and direct messages will be metered against these rates.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSaveTariff} className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* SMS Tariff */}
                        <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                SMS Tariff (₦ per 160-char page)
                            </label>
                            <p className="text-xs text-gray-500 mb-3">Base Termii cost: ~₦4.00. Default: ₦9.50</p>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                <input
                                    type="number"
                                    step="0.10"
                                    min="0"
                                    value={tariff.smsRatePerPage}
                                    onChange={(e) => setTariff({ ...tariff, smsRatePerPage: parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email Tariff */}
                        <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Email Tariff (₦ per recipient)
                            </label>
                            <p className="text-xs text-gray-500 mb-3">Base Resend cost: ~₦0.20. Default: ₦2.50</p>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                <input
                                    type="number"
                                    step="0.10"
                                    min="0"
                                    value={tariff.emailRatePerMsg}
                                    onChange={(e) => setTariff({ ...tariff, emailRatePerMsg: parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* WhatsApp Tariff */}
                        <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                WhatsApp Meta Tariff (₦ per message)
                            </label>
                            <p className="text-xs text-gray-500 mb-3">Meta conversation rate: ~₦10.50. Default: ₦15.00</p>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                <input
                                    type="number"
                                    step="0.50"
                                    min="0"
                                    value={tariff.waRatePerMsg}
                                    onChange={(e) => setTariff({ ...tariff, waRatePerMsg: parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* Minimum Topup */}
                        <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Minimum Top-Up Threshold (₦)
                            </label>
                            <p className="text-xs text-gray-500 mb-3">Minimum recharge via Paystack. Default: ₦3,000</p>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                <input
                                    type="number"
                                    step="100"
                                    min="500"
                                    value={tariff.minTopupAmount}
                                    onChange={(e) => setTariff({ ...tariff, minTopupAmount: parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Welcome Credit */}
                        <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                Default Welcome / Initial Balance (₦)
                            </label>
                            <p className="text-xs text-gray-500 mb-3">Automatically granted to new staff registrations. Default: ₦100</p>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                <input
                                    type="number"
                                    step="10"
                                    min="0"
                                    value={tariff.defaultWelcomeCredit}
                                    onChange={(e) => setTariff({ ...tariff, defaultWelcomeCredit: parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSavingTariff}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isSavingTariff ? 'Saving Changes...' : 'Save Tariff Settings'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Staff Wallets Directory */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Staff Wallets Directory</h2>
                        <p className="text-xs text-gray-500">Inspect staff balances and gift marketing funds directly</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search staff name or branch..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Role Filter */}
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="MARKETER">Marketer</option>
                            <option value="TEAM_LEAD">Team Lead</option>
                            <option value="BDM">BDM</option>
                            <option value="HEAD_BDD">Head BDD</option>
                            <option value="BRANCH_ADMIN">Branch Admin</option>
                            <option value="MANAGING_DIRECTOR">Managing Director</option>
                            <option value="GENERAL_MANAGER">General Manager</option>
                            <option value="CUSTOMER_CARE">Customer Care (Sponsored)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/75 text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                            <tr>
                                <th className="py-3.5 px-6">Staff Member</th>
                                <th className="py-3.5 px-6">Branch / Workspace</th>
                                <th className="py-3.5 px-6">Role</th>
                                <th className="py-3.5 px-6 text-right">Wallet Balance</th>
                                <th className="py-3.5 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400">
                                        No staff members match the selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map((staff) => {
                                    const isCC = staff.role === 'CUSTOMER_CARE';
                                    const balance = staff.wallet?.balance ?? 0;
                                    return (
                                        <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="font-bold text-gray-900">{staff.fullName}</div>
                                                <div className="text-xs text-gray-500">{staff.email}</div>
                                            </td>
                                            <td className="py-4 px-6 text-gray-700 text-xs">
                                                {staff.branch?.name || staff.company?.name || 'Head Office'}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    isCC 
                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                        : 'bg-indigo-50 text-indigo-700'
                                                }`}>
                                                    {staff.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right font-bold">
                                                {isCC ? (
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                                        Sponsored
                                                    </span>
                                                ) : (
                                                    <span className={balance < 100 ? 'text-amber-600' : 'text-gray-900'}>
                                                        ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleOpenGiftModal(staff)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                                                >
                                                    <Gift className="w-3.5 h-3.5" />
                                                    Gift Balance
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gift Balance Modal */}
            {isGiftModalOpen && selectedStaff && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsGiftModalOpen(false)}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Gift className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Gift Balance to Staff</h3>
                                <p className="text-xs text-gray-500">Credit staff messaging wallet immediately</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="text-xs text-gray-500">Recipient</div>
                                <div className="text-sm font-bold text-gray-900 mt-0.5">{selectedStaff.fullName}</div>
                                <div className="text-xs text-gray-500">{selectedStaff.email} &middot; {selectedStaff.role}</div>
                                <div className="text-xs font-semibold text-indigo-600 mt-2">
                                    Current Balance: ₦{(selectedStaff.wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Gift Amount (₦)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                    <input
                                        type="number"
                                        min="10"
                                        step="50"
                                        value={giftAmount}
                                        onChange={(e) => setGiftAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 2000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Reason / Administrative Note
                                </label>
                                <input
                                    type="text"
                                    value={giftNote}
                                    onChange={(e) => setGiftNote(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Top Marketer Monthly Reward"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsGiftModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmGift}
                                    disabled={isGifting}
                                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                                >
                                    {isGifting ? 'Crediting...' : `Confirm Gift ₦${Number(giftAmount || 0).toLocaleString()}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
