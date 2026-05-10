import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Loader, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface AccountantSettingsProps {
    embedded?: boolean;
}

export const AccountantSettings: React.FC<AccountantSettingsProps> = ({ embedded }) => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [newAccount, setNewAccount] = useState({
        bankName: '',
        accountName: '',
        accountNumber: '',
        companyName: ''
    });

    const { addToast } = useToast();
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/corporate-bank-accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(res.data);
        } catch (error: any) {
            addToast('Failed to fetch corporate accounts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/corporate-bank-accounts`, newAccount, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts([res.data, ...accounts]);
            setNewAccount({ bankName: '', accountName: '', accountNumber: '', companyName: '' });
            addToast('Account added successfully', 'success');
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to add account', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this account?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/corporate-bank-accounts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(accounts.filter(a => a.id !== id));
            addToast('Account deleted successfully', 'success');
        } catch (error: any) {
            addToast('Failed to delete account', 'error');
        }
    };

    return (
        <div className={embedded ? "space-y-6" : "p-6 max-w-5xl mx-auto space-y-6"}>
            {!embedded && <h1 className="text-2xl font-bold text-gray-800">Accountant Settings</h1>}
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Corporate Bank Accounts</h2>
                <p className="text-sm text-gray-500 mb-6">Manage the official bank accounts used by the company. These accounts will be available globally across all branches for marketers and admins to select when recording payments.</p>
                
                {/* Add New Form */}
                <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                        <input 
                            required type="text" placeholder="e.g. Double King Estate Ltd"
                            className="w-full text-sm border rounded p-2 focus:ring-blue-500"
                            value={newAccount.companyName} onChange={e => setNewAccount({...newAccount, companyName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
                        <input 
                            required type="text" placeholder="e.g. Zenith Bank"
                            className="w-full text-sm border rounded p-2 focus:ring-blue-500"
                            value={newAccount.bankName} onChange={e => setNewAccount({...newAccount, bankName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Account Name</label>
                        <input 
                            required type="text" placeholder="e.g. Double King Operations"
                            className="w-full text-sm border rounded p-2 focus:ring-blue-500"
                            value={newAccount.accountName} onChange={e => setNewAccount({...newAccount, accountName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
                        <input 
                            required type="text" placeholder="1010101010"
                            className="w-full text-sm border rounded p-2 focus:ring-blue-500"
                            value={newAccount.accountNumber} onChange={e => setNewAccount({...newAccount, accountNumber: e.target.value})}
                        />
                    </div>
                    <div className="flex items-end">
                        <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white rounded p-2 flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium">
                            {saving ? <Loader className="animate-spin" size={16} /> : <><Plus size={16} className="mr-1" /> Add Account</>}
                        </button>
                    </div>
                </form>

                {/* List of Accounts */}
                {loading ? (
                    <div className="flex justify-center p-10"><Loader className="animate-spin text-blue-600" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-100 text-gray-600">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">Company</th>
                                    <th className="p-3">Bank Name</th>
                                    <th className="p-3">Account Name</th>
                                    <th className="p-3">Account Number</th>
                                    <th className="p-3 rounded-tr-lg">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {accounts.length === 0 ? (
                                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">No corporate accounts configured.</td></tr>
                                ) : (
                                    accounts.map((acc, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-800">{acc.companyName}</td>
                                            <td className="p-3 text-gray-600">{acc.bankName}</td>
                                            <td className="p-3 text-gray-600">{acc.accountName}</td>
                                            <td className="p-3 font-mono text-indigo-600 font-medium">{acc.accountNumber}</td>
                                            <td className="p-3">
                                                <button onClick={() => handleDeleteAccount(acc.id)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded transition">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
