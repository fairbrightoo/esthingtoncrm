import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Mail, Plus, Trash2, Phone, Upload, CheckCircle, AlertCircle, FileText, Image as ImageIcon, File as FileIcon, ExternalLink, X } from 'lucide-react';

export const BranchUsers = () => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Edit State
    const [editingUser, setEditingUser] = useState<any>(null);
    const [createdUserCreds, setCreatedUserCreds] = useState<any>(null);

    // Document Modal State
    const [selectedStaffDocs, setSelectedStaffDocs] = useState<any>(null);
    const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

    // Document Deletion Confirmation State
    const [docToDelete, setDocToDelete] = useState<{ staffId: string; documentType: string; name: string } | null>(null);
    const [deletingDoc, setDeletingDoc] = useState(false);

    // User Deletion Confirmation State
    const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
    const [deletingUser, setDeletingUser] = useState(false);

    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [uploadingBulk, setUploadingBulk] = useState(false);
    const [bulkReport, setBulkReport] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        monthlySalary: 0,
        commissionRate: 5.0,
        role: 'MARKETER',
        dateOfBirth: '',
        bankName: '',
        accountName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        nextOfKinName: '',
        nextOfKinPhone: ''
    });

    const branchName = user?.branch?.name || 'Branch';
    const effectiveCompanyId = user?.companyId || user?.company?.id;
    const effectiveBranchId = user?.branchId || user?.branch?.id;

    useEffect(() => {
        if (effectiveCompanyId && effectiveBranchId) {
            fetchUsers()
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${effectiveCompanyId}/branches/${effectiveBranchId}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.accountNumber && formData.accountNumber !== formData.confirmAccountNumber) {
            addToast('Account numbers do not match', 'error');
            return;
        }

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${effectiveCompanyId}/branches/${effectiveBranchId}/users`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsModalOpen(false);
            setCreatedUserCreds({ ...formData, role: formData.role, password: res.data.tempPassword }); // Show creds with auto-generated password
            setFormData({ fullName: '', email: '', phone: '', password: '', monthlySalary: 0, commissionRate: 5.0, role: 'MARKETER', dateOfBirth: '', bankName: '', accountName: '', accountNumber: '', confirmAccountNumber: '', nextOfKinName: '', nextOfKinPhone: '' });
            fetchUsers();
            addToast('Staff member created successfully', 'success');
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to create user', 'error');
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        if (formData.accountNumber && formData.accountNumber !== formData.confirmAccountNumber) {
            addToast('Account numbers do not match', 'error');
            return;
        }
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/users/${editingUser.id}`,
                {
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    role: formData.role,
                    dateOfBirth: formData.dateOfBirth || undefined,
                    monthlySalary: formData.monthlySalary,
                    commissionRate: formData.commissionRate,
                    bankName: formData.bankName,
                    accountName: formData.accountName,
                    accountNumber: formData.accountNumber,
                    nextOfKinName: formData.nextOfKinName,
                    nextOfKinPhone: formData.nextOfKinPhone,
                    password: formData.password || undefined // Only send if changed
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEditingUser(null);
            setFormData({ fullName: '', email: '', phone: '', password: '', monthlySalary: 0, commissionRate: 5.0, role: 'MARKETER', dateOfBirth: '', bankName: '', accountName: '', accountNumber: '', confirmAccountNumber: '', nextOfKinName: '', nextOfKinPhone: '' });
            fetchUsers();
            addToast('Staff updated successfully', 'success');
        } catch (error: any) {
            addToast('Failed to update user', 'error');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, staffId: string, documentType: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploadingDocType(documentType);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/users/${staffId}/documents`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
            );
            addToast(`${documentType} uploaded successfully`, 'success');
            setSelectedStaffDocs(res.data);
            fetchUsers();
        } catch (error: any) {
            console.error('File upload failed', error);
            addToast(error.response?.data?.error || `Failed to upload ${documentType}`, 'error');
        } finally {
            setUploadingDocType(null);
            e.target.value = ''; // Reset input
        }
    };

    const handleDeleteDocument = async () => {
        if (!docToDelete) return;
        setDeletingDoc(true);
        try {
            const res = await axios.delete(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/users/${docToDelete.staffId}/documents/${docToDelete.documentType}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast(`${docToDelete.name} removed successfully`, 'success');
            setSelectedStaffDocs(res.data);
            fetchUsers();
            setDocToDelete(null);
        } catch (error: any) {
            console.error('File delete failed', error);
            addToast(error.response?.data?.error || `Failed to remove ${docToDelete.name}`, 'error');
        } finally {
            setDeletingDoc(false);
        }
    };

    const openEditModal = (u: any) => {
        setEditingUser(u);
        setFormData({
            fullName: u.fullName,
            email: u.email,
            phone: u.phone || '',
            dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split('T')[0] : '',
            password: '',
            monthlySalary: u.monthlySalary || 0,
            commissionRate: u.commissionRate !== undefined ? u.commissionRate : 5.0,
            bankName: u.bankName || '',
            accountName: u.accountName || '',
            accountNumber: u.accountNumber || '',
            confirmAccountNumber: u.accountNumber || '',
            nextOfKinName: u.nextOfKinName || '',
            nextOfKinPhone: u.nextOfKinPhone || '',
            role: u.role
        });
    };

    const closeModals = () => {
        setIsModalOpen(false);
        setIsBulkModalOpen(false);
        setEditingUser(null);
        setSelectedStaffDocs(null);
        setBulkFile(null);
        setBulkReport(null);
        setFormData({ fullName: '', email: '', phone: '', password: '', monthlySalary: 0, commissionRate: 5.0, role: 'MARKETER', dateOfBirth: '', bankName: '', accountName: '', accountNumber: '', confirmAccountNumber: '', nextOfKinName: '', nextOfKinPhone: '' });
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setDeletingUser(true);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/users/${userToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUsers();
            addToast('User removed successfully', 'success');
            setUserToDelete(null);
        } catch (error: any) {
            addToast('Failed to delete user', 'error');
        } finally {
            setDeletingUser(false);
        }
    };

    if (loading) return <div className="p-10">Loading staff...</div>;

    const filteredUsers = users.filter(u => u.role !== 'BRANCH_ADMIN');

    const getFileUrl = (url: string) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{branchName} Staff</h1>
                    <p className="text-gray-500">Manage Marketers and Customer Care agents.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        <Upload size={20} />
                        <span>Bulk Upload</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus size={20} />
                        <span>Add Staff</span>
                    </button>
                </div>
            </header>

            {/* Credential Success Banner */}
            {createdUserCreds && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 relative">
                    <button onClick={() => setCreatedUserCreds(null)} className="absolute top-3 right-3 text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg flex items-center space-x-1 transition font-medium text-sm border border-green-200">
                        <X size={16} />
                        <span>Dismiss Banner</span>
                    </button>
                    <h3 className="text-green-800 font-bold flex items-center mb-2"><User size={18} className="mr-2" /> New Staff Created!</h3>
                    <p className="text-green-700 text-sm mb-2">Please copy these details immediately. They will not be shown again.</p>
                    <div className="bg-white p-3 rounded border border-green-100 flex flex-col space-y-1 text-sm font-mono text-gray-700">
                        <span><strong>Role:</strong> {createdUserCreds.role}</span>
                        <span><strong>Email:</strong> {createdUserCreds.email}</span>
                        <span><strong>Original Password:</strong> {createdUserCreds.password}</span>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 font-medium text-sm">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map(u => (
                            <tr key={u.id}
                                onClick={() => setSelectedStaffDocs(u)}
                                className="hover:bg-gray-50 cursor-pointer">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        {u.passportUrl ? (
                                            <img
                                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${u.passportUrl}`}
                                                alt={u.fullName}
                                                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                            />
                                        ) : (
                                            <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center">
                                                <User size={16} className="text-gray-600" />
                                            </div>
                                        )}
                                        <span className="font-medium text-gray-800">{u.fullName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold
                                        ${u.role === 'BRANCH_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                            u.role === 'HEAD_BDD' ? 'bg-amber-100 text-amber-700' :
                                                u.role === 'BDM' ? 'bg-indigo-100 text-indigo-700' :
                                                    u.role === 'TEAM_LEAD' ? 'bg-teal-100 text-teal-700' :
                                                        u.role === 'CUSTOMER_CARE' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-blue-100 text-blue-700'}`}>
                                        {u.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col text-sm text-gray-500 space-y-1">
                                        <div className="flex items-center space-x-2"><Mail size={12} /> <span>{u.email}</span></div>
                                        {u.phone && <div className="flex items-center space-x-2"><Phone size={12} /> <span>{u.phone}</span></div>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {u.role !== 'BRANCH_ADMIN' && (
                                        <div className="flex space-x-2">
                                            <button onClick={(e) => { e.stopPropagation(); openEditModal(u); }} className="text-blue-500 hover:text-blue-700 p-1">
                                                Edit
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setUserToDelete({ id: u.id, name: u.fullName }); }} className="text-red-500 hover:text-red-700 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && <div className="p-8 text-center text-gray-500">No staff found.</div>}
            </div>

            {/* Staff Details & Documents Modal */}
            {selectedStaffDocs && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{selectedStaffDocs.fullName}</h2>
                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                    <Mail size={14} className="mr-1" /> {selectedStaffDocs.email}
                                    {selectedStaffDocs.phone && <><span className="mx-2">•</span> <Phone size={14} className="mr-1" /> {selectedStaffDocs.phone}</>}
                                </p>
                            </div>
                            <button onClick={closeModals} className="text-gray-400 hover:text-gray-600 bg-gray-200 rounded-full p-2">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Passport Section */}
                            <div className="border rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-blue-50 p-3 rounded-lg text-blue-500">
                                        <ImageIcon size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Passport Photograph</h4>
                                        <p className="text-xs text-gray-500">Image file (.jpg, .png)</p>
                                    </div>
                                </div>
                                <div>
                                    {selectedStaffDocs.passportUrl ? (
                                        <div className="flex items-center space-x-3">
                                            <a href={getFileUrl(selectedStaffDocs.passportUrl)} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                <ExternalLink size={16} className="mr-1" /> View
                                            </a>
                                            <label className="cursor-pointer text-gray-500 hover:text-gray-700 text-sm font-medium transition">
                                                {uploadingDocType === 'passport' ? 'Uploading...' : 'Update'}
                                                <input type="file" accept="image/*" className="hidden" disabled={uploadingDocType === 'passport'} onChange={(e) => handleFileUpload(e, selectedStaffDocs.id, 'passport')} />
                                            </label>
                                            <button
                                                onClick={() => setDocToDelete({ staffId: selectedStaffDocs.id, documentType: 'passport', name: 'Passport Photograph' })}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium transition"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition">
                                            {uploadingDocType === 'passport' ? 'Uploading...' : 'Upload'}
                                            <input type="file" accept="image/*" className="hidden" disabled={uploadingDocType === 'passport'} onChange={(e) => handleFileUpload(e, selectedStaffDocs.id, 'passport')} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* CV Section */}
                            <div className="border rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-orange-50 p-3 rounded-lg text-orange-500">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Curriculum Vitae (CV)</h4>
                                        <p className="text-xs text-gray-500">Document file (.pdf, .doc)</p>
                                    </div>
                                </div>
                                <div>
                                    {selectedStaffDocs.cvUrl ? (
                                        <div className="flex items-center space-x-3">
                                            <a href={getFileUrl(selectedStaffDocs.cvUrl)} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                <ExternalLink size={16} className="mr-1" /> View
                                            </a>
                                            <label className="cursor-pointer text-gray-500 hover:text-gray-700 text-sm font-medium transition">
                                                {uploadingDocType === 'cv' ? 'Uploading...' : 'Update'}
                                                <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={uploadingDocType === 'cv'} onChange={(e) => handleFileUpload(e, selectedStaffDocs.id, 'cv')} />
                                            </label>
                                            <button
                                                onClick={() => setDocToDelete({ staffId: selectedStaffDocs.id, documentType: 'cv', name: 'Curriculum Vitae' })}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium transition"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition">
                                            {uploadingDocType === 'cv' ? 'Uploading...' : 'Upload'}
                                            <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={uploadingDocType === 'cv'} onChange={(e) => handleFileUpload(e, selectedStaffDocs.id, 'cv')} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Employment Agreement Section */}
                            <div className="border rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-purple-50 p-3 rounded-lg text-purple-500">
                                        <FileIcon size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Employment Agreement</h4>
                                        <p className="text-xs text-gray-500">Signed agreement (.pdf)</p>
                                    </div>
                                </div>
                                <div>
                                    {selectedStaffDocs.agreementUrl ? (
                                        <div className="flex items-center space-x-3">
                                            <a href={getFileUrl(selectedStaffDocs.agreementUrl)} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                <ExternalLink size={16} className="mr-1" /> View
                                            </a>
                                            <label className="cursor-pointer text-gray-500 hover:text-gray-700 text-sm font-medium transition">
                                                {uploadingDocType === 'agreement' ? 'Uploading...' : 'Update'}
                                                <input type="file" accept=".pdf" className="hidden" disabled={uploadingDocType === 'agreement'} onChange={(e) => handleFileUpload(e, selectedStaffDocs.id, 'agreement')} />
                                            </label>
                                            <button
                                                onClick={() => setDocToDelete({ staffId: selectedStaffDocs.id, documentType: 'agreement', name: 'Employment Agreement' })}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium transition"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition">
                                            {uploadingDocType === 'agreement' ? 'Uploading...' : 'Upload'}
                                            <input type="file" accept=".pdf" className="hidden" disabled={uploadingDocType === 'agreement'} onChange={(e) => handleFileUpload(e, selectedStaffDocs.id, 'agreement')} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal (Create OR Edit) */}
            {(isModalOpen || editingUser) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
                        <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input required className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input required type="email" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                                <input type="tel" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (Optional)</label>
                                <input type="date" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                            </div>
                            {editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reset Password (Leave blank to keep current)</label>
                                    <input type="password" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₦)</label>
                                    <input type="number" step="0.01" min="0" required className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.monthlySalary} onChange={e => setFormData({ ...formData, monthlySalary: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                                    <input type="number" step="0.01" min="0" max="100" required className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.commissionRate} onChange={e => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <hr className="my-4 border-gray-100" />
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Bank Account Details</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                    <input type="text" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} 
                                        placeholder="e.g. Zenith Bank" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                        <input type="text" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Account Number</label>
                                        <input type="text" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.confirmAccountNumber} onChange={e => setFormData({ ...formData, confirmAccountNumber: e.target.value })} />
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                                    <input type="text" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.accountName} onChange={e => setFormData({ ...formData, accountName: e.target.value })} />
                                </div>
                            </div>

                            <hr className="my-4 border-gray-100" />
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Next of Kin Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Name</label>
                                    <input type="text" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.nextOfKinName} onChange={e => setFormData({ ...formData, nextOfKinName: e.target.value })} 
                                        placeholder="e.g. John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Phone</label>
                                    <input type="text" className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.nextOfKinPhone} onChange={e => setFormData({ ...formData, nextOfKinPhone: e.target.value })} 
                                        placeholder="e.g. 08012345678" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="MARKETER">Marketer</option>
                                    <option value="TEAM_LEAD">Team Lead</option>
                                    <option value="BDM">Business Development Manager</option>
                                    <option value="HEAD_BDD">Head of Business Development</option>
                                    <option value="CUSTOMER_CARE">Customer Care</option>
                                    <option value="BRANCH_HR">Human Resources</option>
                                    <option value="GENERAL_MANAGER">General Manager</option>
                                    <option value="ACCOUNTANT">Accountant</option>
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={closeModals} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    {editingUser ? 'Update Staff' : 'Create Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Bulk Upload Staff</h2>
                            <button onClick={closeModals} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        {!bulkReport ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800 relative">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const headers = "full_name,phone,email,role,password,date_of_birth\nJohn Doe,0800000000,john@example.com,MARKETER,password123,1990-05-24\n";
                                            const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
                                            const link = document.createElement("a");
                                            link.href = URL.createObjectURL(blob);
                                            link.setAttribute("download", "branch_staff_bulk_template.csv");
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }}
                                        className="absolute top-4 right-4 bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition font-medium cursor-pointer"
                                    >
                                        Download Template
                                    </button>
                                    <p className="font-semibold mb-2">CSV Format Requirements:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Required columns: <code>full_name</code>, <code>email</code></li>
                                        <li>Optional columns: <code>phone</code>, <code>role</code>, <code>password</code>, <code>date_of_birth</code></li>
                                        <li><code>role</code> must be either <strong>MARKETER</strong> or <strong>CUSTOMER_CARE</strong> (defaults to MARKETER)</li>
                                        <li>If <code>password</code> is omitted, it defaults to <code>password123</code></li>
                                    </ul>
                                </div>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => setBulkFile(e.target.files ? e.target.files[0] : null)}
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 mt-4">
                                    <button type="button" onClick={closeModals} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                    <button
                                        onClick={async () => {
                                            if (!bulkFile) return;
                                            setUploadingBulk(true);
                                            const formData = new FormData();
                                            formData.append('file', bulkFile);
                                            try {
                                                const res = await axios.post(
                                                    `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${effectiveCompanyId}/branches/${effectiveBranchId}/users/bulk`,
                                                    formData,
                                                    { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
                                                );
                                                setBulkReport(res.data);
                                                fetchUsers();
                                                addToast('Bulk processing completed', 'success');
                                            } catch (err) {
                                                console.error(err);
                                                addToast('Bulk upload failed', 'error');
                                            } finally {
                                                setUploadingBulk(false);
                                            }
                                        }}
                                        disabled={!bulkFile || uploadingBulk}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                                    >
                                        {uploadingBulk ? 'Uploading...' : 'Upload & Process'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-green-50 p-4 rounded-lg flex items-center space-x-3">
                                    <CheckCircle className="text-green-500 h-6 w-6" />
                                    <div>
                                        <h3 className="font-bold text-green-800">Processing Complete</h3>
                                        <p className="text-green-700 text-sm">{bulkReport.success} out of {bulkReport.total} staff created.</p>
                                    </div>
                                </div>

                                {bulkReport.duplicates?.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-red-600 flex items-center text-sm mb-2"><AlertCircle size={16} className="mr-1" /> Failed / Duplicates</h4>
                                        <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded-lg text-xs">
                                            {bulkReport.duplicates.map((d: any, i: number) => (
                                                <div key={i} className="text-red-700 py-1 border-b border-red-100 last:border-0">
                                                    <strong>{d.row.email || 'Unknown'}</strong>: {d.reason}
                                                </div>
                                            ))}
                                            {bulkReport.errors?.map((e: any, i: number) => (
                                                <div key={`err-${i}`} className="text-red-700 py-1 border-b border-red-100 last:border-0">
                                                    <strong>{e.row.email || 'Unknown'}</strong>: {e.error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end mt-4">
                                    <button onClick={closeModals} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Close</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Sleek Delete Confirmation Modal */}
            {docToDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Document?</h3>
                            <p className="text-gray-500 text-sm">
                                Are you sure you want to delete the <strong>{docToDelete.name}</strong> for this staff member? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex border-t border-gray-100">
                            <button
                                onClick={() => setDocToDelete(null)}
                                className="flex-1 py-4 text-gray-600 font-medium hover:bg-gray-50 transition border-r border-gray-100"
                                disabled={deletingDoc}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteDocument}
                                className="flex-1 py-4 text-red-500 font-bold hover:bg-red-50 transition flex justify-center items-center"
                                disabled={deletingDoc}
                            >
                                {deletingDoc ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Deleting...
                                    </span>
                                ) : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Custom Sleek Delete User Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Staff Member?</h3>
                            <p className="text-gray-500 text-sm">
                                Are you sure you want to completely remove <strong>{userToDelete.name}</strong> from this branch? Their account will be deleted and this cannot be undone.
                            </p>
                        </div>
                        <div className="flex border-t border-gray-100">
                            <button
                                onClick={() => setUserToDelete(null)}
                                className="flex-1 py-4 text-gray-600 font-medium hover:bg-gray-50 transition border-r border-gray-100"
                                disabled={deletingUser}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                className="flex-1 py-4 text-red-500 font-bold hover:bg-red-50 transition flex justify-center items-center"
                                disabled={deletingUser}
                            >
                                {deletingUser ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Deleting...
                                    </span>
                                ) : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchUsers;
