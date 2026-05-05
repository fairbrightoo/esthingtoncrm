import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ChairmanExpenseForm } from '../components/ChairmanExpenseForm';
import { Plus, CheckCircle, XCircle, Clock, Wallet, ArrowUpRight, Filter } from 'lucide-react';

export const ChairmanExpenses = () => {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();
    const token = localStorage.getItem('token');

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpenses(res.data);
        } catch (error) {
            console.error("Failed to fetch expenses", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const totalDisbursed = expenses
        .filter(e => e.status === 'DISBURSED')
        .reduce((sum, e) => sum + (e.amountApproved || 0), 0);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DISBURSED': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit border border-emerald-200 shadow-sm"><CheckCircle size={14}/> Logged & Disbursed</span>;
            case 'PENDING_MD_APPROVAL': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit border border-yellow-200 shadow-sm"><Clock size={14}/> Processing</span>;
            case 'REJECTED': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit border border-red-200 shadow-sm"><XCircle size={14}/> Cancelled</span>;
            default: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 flex items-center gap-1 w-fit border border-gray-200 shadow-sm">{status}</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
            
            {/* Executive Header */}
            <header className="bg-gradient-to-r from-gray-900 to-indigo-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Wallet size={160} />
                </div>
                
                <div className="relative z-10 flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                        <Wallet className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Chairman Expense Tracker</h1>
                        <p className="mt-1 text-indigo-200 font-medium max-w-xl text-sm">
                            Privately log and monitor your personal and executive expenses.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Total Logged</p>
                        <p className="text-3xl font-black text-emerald-400 drop-shadow-md tracking-tight">
                            ₦{totalDisbursed.toLocaleString()}
                        </p>
                    </div>
                    <div className="h-12 w-px bg-white/20"></div>
                    <button 
                        onClick={() => setShowForm(true)}
                        className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 hover:scale-105 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={20} className="text-indigo-600" />
                        Log Expense
                    </button>
                </div>
            </header>
            
            {showForm && (
                <ChairmanExpenseForm 
                    onClose={() => setShowForm(false)} 
                    onSuccess={() => {
                        setShowForm(false);
                        fetchExpenses();
                    }} 
                />
            )}

            {/* Expenses List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <ArrowUpRight className="mr-2 text-indigo-500" size={20} />
                        Expense Ledger
                    </h3>
                    <div className="flex gap-2">
                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 flex justify-center flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                        <p className="text-sm font-medium text-gray-500">Syncing ledger...</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="p-24 flex flex-col items-center justify-center text-center">
                        <div className="bg-gray-50 p-6 rounded-full mb-4">
                            <Wallet size={48} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No Expenses Logged</h3>
                        <p className="text-gray-500 max-w-sm mb-6">Your personal ledger is currently empty. Click the button above to log your first executive expense.</p>
                        <button 
                            onClick={() => setShowForm(true)}
                            className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors"
                        >
                            <Plus size={18} />
                            Log Expense
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject / Reference</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-gray-500">
                                            {new Date(expense.requestDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{expense.title}</div>
                                            {expense.description && (
                                                <div className="text-xs text-gray-400 mt-1 line-clamp-1">{expense.description}</div>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <span className="px-3 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap font-mono font-black text-gray-800 text-base">
                                            ₦{(expense.amountApproved || expense.items?.reduce((sum: number, item: any) => sum + (item.qty * item.unitPrice), 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            {getStatusBadge(expense.status)}
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
