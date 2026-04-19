import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Building2, Save, FileText, CheckCircle, Calculator, Wallet, Receipt } from 'lucide-react';

export const AccountantTaxCompliance = () => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    
    // States
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<any>(null);

    // Form
    const [isRemitting, setIsRemitting] = useState(false);
    const [taxType, setTaxType] = useState('VAT');
    const [amount, setAmount] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');

    const fetchEstimates = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:3000/api/taxes/estimates?month=${month}&year=${year}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
            if (taxType === 'VAT') setAmount(res.data.estimatedVat.toString());
            if (taxType === 'WHT') setAmount(res.data.estimatedWht.toString());
        } catch (error) {
            console.error(error);
            addToast("Failed to fetch tax compliance data", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEstimates();
    }, [month, year, token]);

    const handleRemit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsRemitting(true);
        try {
            await axios.post('http://localhost:3000/api/taxes/remittance', {
                taxType,
                amount,
                applicablePeriod: `${month}/${year}`,
                receiptUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast(`${taxType} payment logged successfully`, "success");
            setAmount('');
            setReceiptUrl('');
            fetchEstimates(); // refresh ledger
        } catch (error) {
            console.error(error);
            addToast("Failed to log remittance", "error");
        } finally {
            setIsRemitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Tax & Statutory Compliance</h1>
                    <p className="text-gray-500">Calculate liabilities and log official remittances for government compliance.</p>
                </div>
                <div className="mt-4 md:mt-0 flex space-x-2">
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="border border-gray-300 rounded-lg px-3 py-2 outline-none font-medium text-gray-700 bg-white shadow-sm"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select 
                        value={year} 
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="border border-gray-300 rounded-lg px-3 py-2 outline-none font-medium text-gray-700 bg-white shadow-sm"
                    >
                        {[year-1, year, year+1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </header>

            {loading ? (
                <div className="p-10 text-center text-gray-500 font-medium animate-pulse">Running financial compliance algorithms...</div>
            ) : data ? (
                <>
                    {/* KPI Headers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <Wallet size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Base Gross Revenue</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">₦{data.totalRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                                <Calculator size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Estimated VAT (7.5%)</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">₦{data.estimatedVat.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Estimated WHT (5%)</p>
                                <p className="text-2xl font-bold text-orange-600 mt-1">₦{data.estimatedWht.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Audit Ledger */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800 flex items-center">
                                    <Receipt size={18} className="mr-2 text-gray-500" /> Remittance Ledger
                                </h3>
                            </div>
                            <div className="p-0">
                                {data.remittances.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400">No remittances logged for this period.</div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-3 font-medium">Date Logged</th>
                                                <th className="px-6 py-3 font-medium">Type</th>
                                                <th className="px-6 py-3 font-medium text-right">Amount</th>
                                                <th className="px-6 py-3 font-medium">Auditor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {data.remittances.map((rem: any) => (
                                                <tr key={rem.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-6 py-3 text-gray-600">{new Date(rem.remittedAt).toLocaleDateString()}</td>
                                                    <td className="px-6 py-3">
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">{rem.taxType}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-bold text-gray-900">₦{rem.amount.toLocaleString()}</td>
                                                    <td className="px-6 py-3 text-gray-500">{rem.remittedBy?.fullName}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Payment Logger */}
                        <form onSubmit={handleRemit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full space-y-4">
                            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-2">Log Official Payment</h3>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tax Type</label>
                                    <select 
                                        value={taxType} 
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            setTaxType(type);
                                            itemAmountCalc(type);
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="VAT">Value Added Tax (VAT)</option>
                                        <option value="WHT">Withholding Tax (WHT)</option>
                                        <option value="PAYE">PAYE (Income Tax)</option>
                                        <option value="PENSION">Pension Remittance</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Actual Amount Remitted (₦)</label>
                                    <input 
                                        required 
                                        type="number" 
                                        value={amount} 
                                        onChange={e => setAmount(e.target.value)} 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                        placeholder="e.g. 150000" 
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Must match exact bank debit.</p>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Receipt URL / Ref (Optional)</label>
                                    <div className="flex bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                        <div className="px-3 py-2 text-gray-400"><FileText size={16} /></div>
                                        <input 
                                            type="text" 
                                            value={receiptUrl} 
                                            onChange={e => setReceiptUrl(e.target.value)} 
                                            className="w-full px-2 py-2 text-sm outline-none bg-transparent" 
                                            placeholder="Remita RRR or link" 
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={isRemitting || !amount}
                                className="w-full flex justify-center items-center gap-2 bg-gray-900 text-white font-medium py-2 rounded-lg hover:bg-black transition shadow-sm disabled:opacity-50"
                            >
                                <CheckCircle size={18} />
                                {isRemitting ? 'Recording...' : 'File Remittance'}
                            </button>
                        </form>
                    </div>
                </>
            ) : null}
            
            {/* Logic helper */}
            <div className="hidden">
                {(() => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    window._hackTaxTypeItemSet = (type: string) => {
                        if (data) {
                            if (type === 'VAT') setAmount(data.estimatedVat.toString());
                            else if (type === 'WHT') setAmount(data.estimatedWht.toString());
                            else setAmount('');
                        }
                    }
                })()}
            </div>
        </div>
    );

    function itemAmountCalc(type: string) {
        if (data) {
            if (type === 'VAT') setAmount(data.estimatedVat.toString());
            else if (type === 'WHT') setAmount(data.estimatedWht.toString());
            else setAmount('');
        }
    }
};
