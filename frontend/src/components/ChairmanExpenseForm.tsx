import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, FileText, Calculator, X } from 'lucide-react';

interface RequisitionItem {
    itemRequired: string;
    qty: number;
    itemSpecification: string;
    purpose: string;
    unitPrice: number;
}

interface ChairmanExpenseFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const ChairmanExpenseForm: React.FC<ChairmanExpenseFormProps> = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('GENERAL');
    const [requestDate, setRequestDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [receiptUrl, setReceiptUrl] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [items, setItems] = useState<RequisitionItem[]>([
        { itemRequired: '', qty: 1, itemSpecification: '', purpose: '', unitPrice: 0 }
    ]);

    const token = localStorage.getItem('token');

    const handleItemChange = (index: number, field: keyof RequisitionItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { itemRequired: '', qty: 1, itemSpecification: '', purpose: '', unitPrice: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const grandTotal = items.reduce((sum, item) => sum + (item.qty * (item.unitPrice || 0)), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title) {
            setError('Please provide a Reference / Subject.');
            return;
        }

        const invalidItems = items.some(i => !i.itemRequired || i.qty <= 0 || isNaN(i.unitPrice));
        if (invalidItems) {
            setError('Please complete all line items properly.');
            return;
        }

        try {
            setLoading(true);
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/create`,
                {
                    title,
                    description,
                    category,
                    requestDate: requestDate ? new Date(requestDate).toISOString() : new Date().toISOString(),
                    items,
                    receiptUrl
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save expense.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto pt-24 pb-12">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-fadeIn relative">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-900 to-indigo-900 sticky top-0 z-10 w-full">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                            <FileText className="text-white" size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white tracking-tight">Log Personal Expense</h3>
                            <p className="text-sm text-indigo-200 mt-1">Record a disbursed expense directly into the group ledger.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors focus:outline-none">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-gray-50/50">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200 shadow-sm flex items-center">
                            <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                            {error}
                        </div>
                    )}

                    {/* Metadata Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Reference / Subject <span className="text-red-500">*</span></label>
                            <input type="text" className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-inner focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 transition-colors outline-none" 
                                value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Executive Travel Allowance" />
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Expense Date <span className="text-red-500">*</span></label>
                            <input type="date" className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-inner focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 transition-colors outline-none" 
                                value={requestDate} onChange={e => setRequestDate(e.target.value)} required />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                            <select className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-inner focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 transition-colors outline-none font-medium"
                                value={category} onChange={e => setCategory(e.target.value)}>
                                <option value="GENERAL">General Expense</option>
                                <option value="IMPREST">Imprest / Petty Cash</option>
                                <option value="FUELING">Vehicle Fueling</option>
                            </select>
                        </div>
                    </div>

                    {/* Line Items Table Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-bold text-gray-800 flex items-center">
                                <span className="w-1.5 h-6 bg-indigo-500 rounded-full mr-3"></span>
                                Expense Items
                            </h4>
                            <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors border border-indigo-100 shadow-sm">
                                <Plus size={16} /> Add Item
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 font-bold tracking-wider">
                                    <tr>
                                        <th className="px-5 py-4 min-w-[200px]">Item Description <span className="text-red-500">*</span></th>
                                        <th className="px-5 py-4 w-24">Qty <span className="text-red-500">*</span></th>
                                        <th className="px-5 py-4 min-w-[150px]">Notes</th>
                                        <th className="px-5 py-4 w-40">Unit Price (₦) <span className="text-red-500">*</span></th>
                                        <th className="px-5 py-4 w-40">Total (₦)</th>
                                        <th className="px-5 py-4 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                                            <td className="px-5 py-3">
                                                <input required type="text" className="w-full text-sm border-gray-200 bg-white shadow-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Flight Ticket"
                                                    value={item.itemRequired} onChange={e => handleItemChange(idx, 'itemRequired', e.target.value)} />
                                            </td>
                                            <td className="px-5 py-3">
                                                <input required type="number" min="1" className="w-full text-sm border-gray-200 bg-white shadow-sm rounded-lg p-2.5 text-center focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    value={item.qty} onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value))} />
                                            </td>
                                            <td className="px-5 py-3">
                                                <input type="text" className="w-full text-sm border-gray-200 bg-white shadow-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    placeholder="Abuja to Lagos"
                                                    value={item.purpose} onChange={e => handleItemChange(idx, 'purpose', e.target.value)} />
                                            </td>
                                            <td className="px-5 py-3">
                                                <input required type="number" min="0" step="0.01" className="w-full text-sm border-gray-200 bg-white shadow-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 font-mono outline-none"
                                                    value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))} />
                                            </td>
                                            <td className="px-5 py-3 font-mono font-bold text-gray-800 bg-gray-50 border-l border-gray-100">
                                                {((item.qty || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                                                    className={`p-2 rounded-xl transition ${items.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:shadow-sm'}`}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-900 text-white">
                                        <td colSpan={4} className="px-6 py-5 text-right font-bold text-gray-300 uppercase text-xs tracking-wider border-r border-gray-700">
                                            Total Expense:
                                        </td>
                                        <td colSpan={2} className="px-6 py-5 font-mono font-black text-2xl text-emerald-400 tracking-tight shadow-inner">
                                            ₦{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Optional Notes / Remarks</label>
                        <textarea className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-inner focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-4 transition-colors outline-none" 
                            rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide any extra context..."></textarea>
                    </div>

                    <div className="mt-8 pt-6 flex justify-end gap-4 sticky bottom-0 bg-gray-50/90 backdrop-blur-sm p-4 rounded-b-3xl border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <button type="button" onClick={onClose} 
                            className="px-6 py-3 text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 rounded-xl border border-gray-300 transition-colors shadow-sm">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="px-8 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95">
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Calculator size={18} />
                            )}
                            {loading ? "Saving..." : "Save & Disburse Expense"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
