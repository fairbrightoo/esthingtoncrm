import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Search, Save, X, Edit, ShieldAlert, BadgeCheck, PowerOff, Building, Network } from 'lucide-react';

export const GlobalUserManagement = () => {
    const { token } = useAuth();
    
    // Data States
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('ALL');
    const [selectedRole, setSelectedRole] = useState('ALL');

    // Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // Form State for editing
    const [formData, setFormData] = useState({
        role: '',
        companyId: '',
        branchId: '',
        monthlySalary: 0,
        commissionRate: 0,
        isActive: true
    });

    useEffect(() => {
        fetchMetadata();
        fetchUsers();
    }, [selectedCompany, selectedRole]);

    const fetchMetadata = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/companies', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompanies(res.data);
        } catch (error) {
            console.error('Failed to load companies mapping');
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let params = new URLSearchParams();
            if (selectedCompany !== 'ALL') params.append('companyId', selectedCompany);
            if (selectedRole !== 'ALL') params.append('role', selectedRole);

            const res = await axios.get(`http://localhost:3000/api/users/global?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data.data);
        } catch (error) {
            console.error('Failed to load global users', error);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setFormData({
            role: user.role,
            companyId: user.company?.id || 'REMOVE',
            branchId: user.branch?.id || 'REMOVE',
            monthlySalary: user.monthlySalary || 0,
            commissionRate: user.commissionRate || 0,
            isActive: user.isActive
        });
        setIsEditModalOpen(true);
    };

    const handleSaveUpdate = async () => {
        if (!editingUser) return;
        try {
            await axios.put(`http://localhost:3000/api/users/global/${editingUser.id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setIsEditModalOpen(false);
            fetchUsers(); // Refresh grid
        } catch (error) {
            alert('Failed to update User Profile');
            console.error(error);
        }
    };

    // Derived properties
    const activeCompanyData = formData.companyId !== 'REMOVE' ? companies.find(c => c.id === formData.companyId) : null;
    const filteredUsers = users.filter(u => u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Global User Management</h1>
                    <p className="text-gray-500 mt-1">Super Admin God-Mode Access Control.</p>
                </div>
                <div className="mt-4 md:mt-0 px-4 py-2 bg-primary-50 rounded-lg text-primary-700 font-bold border border-primary-100 flex items-center shadow-sm">
                    <ShieldAlert size={18} className="mr-2" /> TOTAL SYSTEM USERS: {users.length}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[250px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50 transition-all placeholder-gray-400"
                    />
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Subsidiary Filter</label>
                    <select 
                        value={selectedCompany} 
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                    >
                        <option value="ALL">Entire Conglomerate</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Role Filter</label>
                    <select 
                        value={selectedRole} 
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                    >
                        <option value="ALL">All Roles</option>
                        <option value="SUPER_ADMIN">Super Admins</option>
                        <option value="MANAGING_DIRECTOR">Managing Directors</option>
                        <option value="BRANCH_ADMIN">Branch Admins</option>
                        <option value="MARKETER">Marketers</option>
                        <option value="CUSTOMER_CARE">Customer Care</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center animate-pulse text-gray-400 font-medium">Loading User Framework...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100 uppercase text-xs font-semibold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Employee Identity</th>
                                    <th className="px-6 py-4">Status & Role</th>
                                    <th className="px-6 py-4">Assignment Layer</th>
                                    <th className="px-6 py-4">Financial Retainer</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`transition-colors hover:bg-gray-50 ${!user.isActive ? 'bg-red-50/40 opacity-70' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800 flex items-center">
                                                {user.fullName}
                                                {user.role === 'SUPER_ADMIN' && <BadgeCheck size={14} className="ml-1 text-blue-500" />}
                                                {!user.isActive && <span title="Suspended Account"><PowerOff size={14} className="ml-2 text-red-500" /></span>}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{user.email} • {user.phone || 'No Phone'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                user.role === 'MANAGING_DIRECTOR' ? 'bg-blue-100 text-blue-700' :
                                                user.role === 'BRANCH_ADMIN' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {user.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.company ? (
                                                <>
                                                    <div className="font-semibold text-gray-700">{user.company.name}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">{user.branch?.name || 'Headquarters'}</div>
                                                </>
                                            ) : (
                                                <span className="text-xs font-medium text-gray-400 italic">Unassigned (Global Fleet)</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{formatCurrency(user.monthlySalary)} / mo</div>
                                            <div className="text-xs text-green-600 font-bold mt-0.5">{user.commissionRate}% Commission</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => openEditModal(user)}
                                                className="inline-flex items-center justify-center p-2 bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">No employees found matching the filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Editing Modal */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm shadow flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold flex items-center text-gray-800">
                                    <ShieldAlert size={20} className="mr-2 text-primary-600 text-xl" />
                                    Employee Root Protocol
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Modifying identity parameters for: <strong>{editingUser.fullName}</strong></p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Account Status Switch */}
                            <div className={`p-4 rounded-xl border-2 flex justify-between items-center transition-colors ${formData.isActive ? 'border-primary-100 bg-primary-50/50' : 'border-red-200 bg-red-50'}`}>
                                <div>
                                    <h3 className={`font-bold ${formData.isActive ? 'text-primary-800' : 'text-red-800'}`}>
                                        {formData.isActive ? 'Account Active' : 'Account Suspended'}
                                    </h3>
                                    <p className={`text-xs mt-1 ${formData.isActive ? 'text-primary-600' : 'text-red-600'}`}>
                                        {formData.isActive ? 'User has full login access to their modules.' : 'User is locked out. They cannot login or access CRM.'}
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer ml-4">
                                    <input type="checkbox" className="sr-only peer" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>

                            {/* Job Topology Matrix */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4 col-span-1 border p-4 rounded-xl border-gray-100 bg-gray-50/50">
                                    <h4 className="font-semibold text-sm text-gray-800 flex items-center mb-3"><Network size={16} className="mr-2 text-gray-500" /> Organizational Hierarchy</h4>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Assigned Subsidiary</label>
                                        <select 
                                            value={formData.companyId} 
                                            onChange={e => setFormData({...formData, companyId: e.target.value, branchId: 'REMOVE'})}
                                            className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm"
                                        >
                                            <option value="REMOVE">Unassigned (Corporate Floating)</option>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Local Branch</label>
                                        <select 
                                            value={formData.branchId} 
                                            onChange={e => setFormData({...formData, branchId: e.target.value})}
                                            disabled={formData.companyId === 'REMOVE'}
                                            className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-100"
                                        >
                                            <option value="REMOVE">Headquarters (No Branch)</option>
                                            {(activeCompanyData?.branches || []).map((b: any) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">System Role & Access Privileges</label>
                                        <select 
                                            value={formData.role} 
                                            onChange={e => setFormData({...formData, role: e.target.value})}
                                            className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 font-bold text-sm bg-blue-50 text-blue-800"
                                        >
                                            <option value="SUPER_ADMIN">SUPER ADMIN</option>
                                            <option value="MANAGING_DIRECTOR">MANAGING DIRECTOR</option>
                                            <option value="BRANCH_ADMIN">BRANCH ADMIN</option>
                                            <option value="MARKETER">MARKETER</option>
                                            <option value="CUSTOMER_CARE">CUSTOMER CARE</option>
                                            <option value="HR">HR REPRESENTATIVE</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Financial Payload Block */}
                                <div className="space-y-4 col-span-1 border p-4 rounded-xl border-gray-100 bg-gray-50/50">
                                    <h4 className="font-semibold text-sm text-gray-800 flex items-center mb-3"><Building size={16} className="mr-2 text-gray-500" /> Contract & Remuneration</h4>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Base Monthly Salary (NGN)</label>
                                        <input 
                                            type="number" 
                                            value={formData.monthlySalary} 
                                            onChange={e => setFormData({...formData, monthlySalary: parseFloat(e.target.value) || 0})}
                                            className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm font-mono tracking-wide px-4 py-2"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Sales Commission Rate (%)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={formData.commissionRate} 
                                                onChange={e => setFormData({...formData, commissionRate: parseFloat(e.target.value) || 0})}
                                                className="w-full rounded-lg border-gray-300 focus:ring-green-500 focus:border-green-500 text-sm font-bold text-green-700 bg-green-50 px-4 py-2"
                                                placeholder="5.0"
                                                step="0.5"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">%</span>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>

                        </div>
                        
                        <div className="p-5 border-t border-gray-100 flex justify-end space-x-3 bg-white mt-auto">
                            <button 
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors border shadow-sm border-gray-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveUpdate}
                                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-medium flex items-center transition-transform hover:scale-[1.02] shadow-md shadow-gray-200"
                            >
                                <Save size={18} className="mr-2" />
                                Commit Protocol Updates
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
