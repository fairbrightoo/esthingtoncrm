import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Tag, Plus, CheckCircle, XCircle, Percent, DollarSign, Loader2 } from 'lucide-react';

interface DiscountCode {
    id: string;
    code: string;
    type: string;
    value: number;
    isActive: boolean;
    maxUses?: number | null;
    expiresAt?: string | null;
    createdAt: string;
    createdByUser: { fullName: string };
    _count: { sales: number };
}

export const MDDiscountManager = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isGenerating, setIsGenerating] = useState(false);
    const [type, setType] = useState('PERCENTAGE');
    const [value, setValue] = useState('');
    const [usageLimit, setUsageLimit] = useState<'UNLIMITED' | 'SINGLE' | 'CUSTOM'>('UNLIMITED');
    const [customUses, setCustomUses] = useState('');
    const [expiryMode, setExpiryMode] = useState<'NEVER' | 'DATE'>('NEVER');
    const [expiryDate, setExpiryDate] = useState('');

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/discounts', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDiscounts(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
            addToast("Please enter a valid numeric value greater than zero.", "warning");
            return;
        }

        setIsGenerating(true);
        let finalMaxUses: number | null = null;
        if (usageLimit === 'SINGLE') finalMaxUses = 1;
        if (usageLimit === 'CUSTOM' && customUses) finalMaxUses = parseInt(customUses);
        
        let finalExpiry = expiryMode === 'DATE' && expiryDate ? new Date(expiryDate).toISOString() : null;

        try {
            await axios.post('http://localhost:3000/api/discounts', {
                type,
                value,
                maxUses: finalMaxUses,
                expiresAt: finalExpiry,
                targetBranchId: user?.branchId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Discount Code generated successfully!", "success");
            setValue('');
            setUsageLimit('UNLIMITED');
            setExpiryMode('NEVER');
            fetchDiscounts();
        } catch (error) {
            addToast("Failed to generate code.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleStatus = async (id: string) => {
        try {
            await axios.patch(`http://localhost:3000/api/discounts/${id}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Code status updated.", "success");
            fetchDiscounts();
        } catch (error) {
            addToast("Failed to update status", "error");
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-6 text-white">
                    <h2 className="text-xl font-bold flex items-center"><Tag className="w-5 h-5 mr-2 text-blue-300" /> Discount Code Generator</h2>
                    <p className="text-blue-100 text-sm mt-1">Issue unique promotional codes. These directly reduce the final price for Marketers at checkout.</p>
                </div>
                
                <form onSubmit={handleGenerate} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Discount Type</label>
                        <select 
                            value={type} onChange={e => setType(e.target.value)}
                            className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 py-2.5 px-3 border shadow-sm"
                        >
                            <option value="PERCENTAGE">Percentage (%) Off</option>
                            <option value="FLAT">Flat NGN Fee Off</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            {type === 'PERCENTAGE' ? 'Percentage %' : 'NGN Amount'}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                {type === 'PERCENTAGE' ? <Percent size={14} /> : <span className="font-bold text-sm">₦</span>}
                            </div>
                            <input 
                                type="number" 
                                required
                                value={value} 
                                onChange={e => setValue(e.target.value)}
                                className="w-full border-gray-300 rounded-lg pl-8 pr-3 py-2.5 border shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={type === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 500000'}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Usage Limit</label>
                        <select 
                            value={usageLimit} onChange={e => setUsageLimit(e.target.value as any)}
                            className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 py-2.5 px-3 border shadow-sm"
                        >
                            <option value="UNLIMITED">Unlimited Uses</option>
                            <option value="SINGLE">Single Use Only (1)</option>
                            <option value="CUSTOM">Custom Limit</option>
                        </select>
                        {usageLimit === 'CUSTOM' && (
                            <input 
                                type="number" 
                                required
                                value={customUses} 
                                onChange={e => setCustomUses(e.target.value)}
                                className="w-full border-gray-300 rounded-lg py-2 px-3 border shadow-sm outline-none focus:ring-2 mt-2"
                                placeholder="Max times used"
                            />
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Expiration</label>
                        <select 
                            value={expiryMode} onChange={e => setExpiryMode(e.target.value as any)}
                            className="w-full border-gray-300 rounded-lg py-2.5 px-3 border shadow-sm focus:ring-blue-500"
                        >
                            <option value="NEVER">Never Expires</option>
                            <option value="DATE">Set Expiration Date</option>
                        </select>
                        {expiryMode === 'DATE' && (
                            <input 
                                type="date"
                                required
                                value={expiryDate}
                                onChange={e => setExpiryDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]} // Can't be past
                                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 outline-none mt-2"
                            />
                        )}
                    </div>

                    <div className="flex items-end">
                        <button  
                            type="submit" 
                            disabled={isGenerating}
                            className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                            Generate Code
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800">Branch Discount Codes</h3>
                </div>
                {discounts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No discount codes issued yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 font-bold text-gray-600 text-sm">Code</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm">Value</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm">Status / Limits</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm">Issuer</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm text-center">Uses</th>
                                    <th className="p-4 font-bold text-gray-600 text-sm text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {discounts.map(d => (
                                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-4">
                                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded tracking-wide">{d.code}</span>
                                        </td>
                                        <td className="p-4 font-medium text-gray-800">
                                            {d.type === 'PERCENTAGE' ? `${d.value}% OFF` : `₦${d.value.toLocaleString()} OFF`}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col space-y-1">
                                                {d.isActive ? 
                                                    <span className="w-fit inline-flex items-center text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle size={10} className="mr-1" /> ACTIVE</span> :
                                                    <span className="w-fit inline-flex items-center text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={10} className="mr-1" /> REVOKED</span>
                                                }
                                                {d.expiresAt && <span className="text-[10px] text-gray-500 font-medium">Auto-expires: {new Date(d.expiresAt).toLocaleDateString()}</span>}
                                                {d.maxUses && <span className="text-[10px] text-gray-500 font-medium">Limit: {d.maxUses} uses</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">{d.createdByUser.fullName}</td>
                                        <td className="p-4 text-center font-bold text-gray-700">{d._count.sales}</td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => toggleStatus(d.id)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded transition ${d.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                            >
                                                {d.isActive ? 'Deactivate' : 'Reactivate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
