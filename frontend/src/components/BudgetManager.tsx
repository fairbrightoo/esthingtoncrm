import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Trash2, Calculator, CheckCircle, XCircle } from 'lucide-react';

export const BudgetManager = () => {
    const [budgets, setBudgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    const [title, setTitle] = useState('');
    const [periodType, setPeriodType] = useState('MONTHLY');
    const [periodStartDate, setPeriodStartDate] = useState('');
    const [periodEndDate, setPeriodEndDate] = useState('');
    const [items, setItems] = useState([{ category: 'Marketing', amountAllocated: 0, notes: '' }]);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');

    const fetchBudgets = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/budgets`, { headers: { Authorization: `Bearer ${token}` } });
            setBudgets(res.data);
        } catch (err) {
            console.error("Error fetching budgets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudgets();
    }, []);

    const handleAddItem = () => {
        setItems([...items, { category: '', amountAllocated: 0, notes: '' }]);
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems: any = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/budgets/create`, {
                title, periodType, periodStartDate, periodEndDate, items
            }, { headers: { Authorization: `Bearer ${token}` } });
            setIsCreating(false);
            setItems([{ category: 'Marketing', amountAllocated: 0, notes: '' }]);
            setTitle('');
            fetchBudgets();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create budget");
        }
    };

    const totalBudget = items.reduce((sum, item) => sum + (item.amountAllocated || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold tracking-tight text-gray-800">Branch Budgets</h2>
                <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 transition flex items-center gap-2">
                    <Plus size={18} /> Prepare New Budget
                </button>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Prepare Budget Submission</h3>
                        <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                    {error && <div className="text-red-600 mb-4 text-sm bg-red-50 p-3 rounded">{error}</div>}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 text-sm">
                                <label className="block text-gray-700 font-bold mb-1">Title / Name</label>
                                <input required type="text" className="w-full border border-gray-300 rounded p-2 focus:border-blue-500 focus:ring-blue-500" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. June 2026 Operations Budget" />
                            </div>
                            <div className="col-span-2 text-sm">
                                <label className="block text-gray-700 font-bold mb-1">Period Type</label>
                                <select className="w-full border border-gray-300 rounded p-2 focus:border-blue-500 focus:ring-blue-500" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="QUARTERLY">Quarterly</option>
                                </select>
                            </div>
                            <div className="col-span-2 text-sm">
                                <label className="block text-gray-700 font-bold mb-1">Start Date</label>
                                <input required type="date" className="w-full border border-gray-300 rounded p-2 focus:border-blue-500 focus:ring-blue-500" value={periodStartDate} onChange={(e) => setPeriodStartDate(e.target.value)} />
                            </div>
                            <div className="col-span-2 text-sm">
                                <label className="block text-gray-700 font-bold mb-1">End Date</label>
                                <input required type="date" className="w-full border border-gray-300 rounded p-2 focus:border-blue-500 focus:ring-blue-500" value={periodEndDate} onChange={(e) => setPeriodEndDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <span className="font-bold text-gray-700 text-sm">Budget Categories / Items</span>
                                <button type="button" onClick={handleAddItem} className="text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 text-blue-600 font-bold">
                                    + Add Category
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-start">
                                        <div className="flex-1">
                                            <input required type="text" placeholder="Category (e.g. Fueling)" className="w-full border border-gray-300 rounded p-2 text-sm" value={item.category} onChange={e => handleItemChange(idx, 'category', e.target.value)} />
                                        </div>
                                        <div className="w-48">
                                            <input required type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Amount (NGN)" value={item.amountAllocated} onChange={e => handleItemChange(idx, 'amountAllocated', parseFloat(e.target.value))} />
                                        </div>
                                        <div className="flex-1">
                                            <input type="text" placeholder="Notes/Justification" className="w-full border border-gray-300 rounded p-2 text-sm" value={item.notes} onChange={e => handleItemChange(idx, 'notes', e.target.value)} />
                                        </div>
                                        <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1} className="p-2 text-red-500 hover:bg-red-50 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-blue-50/50 px-4 py-4 border-t border-gray-200 flex justify-end items-center">
                                <span className="font-bold text-gray-600 mr-4 tracking-widest text-xs uppercase">Total Proposed Budget:</span>
                                <span className="font-black text-xl text-blue-700">₦{totalBudget.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
                                <Calculator size={18} /> Submit for MD Approval
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Loading budgets...</div>
                ) : budgets.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Calculator size={32} />
                        </div>
                        <h3 className="text-gray-800 font-bold mb-1">No Budgets Prepared</h3>
                        <p className="text-sm text-gray-500">Prepare a monthly or quarterly budget to request mass approvals.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {budgets.map((b) => {
                            const calcedTotal = b.items?.reduce((s: number, i: any) => s + i.amountAllocated, 0) || 0;
                            return (
                            <div key={b.id} className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-gray-900 text-lg">{b.title}</h4>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${b.status === 'APPROVED' ? 'bg-green-100 text-green-700' : b.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {new Date(b.periodStartDate).toLocaleDateString()} to {new Date(b.periodEndDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Allocation</div>
                                        <div className="text-xl font-black text-blue-700">₦{calcedTotal.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-gray-500 border-b border-gray-200">
                                            <tr>
                                                <th className="pb-2 font-bold">Category</th>
                                                <th className="pb-2 font-bold text-right">Amount (₦)</th>
                                                <th className="pb-2 font-bold pl-8">MD Notes / Justification</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200/50">
                                            {b.items?.map((item: any) => (
                                                <tr key={item.id}>
                                                    <td className="py-2 text-gray-800 font-medium">{item.category}</td>
                                                    <td className="py-2 text-gray-800 font-mono text-right">{item.amountAllocated.toLocaleString()}</td>
                                                    <td className="py-2 text-gray-500 pl-8 text-xs">{item.notes || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
