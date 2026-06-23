import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Building2, Plus, Edit2, Trash2, MapPin, Check, X, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { DocumentTemplatesConfig } from '../components/DocumentTemplatesConfig';
import { ProfileSettings } from '../components/ProfileSettings';

export const GlobalSettings = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('COMPANIES');
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

    // Modal States
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);

    // Form States
    const [editingCompany, setEditingCompany] = useState<any>(null);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        themeColor: '#000000',
        address: '',
        smsSenderId: '',
        waPhoneNumberId: '',
        waBusinessAccountId: '',
        waToken: '',
        email: '',
        website: '',
        phone: '',
        abbreviation: '',
        idCardFrontTemplate: '',
        idCardBackTemplate: '',
        managingDirectorName: ''
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

    // Admin/MD Management
    const [branchLeaders, setBranchLeaders] = useState<any[]>([]);
    const [groupMDs, setGroupMDs] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [showGroupMDModal, setShowGroupMDModal] = useState(false);
    const [showChairmanModal, setShowChairmanModal] = useState(false);
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
    const [bulkUploadStatus, setBulkUploadStatus] = useState<{ loading: boolean, results: any } | null>(null);
    const [editingAdmin, setEditingAdmin] = useState<any>(null);
    const [adminFormData, setAdminFormData] = useState({ fullName: '', email: '', password: '', role: 'BRANCH_ADMIN' });
    const [chairmanData, setChairmanData] = useState<any>(null);
    const [chairmanFormData, setChairmanFormData] = useState({ fullName: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

    const fetchCompanies = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`);
            let fetchedCompanies = res.data;
            if (user?.role === 'GROUP_MANAGING_DIRECTOR') {
                fetchedCompanies = fetchedCompanies.filter((c: any) => c.id === user.companyId);
            }
            setCompanies(fetchedCompanies);
        } catch (error) {
            console.error("Failed to fetch companies", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranchLeaders = async (companyId: string, branchId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/users`);
            const leaders = res.data.filter((u: any) => u.role === 'BRANCH_ADMIN' || u.role === 'MANAGING_DIRECTOR');
            setBranchLeaders(leaders);
        } catch (error) {
            console.error("Failed to fetch leaders", error);
        }
    };

    const fetchGroupMDs = async (companyId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/users`);
            // We need a specific endpoint to fetch company users or filter them.
            // Wait, previously `getBranchUsers` was used. We might need to just fetch them or we can just assume `getCompanyUsers` exists, if not we'll create it.
            // Let's use a workaround: we will fetch all users from backend by adding a generic company users endpoint, or just add `getGroupMDs` endpoint.
        } catch(e) {}
    };

    const handleManageLeaders = (companyId: string, branchId: string) => {
        setSelectedCompanyId(companyId);
        setSelectedBranchId(branchId);
        fetchBranchLeaders(companyId, branchId);
        setShowAdminModal(true);
    };

    const handleManageGroupMD = async (companyId: string) => {
        setSelectedCompanyId(companyId);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/group-md`, { headers: { Authorization: `Bearer ${token}` } });
            setGroupMDs(res.data);
        } catch (e) {
            setGroupMDs([]);
        }
        setShowGroupMDModal(true);
    };

    const handleManageChairman = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/global/chairman`, { headers: { Authorization: `Bearer ${token}` } });
            setChairmanData(res.data);
        } catch (e) {
            setChairmanData(null);
        }
        setShowChairmanModal(true);
    };

    const handleDeleteChairman = async () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Remove Global Chairman',
            message: 'Are you sure you want to completely remove the Global Chairman? This account will lose all access.',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/global/chairman`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setChairmanData(null);
                    addToast('Global Chairman removed successfully', 'success');
                } catch (error: any) {
                    addToast(error.response?.data?.error || 'Failed to remove Global Chairman', 'error');
                }
            }
        });
    };

    const handleSaveAdmin = async () => {
        if (!selectedCompanyId || !selectedBranchId) return;
        try {
            if (editingAdmin) {
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/users/${editingAdmin.id}`,
                    adminFormData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } else {
                const endpoint = adminFormData.role === 'MANAGING_DIRECTOR' ? 'mds' : 'admins';
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${selectedCompanyId}/branches/${selectedBranchId}/${endpoint}`,
                    adminFormData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            fetchBranchLeaders(selectedCompanyId, selectedBranchId);
            setEditingAdmin(null);
            setAdminFormData({ fullName: '', email: '', password: '', role: 'BRANCH_ADMIN' });
            addToast(editingAdmin ? 'Admin updated successfully' : 'Admin created successfully', 'success');
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to save admin', 'error');
        }
    };

    const handleDeleteAdmin = async (adminId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Admin',
            message: 'Are you sure you want to delete this admin?',
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/users/${adminId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (showAdminModal && selectedCompanyId && selectedBranchId) {
                        fetchBranchLeaders(selectedCompanyId, selectedBranchId);
                    } else if (showGroupMDModal && selectedCompanyId) {
                        handleManageGroupMD(selectedCompanyId);
                    }
                    addToast('User deleted successfully', 'success');
                } catch (error: any) {
                    addToast(error.response?.data?.error || 'Failed to delete admin', 'error');
                }
            }
        });
    };

    const handleBulkUpload = async () => {
        if (!bulkUploadFile) return;

        setBulkUploadStatus({ loading: true, results: null });
        try {
            const data = new FormData();
            data.append('file', bulkUploadFile);

            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/bulk-admins`, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setBulkUploadStatus({ loading: false, results: res.data });
            if (res.data.successCount > 0) {
                addToast(`${res.data.successCount} admins created successfully`, 'success');
                // Refresh data if needed, or wait for user to close modal
            }
        } catch (error: any) {
            setBulkUploadStatus({ loading: false, results: null });
            addToast(error.response?.data?.error || 'Failed to bulk upload', 'error');
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchBranches = async (companyId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches`);
            setCompanies(prev => prev.map(c =>
                c.id === companyId ? { ...c, branches: res.data } : c
            ));
        } catch (error) {
            console.error("Failed to fetch branches", error);
        }
    };

    const toggleExpand = (companyId: string) => {
        if (expandedCompany === companyId) {
            setExpandedCompany(null);
        } else {
            setExpandedCompany(companyId);
            fetchBranches(companyId);
        }
    };

    // --- Actions ---

    const handleSaveCompany = async () => {
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('themeColor', formData.themeColor);
            data.append('smsSenderId', formData.smsSenderId);
            data.append('waPhoneNumberId', formData.waPhoneNumberId);
            data.append('waBusinessAccountId', formData.waBusinessAccountId);
            data.append('waToken', formData.waToken);
            data.append('email', formData.email);
            data.append('website', formData.website);
            data.append('abbreviation', formData.abbreviation);
            data.append('idCardFrontTemplate', formData.idCardFrontTemplate);
            data.append('idCardBackTemplate', formData.idCardBackTemplate);
            data.append('managingDirectorName', formData.managingDirectorName);
            if (logoFile) data.append('logo', logoFile);
            if (signatureFile) data.append('signature', signatureFile);

            if (editingCompany) {
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${editingCompany.id}`, data,
                    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
                );
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`, data,
                    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
                );
            }
            setShowCompanyModal(false);
            fetchCompanies();
            resetForm();
            addToast(editingCompany ? 'Company updated successfully' : 'Company created successfully', 'success');
        } catch (error) {
            addToast('Failed to save company', 'error');
        }
    };

    const handleDeleteCompany = async (id: string) => {
        if (!confirm('Are you sure? This will fail if the company has active data.')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCompanies();
            addToast('Company deleted successfully', 'success');
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to delete company', 'error');
        }
    };

    const handleSaveBranch = async () => {
        if (!selectedCompanyId) return;
        try {
            const payload = { 
                name: formData.name, 
                address: formData.address, 
                phone: formData.phone, 
                email: formData.email,
                abbreviation: formData.abbreviation,
                idCardFrontTemplate: formData.idCardFrontTemplate,
                idCardBackTemplate: formData.idCardBackTemplate
            };
            if (editingBranch) {
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/branches/${editingBranch.id}`, payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${selectedCompanyId}/branches`, payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            setShowBranchModal(false);
            fetchBranches(selectedCompanyId); // Refresh branches for this company
            resetForm();
            addToast(editingBranch ? 'Branch updated successfully' : 'Branch created successfully', 'success');
        } catch (error) {
            addToast('Failed to save branch', 'error');
        }
    };

    const handleDeleteBranch = async (branchId: string, companyId: string) => {
        if (!confirm('Are you sure you want to delete this branch?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/branches/${branchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBranches(companyId);
            addToast('Branch deleted successfully', 'success');
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to delete branch', 'error');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', themeColor: '#000000', address: '', smsSenderId: '', waPhoneNumberId: '', waBusinessAccountId: '', waToken: '', email: '', website: '', phone: '', abbreviation: '', idCardFrontTemplate: '', idCardBackTemplate: '', managingDirectorName: '' });
        setLogoFile(null);
        setLogoPreview(null);
        setSignatureFile(null);
        setSignaturePreview(null);
        setEditingCompany(null);
        setEditingBranch(null);
        setEditingAdmin(null);
        setAdminFormData({ fullName: '', email: '', password: '', role: 'BRANCH_ADMIN' });
    };

    const openCreateCompany = () => {
        resetForm();
        setShowCompanyModal(true);
    };

    const openEditCompany = (company: any) => {
        setEditingCompany(company);
        setFormData({ 
            name: company.name, 
            themeColor: company.themeColor || '#000000', 
            address: '', 
            smsSenderId: company.smsSenderId || '',
            waPhoneNumberId: company.waPhoneNumberId || '',
            waBusinessAccountId: company.waBusinessAccountId || '',
            waToken: company.waToken || '',
            email: company.email || '',
            website: company.website || '',
            phone: '',
            abbreviation: company.abbreviation || '',
            idCardFrontTemplate: company.idCardFrontTemplate || '',
            idCardBackTemplate: company.idCardBackTemplate || '',
            managingDirectorName: company.managingDirectorName || ''
        });
        setLogoPreview(company.logoUrl ? (company.logoUrl.startsWith('http') ? company.logoUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${company.logoUrl}`) : null);
        setSignaturePreview(company.signatureUrl ? (company.signatureUrl.startsWith('http') ? company.signatureUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${company.signatureUrl}`) : null);
        setShowCompanyModal(true);
    };

    const openCreateBranch = (companyId: string) => {
        resetForm();
        setSelectedCompanyId(companyId);
        setShowBranchModal(true);
    };

    const openEditBranch = (branch: any, companyId: string) => {
        resetForm();
        setEditingBranch(branch);
        setSelectedCompanyId(companyId);
        setFormData({ name: branch.name, themeColor: '#000000', address: branch.address || '', smsSenderId: '', waPhoneNumberId: '', waBusinessAccountId: '', waToken: '', email: branch.email || '', website: '', phone: branch.phone || '', abbreviation: branch.abbreviation || '', idCardFrontTemplate: branch.idCardFrontTemplate || '', idCardBackTemplate: branch.idCardBackTemplate || '', managingDirectorName: '' });
        setShowBranchModal(true);
    };

    if (loading) return <div className="p-10">Loading settings...</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Global System Settings</h1>
                    <p className="text-gray-500 mt-1">Manage network branches, templates, and corporate identities.</p>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex space-x-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('COMPANIES')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors ${
                        activeTab === 'COMPANIES'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Companies & Branches
                </button>
                <button
                    onClick={() => setActiveTab('DOCUMENTS')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors ${
                        activeTab === 'DOCUMENTS'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Auto-Generated Documents
                </button>
                <button
                    onClick={() => setActiveTab('SECURITY')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors ${
                        activeTab === 'SECURITY'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Security & Profile
                </button>
            </div>

            {activeTab === 'COMPANIES' ? (
                <>
                    <div className="flex justify-end mb-4 space-x-3">
                        {user?.role !== 'GROUP_MANAGING_DIRECTOR' && (
                            <>
                                <button onClick={() => setShowBulkUploadModal(true)} className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition shadow-sm">
                                    <span>Bulk Upload Admins</span>
                                </button>
                                <button onClick={handleManageChairman} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm">
                                    <span>Manage Global Chairman</span>
                                </button>
                                <button onClick={openCreateCompany} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
                                    <Plus size={18} />
                                    <span>Add Company</span>
                                </button>
                            </>
                        )}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                {companies.map(company => (
                    <div key={company.id} className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 cursor-pointer" onClick={() => toggleExpand(company.id)}>
                                {expandedCompany === company.id ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: company.themeColor || '#000' }}>
                                    {company.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{company.name}</h3>
                                    <p className="text-xs text-gray-400">{company.branches?.length || 0} Branches</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => openEditCompany(company)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                                <button onClick={() => handleDeleteCompany(company.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                <button onClick={() => handleManageGroupMD(company.id)} className="ml-2 text-sm text-indigo-600 hover:underline border border-indigo-200 px-2 py-1 rounded bg-indigo-50">Group MDs</button>
                                <button onClick={() => openCreateBranch(company.id)} className="ml-2 text-sm text-blue-600 hover:underline flex items-center"><Plus size={16} className="mr-1" /> Add Branch</button>
                            </div>
                        </div>

                        {/* Expandable Branches Section */}
                        {expandedCompany === company.id && (
                            <div className="mt-4 ml-14 space-y-2 border-l-2 border-gray-100 pl-4">
                                {company.branches ? (
                                    company.branches.length === 0 ? <p className="text-sm text-gray-400 italic">No branches found.</p> :
                                        company.branches.map((branch: any) => (
                                            <div key={branch.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <MapPin size={16} className="text-gray-400" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">{branch.name}</p>
                                                        <p className="text-xs text-gray-400">{branch.address || 'No address'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2 items-center">
                                                    <button onClick={() => handleManageLeaders(company.id, branch.id)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded mr-2 hover:bg-blue-100">
                                                        Manage Leaders
                                                    </button>
                                                    <button onClick={() => openEditBranch(branch, company.id)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDeleteBranch(branch.id, company.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                                        <div className="animate-spin h-4 w-4 border-b-2 border-gray-400 rounded-full"></div>
                                        <span>Loading branches...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modals */}
            {(showCompanyModal || showBranchModal) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{showCompanyModal ? (editingCompany ? 'Edit Company' : 'New Company') : (editingBranch ? 'Edit Branch' : 'New Branch')}</h2>
                            <button onClick={() => { setShowCompanyModal(false); setShowBranchModal(false); }}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex space-x-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={showCompanyModal ? "e.g. Double King Estate Ltd" : "e.g. Utako Branch"}
                                    />
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
                                    <input
                                        type="text"
                                        maxLength={4}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                        value={formData.abbreviation}
                                        onChange={e => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                                        placeholder={showCompanyModal ? "DKEL" : "UTK"}
                                    />
                                </div>
                            </div>

                            {showCompanyModal && (
                                <>
                                    <div className="flex space-x-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
                                            <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@company.com" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                                            <input type="url" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://company.com" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo (SVG only)</label>
                                        <div className="flex items-center space-x-4">
                                            {logoPreview && (
                                                <div className="w-16 h-16 bg-gray-50 border rounded-lg flex items-center justify-center p-2">
                                                    <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                                </div>
                                            )}
                                            <label className="flex-1 cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition text-center shadow-sm">
                                                {logoFile ? logoFile.name : 'Select SVG Logo'}
                                                <input type="file" accept=".svg,image/svg+xml" className="hidden" onChange={e => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setLogoFile(e.target.files[0]);
                                                        setLogoPreview(URL.createObjectURL(e.target.files[0]));
                                                    }
                                                }} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex space-x-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Group Managing Director Name</label>
                                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.managingDirectorName} onChange={e => setFormData({ ...formData, managingDirectorName: e.target.value })} placeholder="John Doe" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GMD Signature (Image)</label>
                                        <div className="flex items-center space-x-4">
                                            {signaturePreview && (
                                                <div className="w-16 h-16 bg-gray-50 border rounded-lg flex items-center justify-center p-2">
                                                    <img src={signaturePreview} alt="Signature Preview" className="max-w-full max-h-full object-contain" />
                                                </div>
                                            )}
                                            <label className="flex-1 cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition text-center shadow-sm">
                                                {signatureFile ? signatureFile.name : 'Select Signature Image'}
                                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setSignatureFile(e.target.files[0]);
                                                        setSignaturePreview(URL.createObjectURL(e.target.files[0]));
                                                    }
                                                }} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex space-x-4">
                                        <div className="w-1/3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
                                            <div className="flex items-center space-x-3">
                                                <input type="color" className="h-10 w-20 p-1 border border-gray-300 rounded cursor-pointer" value={formData.themeColor} onChange={e => setFormData({ ...formData, themeColor: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Termii SMS Sender ID</label>
                                            <input type="text" maxLength={11} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.smsSenderId} onChange={e => setFormData({ ...formData, smsSenderId: e.target.value })} placeholder="Double King" />
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">WhatsApp Business API Settings</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Meta Phone Number ID</label>
                                                <input type="text" className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.waPhoneNumberId} onChange={e => setFormData({ ...formData, waPhoneNumberId: e.target.value })} placeholder="e.g. 10239483920..." />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Meta Business Account ID</label>
                                                <input type="text" className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.waBusinessAccountId} onChange={e => setFormData({ ...formData, waBusinessAccountId: e.target.value })} placeholder="e.g. 8711701038930343" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Meta Permanent Access Token</label>
                                                <input type="password" className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.waToken} onChange={e => setFormData({ ...formData, waToken: e.target.value })} placeholder="EAAI..." />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Head Office ID Card Templates (GMDs & Super Admins)</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Front Page HTML</label>
                                                <textarea className="w-full px-4 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" value={formData.idCardFrontTemplate} onChange={e => setFormData({ ...formData, idCardFrontTemplate: e.target.value })} placeholder="<div>Front of ID Card</div>"></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Back Page HTML</label>
                                                <textarea className="w-full px-4 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" value={formData.idCardBackTemplate} onChange={e => setFormData({ ...formData, idCardBackTemplate: e.target.value })} placeholder="<div>Back of ID Card</div>"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {showBranchModal && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch Address</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Full office address" />
                                    </div>
                                    <div className="flex space-x-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Care Phone</label>
                                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+234..." />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Email</label>
                                            <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="branch@company.com" />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Branch ID Card Templates</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Front Page HTML</label>
                                                <textarea className="w-full px-4 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" value={formData.idCardFrontTemplate} onChange={e => setFormData({ ...formData, idCardFrontTemplate: e.target.value })} placeholder="<div>Front of ID Card</div>"></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Back Page HTML</label>
                                                <textarea className="w-full px-4 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" value={formData.idCardBackTemplate} onChange={e => setFormData({ ...formData, idCardBackTemplate: e.target.value })} placeholder="<div>Back of ID Card</div>"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end space-x-3 mt-6">
                                <button onClick={() => { setShowCompanyModal(false); setShowBranchModal(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={showCompanyModal ? handleSaveCompany : handleSaveBranch} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin/Branch MD Modal */}
            {showAdminModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Manage Branch Leaders</h2>
                            <button onClick={() => setShowAdminModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        {/* List Existing Admins */}
                        <div className="mb-6 space-y-2 max-h-40 overflow-y-auto">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase">Existing Leaders</h3>
                            {branchLeaders.length === 0 ? <p className="text-sm text-gray-400 italic">No leaders assigned.</p> :
                                branchLeaders.map(admin => (
                                    <div key={admin.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                        <div>
                                            <p className="font-medium text-sm">{admin.fullName} <span className="ml-2 text-[10px] bg-gray-200 px-1 py-0.5 rounded">{admin.role.replace('_', ' ')}</span></p>
                                            <p className="text-xs text-gray-500">{admin.email}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => { setEditingAdmin(admin); setAdminFormData({ fullName: admin.fullName, email: admin.email, password: '', role: admin.role }) }} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                                            <button onClick={() => handleDeleteAdmin(admin.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold text-gray-800 mb-3">{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</h3>
                            <div className="space-y-3">
                                <div className="flex space-x-2">
                                    <select 
                                        className="w-1/3 px-3 py-2 border rounded bg-white text-sm"
                                        value={adminFormData.role}
                                        onChange={e => setAdminFormData({ ...adminFormData, role: e.target.value })}
                                        disabled={!!editingAdmin}
                                    >
                                        <option value="BRANCH_ADMIN">Branch Admin</option>
                                        <option value="MANAGING_DIRECTOR">Branch MD</option>
                                    </select>
                                    <input
                                        className="w-2/3 px-3 py-2 border rounded"
                                        placeholder="Full Name"
                                        value={adminFormData.fullName}
                                        onChange={e => setAdminFormData({ ...adminFormData, fullName: e.target.value })}
                                    />
                                </div>
                                <input
                                    className="w-full px-3 py-2 border rounded"
                                    placeholder="Email Address"
                                    type="email"
                                    value={adminFormData.email}
                                    onChange={e => setAdminFormData({ ...adminFormData, email: e.target.value })}
                                />
                                <div className="relative">
                                    <input
                                        className="w-full px-3 py-2 border rounded pr-10"
                                        placeholder={editingAdmin ? "New Password (leave blank to keep)" : "Password"}
                                        type={showPassword ? "text" : "password"}
                                        value={adminFormData.password}
                                        onChange={e => setAdminFormData({ ...adminFormData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="flex justify-end space-x-2 mt-2">
                                    {editingAdmin && <button onClick={() => { setEditingAdmin(null); setAdminFormData({ fullName: '', email: '', password: '', role: 'BRANCH_ADMIN' }) }} className="px-3 py-1 text-gray-500 text-sm">Cancel Edit</button>}
                                    <button onClick={handleSaveAdmin} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                                        {editingAdmin ? 'Update Leader' : 'Add Leader'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Group MD Modal */}
            {showGroupMDModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Manage Group MDs</h2>
                            <button onClick={() => { setShowGroupMDModal(false); setEditingAdmin(null); }}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="mb-6 space-y-2">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase">Existing Group MDs</h3>
                            {groupMDs.length === 0 ? <p className="text-sm text-gray-400 italic">No Group MD assigned.</p> :
                                groupMDs.map(admin => (
                                    <div key={admin.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                        <div>
                                            <p className="font-medium text-sm">{admin.fullName}</p>
                                            <p className="text-xs text-gray-500">{admin.email}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => { setEditingAdmin(admin); setAdminFormData({ fullName: admin.fullName, email: admin.email, password: '', role: 'GROUP_MANAGING_DIRECTOR' }) }} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                                            <button onClick={() => handleDeleteAdmin(admin.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold text-gray-800 mb-3">{editingAdmin ? 'Edit Group MD' : 'Add Group MD'}</h3>
                            <div className="space-y-3">
                                <input className="w-full px-3 py-2 border rounded" placeholder="Full Name" value={adminFormData.fullName} onChange={e => setAdminFormData({ ...adminFormData, fullName: e.target.value })} />
                                <input className="w-full px-3 py-2 border rounded" placeholder="Email Address" type="email" value={adminFormData.email} onChange={e => setAdminFormData({ ...adminFormData, email: e.target.value })} />
                                <div className="relative">
                                    <input 
                                        className="w-full px-3 py-2 border rounded pr-10" 
                                        placeholder={editingAdmin ? "New Password" : "Password"} 
                                        type={showPassword ? "text" : "password"} 
                                        value={adminFormData.password} 
                                        onChange={e => setAdminFormData({ ...adminFormData, password: e.target.value })} 
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="flex justify-end space-x-2 mt-2">
                                    {editingAdmin && <button onClick={() => { setEditingAdmin(null); setAdminFormData({ fullName: '', email: '', password: '', role: 'BRANCH_ADMIN' }) }} className="px-3 py-1 text-gray-500 text-sm">Cancel Edit</button>}
                                    <button onClick={async () => {
                                        try {
                                            if (editingAdmin) {
                                                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/users/${editingAdmin.id}`, adminFormData, { headers: { Authorization: `Bearer ${token}` } });
                                            } else {
                                                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${selectedCompanyId}/group-md`, adminFormData, { headers: { Authorization: `Bearer ${token}` } });
                                            }
                                            if(selectedCompanyId) {
                                                // Refresh the list immediately after save
                                                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${selectedCompanyId}/group-md`, { headers: { Authorization: `Bearer ${token}` } });
                                                setGroupMDs(res.data);
                                            }
                                            setEditingAdmin(null);
                                            setAdminFormData({ fullName: '', email: '', password: '', role: 'BRANCH_ADMIN' });
                                            addToast('Group MD saved successfully', 'success');
                                        } catch(e:any) {
                                            addToast(e.response?.data?.error || 'Failed to save', 'error');
                                        }
                                    }} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">Save</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Chairman Modal */}
            {showChairmanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Manage Global Chairman</h2>
                            <button onClick={() => setShowChairmanModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="mb-6 space-y-2">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase">Existing Global Chairman</h3>
                            {!chairmanData ? <p className="text-sm text-gray-400 italic">No Global Chairman assigned.</p> :
                                <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                    <div>
                                        <p className="font-medium text-sm">{chairmanData.fullName}</p>
                                        <p className="text-xs text-gray-500">{chairmanData.email}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => setChairmanFormData({ fullName: chairmanData.fullName, email: chairmanData.email, password: '' })} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                                        <button onClick={handleDeleteChairman} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                                    </div>
                                </div>
                            }
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold text-gray-800 mb-3">{chairmanData && chairmanFormData.email === chairmanData.email ? 'Edit Global Chairman' : 'Add Global Chairman'}</h3>
                            <div className="space-y-3">
                                <input 
                                    className="w-full px-3 py-2 border rounded" 
                                    placeholder="Full Name" 
                                    value={chairmanFormData.fullName} 
                                    onChange={e => setChairmanFormData({ ...chairmanFormData, fullName: e.target.value })} 
                                />
                                <input 
                                    className="w-full px-3 py-2 border rounded" 
                                    placeholder="Email Address" 
                                    type="email" 
                                    value={chairmanFormData.email} 
                                    onChange={e => setChairmanFormData({ ...chairmanFormData, email: e.target.value })} 
                                />
                                <div className="relative">
                                    <input 
                                        className="w-full px-3 py-2 border rounded pr-10" 
                                        placeholder={chairmanData ? "New Secure Password (optional)" : "Secure Password"} 
                                        type={showPassword ? "text" : "password"} 
                                        value={chairmanFormData.password} 
                                        onChange={e => setChairmanFormData({ ...chairmanFormData, password: e.target.value })} 
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="flex justify-end space-x-2 mt-4">
                                    <button onClick={() => { setChairmanFormData({ fullName: '', email: '', password: '' }) }} className="px-3 py-1 text-gray-500 text-sm">Cancel Edit</button>
                                    <button onClick={async () => {
                                        if (!chairmanData && !chairmanFormData.password) {
                                            addToast('Password is required for new Chairman', 'error');
                                            return;
                                        }
                                        try {
                                            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/global/chairman`, chairmanFormData, { headers: { Authorization: `Bearer ${token}` } });
                                            addToast('Global Chairman saved successfully!', 'success');
                                            
                                            // Refresh the chairman data
                                            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/global/chairman`, { headers: { Authorization: `Bearer ${token}` } });
                                            setChairmanData(res.data);
                                            
                                            setChairmanFormData({ fullName: '', email: '', password: '' });
                                        } catch(e:any) {
                                            addToast(e.response?.data?.error || 'Failed to save Global Chairman', 'error');
                                        }
                                    }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                                        Save & Dispatch
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Bulk Upload Branch Admins</h2>
                            <button onClick={() => setShowBulkUploadModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                Upload a CSV file containing the following exact columns:
                            </p>
                            <code className="text-xs bg-gray-100 p-2 rounded block mb-4">Timestamp, Full Name, Email, Password, Company, Branch</code>
                            <label className="flex items-center justify-center cursor-pointer w-full bg-white border-2 border-dashed border-gray-300 text-gray-700 px-4 py-6 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition text-center">
                                {bulkUploadFile ? bulkUploadFile.name : 'Click here to choose CSV file'}
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    className="hidden"
                                    onChange={(e) => setBulkUploadFile(e.target.files ? e.target.files[0] : null)}
                                />
                            </label>
                        </div>

                        {bulkUploadStatus?.loading && (
                            <div className="flex items-center space-x-2 text-blue-600 mb-4">
                                <div className="animate-spin h-4 w-4 border-b-2 border-blue-600 rounded-full"></div>
                                <span className="text-sm">Processing upload and dispatching emails...</span>
                            </div>
                        )}

                        {bulkUploadStatus?.results && (
                            <div className="mb-4 p-4 bg-gray-50 rounded border">
                                <p className="text-sm font-semibold text-green-600">Successfully created: {bulkUploadStatus.results.successCount}</p>
                                <p className="text-sm font-semibold text-red-600">Failed: {bulkUploadStatus.results.failedCount}</p>
                                
                                {bulkUploadStatus.results.failedRows && bulkUploadStatus.results.failedRows.length > 0 && (
                                    <div className="mt-2 max-h-32 overflow-y-auto">
                                        <p className="text-xs font-bold text-gray-700">Failed Rows Details:</p>
                                        <ul className="list-disc pl-4 mt-1 text-xs text-red-500">
                                            {bulkUploadStatus.results.failedRows.map((f: any, idx: number) => (
                                                <li key={idx}><strong>{f.row['Email'] || 'Unknown'}</strong>: {f.reason}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => { setShowBulkUploadModal(false); setBulkUploadStatus(null); setBulkUploadFile(null); }} className="px-3 py-1 text-gray-500 text-sm">Close</button>
                            <button 
                                onClick={handleBulkUpload} 
                                disabled={!bulkUploadFile || bulkUploadStatus?.loading}
                                className={`px-4 py-2 text-white rounded-lg text-sm ${(!bulkUploadFile || bulkUploadStatus?.loading) ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                Process & Dispatch
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </>
            ) : activeTab === 'DOCUMENTS' ? (
                <DocumentTemplatesConfig />
            ) : (
                <ProfileSettings />
            )}

            {/* Custom Confirm Dialog */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform transition-all">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">{confirmDialog.title}</h3>
                            <button onClick={() => setConfirmDialog(null)} className="text-gray-400 hover:text-gray-500">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">{confirmDialog.message}</p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => setConfirmDialog(null)} 
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDialog.onConfirm} 
                                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
