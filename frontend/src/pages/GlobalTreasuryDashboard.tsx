import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Building2, CheckCircle2, Search, Filter,
    Download, Clock, CheckSquare, XSquare, Briefcase, Landmark, AlertCircle, Paperclip
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

export default function GlobalTreasuryDashboard() {
    const { token, user } = useAuth();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState<'APPROVALS' | 'COMMISSIONS' | 'HISTORY'>('APPROVALS');
    const [companies, setCompanies] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    
    // Filters
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Data
    const [approvals, setApprovals] = useState<{ payments: any[], requisitions: any[] }>({ payments: [], requisitions: [] });
    const [history, setHistory] = useState<{ payments: any[], requisitions: any[] }>({ payments: [], requisitions: [] });
    const [commissions, setCommissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Bulk selection for commissions
    const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
    const [isMarkingPaid, setIsMarkingPaid] = useState(false);

    // Override Modal
    const [overrideModal, setOverrideModal] = useState<{isOpen: boolean, type: 'PAYMENT'|'REQUISITION', data: any, isLoading: boolean}>({
        isOpen: false, type: 'PAYMENT', data: null, isLoading: false
    });

    useEffect(() => {
        if (!token) return;
        fetchCompanies();
    }, [token]);

    useEffect(() => {
        if (selectedCompanyId) {
            const comp = companies.find(c => c.id === selectedCompanyId);
            setBranches(comp?.branches || []);
            setSelectedBranchId('');
        } else {
            setBranches([]);
            setSelectedBranchId('');
        }
    }, [selectedCompanyId, companies]);

    useEffect(() => {
        if (token) {
            if (activeTab === 'APPROVALS') fetchApprovals();
            else if (activeTab === 'COMMISSIONS') fetchCommissions();
            else if (activeTab === 'HISTORY') fetchHistory();
        }
    }, [token, activeTab, selectedCompanyId, selectedBranchId, dateRange]);

    const fetchCompanies = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/with-branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompanies(res.data);
        } catch (error) {
            console.error("Failed to load companies");
        }
    };

    const fetchApprovals = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCompanyId) params.append('companyId', selectedCompanyId);
            if (selectedBranchId) params.append('branchId', selectedBranchId);

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/global-treasury/pending-approvals?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApprovals(res.data);
        } catch (error) {
            addToast("Failed to fetch pending approvals", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCompanyId) params.append('companyId', selectedCompanyId);
            if (selectedBranchId) params.append('branchId', selectedBranchId);

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/global-treasury/approval-history?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (error) {
            addToast("Failed to fetch approval history", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCompanyId) params.append('companyId', selectedCompanyId);
            if (selectedBranchId) params.append('branchId', selectedBranchId);
            if (dateRange.start) params.append('startDate', dateRange.start);
            if (dateRange.end) params.append('endDate', dateRange.end);

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/global-treasury/commissions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCommissions(res.data);
            setSelectedCommissions([]); // Reset selections on fetch
        } catch (error) {
            addToast("Failed to fetch pending commissions", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveOverride = async () => {
        if (!overrideModal.data) return;
        setOverrideModal(prev => ({ ...prev, isLoading: true }));
        try {
            if (overrideModal.type === 'PAYMENT') {
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/global-treasury/payments/${overrideModal.data.id}/approve`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                addToast("Payment Override Approved successfully", "success");
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/global-treasury/requisitions/${overrideModal.data.id}/approve`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                addToast("Requisition Override Approved successfully", "success");
            }
            setOverrideModal({ isOpen: false, type: 'PAYMENT', data: null, isLoading: false });
            fetchApprovals();
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to execute override", "error");
            setOverrideModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleBulkMarkPaid = async () => {
        if (selectedCommissions.length === 0) return;
        if (!confirm(`Are you sure you want to mark ${selectedCommissions.length} commissions as Paid?`)) return;

        setIsMarkingPaid(true);
        try {
            // Reconstruct the expected payload: [{ paymentId, type }]
            const payoutsPayload = selectedCommissions.map(key => {
                const [paymentId, type] = key.split('|');
                return { paymentId, type };
            });

            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/global-treasury/commissions/bulk-mark-paid`, 
                { payouts: payoutsPayload }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            addToast(res.data.message, "success");
            fetchCommissions();
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to mark commissions as paid", "error");
        } finally {
            setIsMarkingPaid(false);
        }
    };

    const toggleCommissionSelection = (key: string) => {
        setSelectedCommissions(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleSelectAll = () => {
        if (selectedCommissions.length === commissions.length) {
            setSelectedCommissions([]);
        } else {
            setSelectedCommissions(commissions.map(c => `${c.paymentId}|${c.type}`));
        }
    };

    // Exports
    const exportCommissionsCSV = () => {
        const data = commissions.map(c => ({
            "Company": c.companyName,
            "Branch": c.branchName,
            "Type": c.type,
            "Name": c.name,
            "Email": c.email,
            "Bank Name": c.bankName || 'N/A',
            "Account Name": c.accountName || 'N/A',
            "Account No": c.accountNumber || 'N/A',
            "Plot": c.plotNumber,
            "Date": new Date(c.date).toLocaleDateString(),
            "Rate (%)": c.rate,
            "Commission Amount (NGN)": c.commissionAmount
        }));
        
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "Pending_Commissions.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportCommissionsPDF = () => {
        const doc = new jsPDF('landscape');
        doc.text("Pending Commission Payouts", 14, 15);
        autoTable(doc, {
            startY: 25,
            head: [['Company', 'Branch', 'Type', 'Name', 'Bank Details', 'Amount (NGN)']],
            body: commissions.map(c => [
                c.companyName,
                c.branchName,
                c.type,
                c.name,
                `${c.bankName || 'N/A'}\n${c.accountNumber || 'N/A'}`,
                `N${c.commissionAmount.toLocaleString()}`
            ]),
        });
        doc.save("Pending_Commissions.pdf");
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-inter text-slate-800">
            {/* Header Ribbon */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
                        <Landmark className="mr-3 text-indigo-600" size={32} />
                        Global Treasury
                    </h1>
                    <p className="text-slate-500 mt-1">Oversight and interventions for enterprise financial operations.</p>
                </div>
            </div>

            {/* Global Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 mb-8">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Subsidiary / Company</label>
                    <select 
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-slate-50"
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                    >
                        <option value="">All Subsidiaries</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Branch / Location</label>
                    <select 
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-slate-50"
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        disabled={!selectedCompanyId}
                    >
                        <option value="">All Branches</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                {activeTab === 'COMMISSIONS' && (
                    <>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Start Date</label>
                            <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-slate-50"
                                value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">End Date</label>
                            <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-slate-50"
                                value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} />
                        </div>
                    </>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6 bg-slate-100 p-1.5 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('APPROVALS')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                        activeTab === 'APPROVALS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Pending Approvals
                </button>
                <button 
                    onClick={() => setActiveTab('COMMISSIONS')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                        activeTab === 'COMMISSIONS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Commission Payouts
                </button>
                <button 
                    onClick={() => setActiveTab('HISTORY')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                        activeTab === 'HISTORY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Approval History
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : activeTab === 'APPROVALS' ? (
                <div className="space-y-8">
                    {/* Customer Payments Grid */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Briefcase className="mr-2 text-blue-500" size={24}/> Pending Customer Payments</h2>
                        {approvals.payments.length === 0 ? (
                            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-500">No pending customer payments.</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {approvals.payments.map((p: any) => (
                                    <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">{p.sale?.plot?.estate?.company?.name || 'HQ'}{p.sale?.plot?.estate?.branch ? ` - ${p.sale.plot.estate.branch.name}` : ''}</span>
                                                <h3 className="font-bold text-lg text-slate-800 mt-2">₦{p.amount.toLocaleString()}</h3>
                                                <p className="text-sm text-slate-500">Recorded by: {p.recordedByUser?.fullName}</p>
                                            </div>
                                            <span className="flex items-center text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full"><Clock size={12} className="mr-1"/> PENDING</span>
                                        </div>
                                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mb-4">
                                            <p><span className="font-medium text-slate-800">Client:</span> {p.sale?.lead?.fullName}</p>
                                            <p><span className="font-medium text-slate-800">Plot:</span> {p.sale?.plotNumber || p.sale?.plot?.plotNumber}</p>
                                            <p><span className="font-medium text-slate-800">Method:</span> {p.method} | <span className="font-medium text-slate-800">Ref:</span> {p.reference || 'N/A'}</p>
                                            <p><span className="font-medium text-slate-800">Bank Paid To:</span> {p.accountPaidTo || 'N/A'}</p>
                                            {p.proofOfPaymentUrl && (
                                                <a href={p.proofOfPaymentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs inline-flex items-center mt-2">
                                                    <Paperclip size={12} className="mr-1" /> View Receipt
                                                </a>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => setOverrideModal({ isOpen: true, type: 'PAYMENT', data: p, isLoading: false })}
                                            className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-indigo-600 transition shadow shadow-slate-200"
                                        >
                                            Override & Approve
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Expense Requisitions Grid */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Landmark className="mr-2 text-rose-500" size={24}/> Pending Expense Requisitions</h2>
                        {approvals.requisitions.length === 0 ? (
                            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-500">No pending requisitions requiring approval.</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {approvals.requisitions.map((req: any) => {
                                    const totalAmount = req.items?.reduce((sum: number, item: any) => sum + item.totalPrice, 0) || 0;
                                    return (
                                        <div key={req.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md uppercase tracking-wider">{req.company?.name || 'HQ'}{req.branch ? ` - ${req.branch.name}` : ''}</span>
                                                    <h3 className="font-bold text-lg text-slate-800 mt-2">{req.title}</h3>
                                                    <p className="text-sm text-slate-500">Total: ₦{totalAmount.toLocaleString()}</p>
                                                </div>
                                                <span className="flex items-center text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full"><Clock size={12} className="mr-1"/> PENDING MD</span>
                                            </div>
                                            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mb-4">
                                                <p><span className="font-medium text-slate-800">Category:</span> {req.category}</p>
                                                <p><span className="font-medium text-slate-800">Requested By:</span> {req.requestedByUser?.name}</p>
                                                <p className="mt-1 line-clamp-2"><span className="font-medium text-slate-800">Desc:</span> {req.description}</p>
                                            </div>
                                            <button 
                                                onClick={() => setOverrideModal({ isOpen: true, type: 'REQUISITION', data: req, isLoading: false })}
                                                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-rose-600 transition shadow shadow-slate-200"
                                            >
                                                Override & Approve
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'COMMISSIONS' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-wrap gap-4">
                        <div className="flex items-center space-x-3">
                            <h2 className="font-bold text-slate-800 text-lg">Pending Commission Payouts</h2>
                            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{commissions.length} items</span>
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={exportCommissionsCSV} className="flex items-center px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl font-medium text-sm transition">
                                <Download size={16} className="mr-2" /> Excel
                            </button>
                            <button onClick={exportCommissionsPDF} className="flex items-center px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-medium text-sm transition">
                                <Download size={16} className="mr-2" /> PDF
                            </button>
                            <button 
                                onClick={handleBulkMarkPaid}
                                disabled={selectedCommissions.length === 0 || isMarkingPaid}
                                className="flex items-center px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium text-sm shadow-md shadow-indigo-200 transition disabled:opacity-50"
                            >
                                <CheckCircle2 size={16} className="mr-2" /> 
                                {isMarkingPaid ? 'Processing...' : `Mark Paid (${selectedCommissions.length})`}
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 font-semibold w-10">
                                        <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={selectedCommissions.length === commissions.length && commissions.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-5 py-3 font-semibold">Beneficiary</th>
                                    <th className="px-5 py-3 font-semibold">Bank Details</th>
                                    <th className="px-5 py-3 font-semibold">Origin</th>
                                    <th className="px-5 py-3 font-semibold text-right">Commission Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {commissions.length === 0 ? (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No pending commissions found for these filters.</td></tr>
                                ) : commissions.map(c => {
                                    const key = `${c.paymentId}|${c.type}`;
                                    return (
                                        <tr key={key} className={`hover:bg-slate-50 transition ${selectedCommissions.includes(key) ? 'bg-indigo-50/30' : ''}`}>
                                            <td className="px-5 py-4">
                                                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    checked={selectedCommissions.includes(key)}
                                                    onChange={() => toggleCommissionSelection(key)}
                                                />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-slate-800">{c.name}</div>
                                                <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">{c.type}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-medium text-slate-800">{c.bankName || <span className="text-slate-400 italic">Not specified</span>}</div>
                                                <div className="text-slate-600 text-xs mt-0.5">{c.accountNumber ? `${c.accountNumber} - ${c.accountName}` : ''}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-slate-800">{c.companyName}</div>
                                                <div className="text-xs text-slate-500">{c.branchName} | Plot {c.plotNumber}</div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="font-bold text-indigo-600 text-base">₦{c.commissionAmount.toLocaleString()}</div>
                                                <div className="text-xs text-slate-500">Rate: {c.rate}%</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Customer Payments History Grid */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Briefcase className="mr-2 text-emerald-500" size={24}/> Approved Customer Payments</h2>
                        {history.payments.length === 0 ? (
                            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-500">No payment history found.</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {history.payments.map((p: any) => (
                                    <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider">{p.sale?.plot?.estate?.company?.name || 'HQ'}{p.sale?.plot?.estate?.branch ? ` - ${p.sale.plot.estate.branch.name}` : ''}</span>
                                                <h3 className="font-bold text-lg text-slate-800 mt-2">₦{p.amount.toLocaleString()}</h3>
                                                <p className="text-sm text-slate-500">Recorded by: {p.recordedByUser?.fullName}</p>
                                            </div>
                                            <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"><CheckCircle2 size={12} className="mr-1"/> APPROVED</span>
                                        </div>
                                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                                            <p><span className="font-medium text-slate-800">Client:</span> {p.sale?.lead?.fullName}</p>
                                            <p><span className="font-medium text-slate-800">Plot:</span> {p.sale?.plotNumber || p.sale?.plot?.plotNumber}</p>
                                            <p><span className="font-medium text-slate-800">Method:</span> {p.method} | <span className="font-medium text-slate-800">Ref:</span> {p.reference || 'N/A'}</p>
                                            <p><span className="font-medium text-slate-800">Bank Paid To:</span> {p.accountPaidTo || 'N/A'}</p>
                                            {p.proofOfPaymentUrl && (
                                                <a href={p.proofOfPaymentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs inline-flex items-center mt-2">
                                                    <Paperclip size={12} className="mr-1" /> View Receipt
                                                </a>
                                            )}
                                            <p className="mt-2 text-xs text-slate-400">Approved on {new Date(p.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Expense Requisitions History Grid */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Landmark className="mr-2 text-emerald-500" size={24}/> Approved Expense Requisitions</h2>
                        {history.requisitions.length === 0 ? (
                            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm text-slate-500">No requisition history found.</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {history.requisitions.map((req: any) => {
                                    const totalAmount = req.items?.reduce((sum: number, item: any) => sum + item.totalPrice, 0) || 0;
                                    return (
                                        <div key={req.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider">{req.company?.name || 'HQ'}{req.branch ? ` - ${req.branch.name}` : ''}</span>
                                                    <h3 className="font-bold text-lg text-slate-800 mt-2">{req.title}</h3>
                                                    <p className="text-sm text-slate-500">Total: ₦{totalAmount.toLocaleString()}</p>
                                                </div>
                                                <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"><CheckCircle2 size={12} className="mr-1"/> APPROVED</span>
                                            </div>
                                            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                                                <p><span className="font-medium text-slate-800">Category:</span> {req.category}</p>
                                                <p><span className="font-medium text-slate-800">Requested By:</span> {req.requestedByUser?.name}</p>
                                                <p className="mt-1 line-clamp-2"><span className="font-medium text-slate-800">Desc:</span> {req.description}</p>
                                                <p className="mt-2 text-xs text-slate-400">Requested on {new Date(req.requestDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Override Modal */}
            {overrideModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 bg-amber-50 border-b border-amber-100">
                            <h3 className="text-xl font-black text-amber-900 flex items-center">
                                <AlertCircle className="mr-2 text-amber-600" />
                                Chairman Override
                            </h3>
                            <p className="text-sm text-amber-800/80 mt-1">This action forcefully approves the {overrideModal.type.toLowerCase()} and logs your ID as the ultimate authority.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700">
                                {overrideModal.type === 'PAYMENT' ? (
                                    <>
                                        <p><span className="font-bold">Client:</span> {overrideModal.data?.sale?.lead?.fullName}</p>
                                        <p><span className="font-bold">Amount:</span> ₦{overrideModal.data?.amount?.toLocaleString()}</p>
                                    </>
                                ) : (
                                    <>
                                        <p><span className="font-bold">Title:</span> {overrideModal.data?.title}</p>
                                        <p><span className="font-bold">Total Request:</span> ₦{overrideModal.data?.items?.reduce((s:number, i:any) => s + i.totalPrice, 0).toLocaleString()}</p>
                                    </>
                                )}
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button onClick={() => setOverrideModal({ isOpen: false, type: 'PAYMENT', data: null, isLoading: false })} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition">Cancel</button>
                                <button onClick={handleApproveOverride} disabled={overrideModal.isLoading} className="px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-medium shadow-md shadow-amber-200 transition disabled:opacity-50 flex items-center">
                                    {overrideModal.isLoading ? 'Processing...' : 'Confirm Override'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
