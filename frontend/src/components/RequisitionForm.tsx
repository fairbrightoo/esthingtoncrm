import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, FileText, Calculator } from 'lucide-react';

interface RequisitionItem {
    itemRequired: string;
    qty: number;
    itemSpecification: string;
    purpose: string;
    unitPrice: number;
}

interface RequisitionFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const RequisitionForm: React.FC<RequisitionFormProps> = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    
    // Default category based on role
    const defaultCategory = user?.role === 'ACCOUNTANT' ? 'IMPREST' : 'GENERAL';
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(defaultCategory);
    const [requestDate, setRequestDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [receiptUrl, setReceiptUrl] = useState('');
    const [error, setError] = useState('');

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
            setError('Please provide a title / Reference.');
            return;
        }

        const invalidItems = items.some(i => !i.itemRequired || i.qty <= 0 || isNaN(i.unitPrice));
        if (invalidItems) {
            setError('Please complete all line items properly.');
            return;
        }

        try {
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
            setError(err.response?.data?.error || 'Failed to submit requisition.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto pt-24 pb-12">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden animate-fadeIn relative">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10 w-full">
                    <div className="flex items-center gap-3">
                        <FileText className="text-blue-500" size={24} />
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">New Requisition Form</h3>
                            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mt-1">Branch: {user?.branch?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 shadow-sm">
                            {error}
                        </div>
                    )}

                    {/* Metadata Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">REF NO / Subject <span className="text-red-500">*</span></label>
                            <input type="text" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border" 
                                value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Weekly Office Supply Replenishment" />
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Request Date <span className="text-red-500">*</span></label>
                            <input type="date" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border" 
                                value={requestDate} onChange={e => setRequestDate(e.target.value)} required />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                            <select className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border font-medium"
                                value={category} onChange={e => setCategory(e.target.value)}>
                                {user?.role === 'ACCOUNTANT' && <option value="IMPREST">Imprest / Petty Cash</option>}
                                <option value="PAYROLL">Payroll / Salary</option>
                                <option value="FUELING">Vehicle Fueling</option>
                                <option value="GENERAL">General Expense</option>
                            </select>
                        </div>
                    </div>

                    {/* Line Items Table Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-bold text-gray-800">Requisition Items</h4>
                            <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                                <Plus size={16} /> Add Row
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-gray-600 uppercase bg-gray-50 font-bold">
                                    <tr>
                                        <th className="px-4 py-3 min-w-[200px]">Item Required <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 w-24">Qty <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 min-w-[150px]">Specification</th>
                                        <th className="px-4 py-3 min-w-[150px]">Purpose</th>
                                        <th className="px-4 py-3 w-40">Unit Price (₦) <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 w-40">Total (₦)</th>
                                        <th className="px-4 py-3 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                                            <td className="px-4 py-2">
                                                <input required type="text" className="w-full text-sm border-gray-300 rounded p-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Lunch for 5 staff"
                                                    value={item.itemRequired} onChange={e => handleItemChange(idx, 'itemRequired', e.target.value)} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input required type="number" min="1" className="w-full text-sm border-gray-300 rounded p-2 border text-center focus:ring-blue-500 focus:border-blue-500"
                                                    value={item.qty} onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value))} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="text" className="w-full text-sm border-gray-300 rounded p-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="e.g., Transport"
                                                    value={item.itemSpecification} onChange={e => handleItemChange(idx, 'itemSpecification', e.target.value)} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="text" className="w-full text-sm border-gray-300 rounded p-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Audit Trip"
                                                    value={item.purpose} onChange={e => handleItemChange(idx, 'purpose', e.target.value)} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input required type="number" min="0" step="0.01" className="w-full text-sm border-gray-300 rounded p-2 border focus:ring-blue-500 focus:border-blue-500 font-mono"
                                                    value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))} />
                                            </td>
                                            <td className="px-4 py-2 font-mono font-bold text-gray-800 bg-gray-50 border-l border-gray-100">
                                                {((item.qty || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                                                    className={`p-1.5 rounded-lg transition ${items.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100">
                                        <td colSpan={5} className="px-4 py-4 text-right font-bold text-gray-600 uppercase text-xs tracking-wider">
                                            Grand Total Calculation:
                                        </td>
                                        <td colSpan={2} className="px-4 py-4 font-mono font-black text-xl text-blue-700">
                                            ₦{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Optional Notes / Remarks</label>
                            <textarea className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border" 
                                rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide any extra context..."></textarea>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                        <button type="button" onClick={onClose} 
                            className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-300 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" 
                            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
                            <Calculator size={18} />
                            Submit Requisition to MD
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
