import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Wallet, 
    CreditCard, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Gift, 
    CheckCircle, 
    AlertCircle, 
    RefreshCcw, 
    ShieldCheck, 
    Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

declare global {
    interface Window {
        PaystackPop?: any;
    }
}

interface WalletData {
    id: string;
    balance: number;
    currency: string;
    updatedAt: string;
}

interface TariffData {
    smsRatePerPage: number;
    emailRatePerMsg: number;
    waRatePerMsg: number;
    minTopupAmount: number;
    defaultWelcomeCredit: number;
}

interface Transaction {
    id: string;
    amount: number;
    balanceAfter: number;
    type: 'CREDIT' | 'DEBIT';
    category: string;
    description: string;
    reference?: string | null;
    paymentMethod?: string | null;
    channel?: string | null;
    recipientCount?: number | null;
    createdAt: string;
}

export const MyWallet = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [tariff, setTariff] = useState<TariffData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isCustomerCare, setIsCustomerCare] = useState(false);
    const [paystackPublicKey, setPaystackPublicKey] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Top-up State
    const [selectedAmount, setSelectedAmount] = useState<number>(3000);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [isCustom, setIsCustom] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Filter transactions
    const [activeTab, setActiveTab] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/wallet/my-wallet`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setWallet(res.data.wallet);
            setTariff(res.data.tariff);
            setTransactions(res.data.transactions || []);
            setIsCustomerCare(res.data.isCustomerCare || false);
            setPaystackPublicKey(res.data.paystackPublicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '');
            
            if (res.data.tariff?.minTopupAmount) {
                setSelectedAmount(res.data.tariff.minTopupAmount);
            }
        } catch (error: any) {
            console.error("Failed to load wallet data:", error);
            toast.error("Failed to load messaging wallet details");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectPreset = (amount: number) => {
        setIsCustom(false);
        setSelectedAmount(amount);
        setCustomAmount('');
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsCustom(true);
        const val = e.target.value.replace(/[^0-9]/g, '');
        setCustomAmount(val);
        setSelectedAmount(Number(val) || 0);
    };

    const minTopup = tariff?.minTopupAmount || 3000;
    const finalTopupAmount = isCustom ? Number(customAmount) : selectedAmount;
    const isValidAmount = finalTopupAmount >= minTopup;

    const initiatePaystackPayment = () => {
        if (!isValidAmount) {
            toast.error(`Minimum recharge amount is ₦${minTopup.toLocaleString()}`);
            return;
        }

        if (!paystackPublicKey) {
            toast.error("Paystack configuration key is missing. Please contact Super Admin.");
            return;
        }

        if (typeof window.PaystackPop === 'undefined') {
            toast.error("Paystack payment gateway is loading. Please refresh and try again.");
            return;
        }

        setIsProcessingPayment(true);

        const email = user?.email || 'user@esthingtoncrm.com';
        const reference = `WAL-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

        try {
            const handler = window.PaystackPop.setup({
                key: paystackPublicKey,
                email: email,
                amount: finalTopupAmount * 100, // Paystack expects amount in Kobo
                currency: 'NGN',
                ref: reference,
                metadata: {
                    userId: user?.id,
                    userName: user?.fullName,
                    purpose: 'MESSAGING_WALLET_TOPUP'
                },
                callback: function(response: { reference: string }) {
                    toast.info("Verifying transaction with Paystack...");
                    (async () => {
                        try {
                            const verifyRes = await axios.post(`${API_URL}/api/wallet/verify-topup`, {
                                reference: response.reference
                            }, {
                                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                            });

                            toast.success(verifyRes.data.message || `Wallet credited with ₦${finalTopupAmount.toLocaleString()}!`);
                            fetchWalletData();
                            setIsCustom(false);
                            setCustomAmount('');
                            setSelectedAmount(minTopup);
                        } catch (verifyErr: any) {
                            console.error("Verification error:", verifyErr);
                            toast.error(verifyErr.response?.data?.error || "Payment verification failed. Please contact admin.");
                        } finally {
                            setIsProcessingPayment(false);
                        }
                    })();
                },
                onClose: function() {
                    setIsProcessingPayment(false);
                    toast.info("Payment window closed.");
                }
            });

            handler.openIframe();
        } catch (err: any) {
            setIsProcessingPayment(false);
            console.error("Paystack initialization error:", err);
            toast.error("Failed to launch Paystack payment modal.");
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        if (activeTab === 'CREDIT') return tx.type === 'CREDIT';
        if (activeTab === 'DEBIT') return tx.type === 'DEBIT';
        return true;
    });

    const isLowBalance = (wallet?.balance || 0) < 300;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                            <Wallet className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                                Messaging Wallet
                            </h1>
                            <p className="text-sm text-gray-500">
                                Fund and manage your balance for Bulk Campaigns and Direct Lead Messaging
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={fetchWalletData}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                    <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Balance
                </button>
            </div>

            {/* Customer Care Sponsored Banner */}
            {isCustomerCare && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-2 bg-emerald-500 text-white rounded-xl">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-emerald-900">Customer Care Company-Sponsored Allowance</h3>
                        <p className="text-sm text-emerald-700 mt-0.5">
                            As a Customer Care Representative, your outbound SMS, Email, and WhatsApp messages are 100% sponsored by Esthington Group. You do not need to recharge a personal wallet.
                        </p>
                    </div>
                </div>
            )}

            {/* Top Grid: Hero Balance & Quick Recharge */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Hero Balance Card */}
                <div className="lg:col-span-5 bg-gradient-to-br from-gray-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden border border-white/10">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-indigo-300 font-bold bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                                Live Balance
                            </span>
                            <span className="text-xs text-indigo-200">
                                Currency: <strong>NGN (₦)</strong>
                            </span>
                        </div>

                        <div className="mt-6">
                            <div className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-baseline gap-1">
                                <span className="text-2xl text-indigo-300 font-bold">₦</span>
                                {isLoading ? (
                                    <div className="h-12 w-48 bg-white/10 animate-pulse rounded-lg" />
                                ) : (
                                    <span>{(wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                )}
                            </div>
                        </div>

                        {/* Balance Health Indicator */}
                        <div className="mt-4">
                            {isLowBalance ? (
                                <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Low Balance: Top-up recommended for upcoming campaigns
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Wallet Funded & Ready for Dispatch
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 mt-6 flex items-center justify-between text-xs text-indigo-200/80">
                        <span>Account Holder: <strong>{user?.fullName}</strong></span>
                        <span>Role: <strong>{user?.role}</strong></span>
                    </div>
                </div>

                {/* Instant Paystack Top-Up Card */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Instant Paystack Recharge</h2>
                                <p className="text-xs text-gray-500">
                                    Select an amount to recharge via Card, Bank Transfer, or USSD
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                Min: ₦{minTopup.toLocaleString()}
                            </span>
                        </div>

                        {/* Preset Amount Chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                            {[minTopup, 5000, 10000, 20000].map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => handleSelectPreset(amt)}
                                    className={`py-3 px-4 rounded-2xl font-bold text-sm transition-all border ${
                                        !isCustom && selectedAmount === amt
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-[1.02]'
                                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    ₦{amt.toLocaleString()}
                                </button>
                            ))}
                        </div>

                        {/* Custom Amount Input */}
                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                Or Enter Custom Amount (₦)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                <input
                                    type="text"
                                    placeholder={`e.g. ${minTopup.toLocaleString()}`}
                                    value={customAmount}
                                    onChange={handleCustomChange}
                                    className={`w-full pl-9 pr-4 py-3 rounded-2xl border text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${
                                        isCustom && !isValidAmount
                                            ? 'border-red-300 focus:ring-red-500 bg-red-50/30'
                                            : 'border-gray-200 focus:ring-indigo-500 bg-white'
                                    }`}
                                />
                            </div>
                            {isCustom && !isValidAmount && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Amount must be at least ₦{minTopup.toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Pay CTA */}
                    <div className="pt-6 border-t border-gray-100 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Secured 256-bit encrypted Paystack payment</span>
                        </div>

                        <button
                            type="button"
                            onClick={initiatePaystackPayment}
                            disabled={!isValidAmount || isProcessingPayment}
                            className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all ${
                                !isValidAmount || isProcessingPayment
                                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-500/25 hover:shadow-indigo-500/35 active:scale-[0.98]'
                            }`}
                        >
                            <CreditCard className="w-4 h-4" />
                            {isProcessingPayment 
                                ? 'Connecting Paystack...' 
                                : `Pay ₦${(finalTopupAmount || 0).toLocaleString()} Now`
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Transparent Rate Card - Temporarily Hidden */}

            {/* Transaction Ledger */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Wallet Transactions & Activity Ledger</h3>
                        <p className="text-xs text-gray-500">Audit trail of all wallet recharges, campaign debits, and balance gifts</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                        {(['ALL', 'CREDIT', 'DEBIT'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    activeTab === tab 
                                        ? 'bg-white text-gray-900 shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab === 'ALL' ? 'All' : tab === 'CREDIT' ? 'Recharges (+)' : 'Debits (-)'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/75 text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                            <tr>
                                <th className="py-3.5 px-6">Date & Time</th>
                                <th className="py-3.5 px-6">Type & Channel</th>
                                <th className="py-3.5 px-6">Description</th>
                                <th className="py-3.5 px-6 text-right">Amount</th>
                                <th className="py-3.5 px-6 text-right">Balance After</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Wallet className="w-8 h-8 text-gray-300" />
                                            <p className="text-sm font-medium">No transactions recorded yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((tx) => {
                                    const isCredit = tx.type === 'CREDIT';
                                    return (
                                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-6 text-gray-600 whitespace-nowrap">
                                                {new Date(tx.createdAt).toLocaleDateString(undefined, { 
                                                    year: 'numeric', 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className={`p-1.5 rounded-lg ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                        {isCredit ? (
                                                            tx.category === 'ADMIN_GIFT' ? <Gift className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                                        )}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-800">
                                                        {tx.category.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-gray-700 max-w-md truncate">
                                                {tx.description}
                                            </td>
                                            <td className="py-4 px-6 text-right whitespace-nowrap font-bold">
                                                <span className={isCredit ? 'text-emerald-600' : 'text-red-600'}>
                                                    {isCredit ? '+' : ''}₦{Math.abs(tx.amount).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right whitespace-nowrap font-semibold text-gray-900">
                                                ₦{(tx.balanceAfter || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
