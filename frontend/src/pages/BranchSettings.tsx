import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Building2, MapPin, Save, Shield, Lock, Activity, Bell } from 'lucide-react';
import { ProfileSettings } from '../components/ProfileSettings';
import { AccountantSettings } from './AccountantSettings';

export const BranchSettings = () => {
    const { user, token, login } = useAuth();
    const { addToast } = useToast();
    const [activeMainTab, setActiveMainTab] = useState<'SECURITY' | 'CORPORATE'>('SECURITY');
    const [activeAdminTab, setActiveAdminTab] = useState<'BRANCH_CONFIG' | 'PROFILE'>('BRANCH_CONFIG');
    const [loading, setLoading] = useState(false);
    
    // Branch Config
    const [branchName, setBranchName] = useState('');
    const [address, setAddress] = useState('');
    const [managerName, setManagerName] = useState('');
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [abbreviation, setAbbreviation] = useState('');
    const [idCardFrontTemplate, setIdCardFrontTemplate] = useState('');
    const [idCardBackTemplate, setIdCardBackTemplate] = useState('');
    const [isHeadOffice, setIsHeadOffice] = useState(false);

    // Operational Prefs
    const [oooDelegation, setOooDelegation] = useState(false);
    const [alertRequisitions, setAlertRequisitions] = useState(true);

    // Passwords
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (user?.branch) {
            setBranchName(user.branch.name);
            setAddress(user.branch.address || '');
            setManagerName((user.branch as any).managerName || '');
            setAbbreviation((user.branch as any).abbreviation || '');
            setIdCardFrontTemplate((user.branch as any).idCardFrontTemplate || '');
            setIdCardBackTemplate((user.branch as any).idCardBackTemplate || '');
            setIsHeadOffice((user.branch as any).isHeadOffice || false);
        }
    }, [user]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', branchName);
            formData.append('address', address);
            formData.append('managerName', managerName);
            formData.append('abbreviation', abbreviation);
            formData.append('idCardFrontTemplate', idCardFrontTemplate);
            formData.append('idCardBackTemplate', idCardBackTemplate);
            formData.append('isHeadOffice', isHeadOffice.toString());
            if (signatureFile) {
                formData.append('signature', signatureFile);
            }

            const targetBranchId = user?.branchId || user?.branch?.id;
            const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/branches/${targetBranchId}`,
                formData,
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
            );
            
            if (user && token) {
                const updatedUser = { ...user, branch: res.data };
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                login(token, updatedUser);
            }
            
            setSignatureFile(null);
            addToast('Branch details updated successfully!', 'success');
        } catch (error) {
            console.error('Update failed', error);
            addToast('Failed to update branch details.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast("New passwords do not match!", "error");
            return;
        }
        if (newPassword.length < 6) {
            addToast("Password must be at least 6 characters.", "error");
            return;
        }
        setPasswordLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/change-password`, {
                userId: user?.id,
                currentPassword,
                newPassword
            }, { headers: { Authorization: `Bearer ${token}` } });
            addToast("Password updated successfully!", "success");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Password update failed", error);
            addToast(error.response?.data?.error || "Failed to update password", "error");
        } finally {
            setPasswordLoading(false);
        }
    };

    if (!user?.branchId && !user?.branch?.id) return <div className="p-10 text-red-500">Access Restricted: No branch assigned.</div>;

    const isBranchAdminLevel = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGING_DIRECTOR'].includes(user?.role || '');

    if (!isBranchAdminLevel) {
        if (user?.role === 'ACCOUNTANT') {
            return (
                <div className="space-y-6 max-w-7xl mx-auto pb-10">
                    <div className="flex space-x-1 border-b border-gray-200 mb-6">
                        <button
                            onClick={() => setActiveMainTab('SECURITY')}
                            className={`pb-3 px-4 text-sm font-medium transition-colors ${
                                activeMainTab === 'SECURITY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Account & Security
                        </button>
                        <button
                            onClick={() => setActiveMainTab('CORPORATE')}
                            className={`pb-3 px-4 text-sm font-medium transition-colors ${
                                activeMainTab === 'CORPORATE' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Corporate Bank Accounts
                        </button>
                    </div>

                    {activeMainTab === 'CORPORATE' ? (
                        <AccountantSettings embedded />
                    ) : (
                        <ProfileSettings />
                    )}
                </div>
            );
        }
        return <ProfileSettings />;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex space-x-1 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveAdminTab('BRANCH_CONFIG')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${
                        activeAdminTab === 'BRANCH_CONFIG' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Branch Configuration
                </button>
                <button
                    onClick={() => setActiveAdminTab('PROFILE')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${
                        activeAdminTab === 'PROFILE' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Profile & ID Card
                </button>
            </div>

            {activeAdminTab === 'PROFILE' ? (
                <ProfileSettings />
            ) : (
                <div className="space-y-6 max-w-4xl pb-10">
                    <header>
                <h1 className="text-2xl font-bold text-gray-800">Branch Configuration</h1>
                <p className="text-gray-500">Manage branch details, operational alerts, and security.</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column */}
                <div className="space-y-6">
                    {/* Branch Configuration Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Branch Profile</h2>
                                <p className="text-sm text-gray-500">Visible to all branch personnel.</p>
                            </div>
                        </div>

                        {user?.role === 'MANAGING_DIRECTOR' && (
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
                                <p className="text-sm text-orange-800 font-medium">
                                    <strong>Document Generation Note:</strong> When marketers sell plots managed by this branch, the resulting <strong>Offer & Allocation Letters</strong> will bear the Manager's Name and Signature uploaded below instead of the Global Company's MD.
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleUpdate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={branchName}
                                        onChange={(e) => setBranchName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                    <Building2 size={18} className="absolute left-3 top-3 text-gray-400" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Abbreviation</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={abbreviation}
                                        onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition uppercase"
                                        placeholder="E.g., UTK"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address / Location</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                    <MapPin size={18} className="absolute left-3 top-3 text-gray-400" />
                                </div>
                            </div>

                            {user?.role === 'MANAGING_DIRECTOR' && (
                                <div className="space-y-5 pt-4 border-t border-gray-100">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch Manager Name</label>
                                        <input
                                            type="text"
                                            placeholder="E.g., John Doe"
                                            value={managerName}
                                            onChange={(e) => setManagerName(e.target.value)}
                                            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                    <div className="md:col-span-2 pt-2">
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isHeadOffice}
                                                onChange={(e) => setIsHeadOffice(e.target.checked)}
                                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <div>
                                                <span className="block text-sm font-medium text-gray-900">Mark as Head Office</span>
                                                <span className="block text-xs text-gray-500">Enable this if this branch serves as the corporate headquarters. Documents will reflect Head Office executive signatures.</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Manager Signature (Image)</label>
                                        <div className="flex items-center space-x-2 mt-2 w-full">
                                            <label className="flex-1 cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-gray-400 transition text-center shadow-sm">
                                                {signatureFile ? signatureFile.name : 'Select Signature Image'}
                                                <input 
                                                    type="file" 
                                                    accept="image/*, .svg"
                                                    onChange={(e) => setSignatureFile(e.target.files ? e.target.files[0] : null)}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Upload a clear signature for Official Documents.</p>
                                        
                                        {((user.branch as any)?.signatureUrl) && !signatureFile && (
                                            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center">
                                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-bold">Currently Saved Signature</p>
                                                <img 
                                                    src={(user.branch as any).signatureUrl.startsWith('http') 
                                                        ? (user.branch as any).signatureUrl 
                                                        : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${(user.branch as any).signatureUrl}`} 
                                                    alt="Manager Signature" 
                                                    className="h-12 object-contain" 
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Branch ID Card Templates</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Front Page HTML</label>
                                                <textarea className="w-full px-4 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" value={idCardFrontTemplate} onChange={e => setIdCardFrontTemplate(e.target.value)} placeholder="<div>Front of ID Card</div>"></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Back Page HTML</label>
                                                <textarea className="w-full px-4 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24" value={idCardBackTemplate} onChange={e => setIdCardBackTemplate(e.target.value)} placeholder="<div>Back of ID Card</div>"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-70"
                                >
                                    <Save size={18} />
                                    <span>{loading ? 'Saving...' : 'Update Details'}</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-start space-x-3">
                        <Shield size={20} className="text-amber-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-amber-800 text-sm">Authority Constraint</h3>
                            <p className="text-amber-700 text-sm mt-1">
                                As a <strong>Branch Admin</strong>, you command local workflows. Global structural changes (branding, templates, inventory) must be escalated to the Executive Admin.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Security & Password */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                         <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-700">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Security Access</h2>
                                <p className="text-sm text-gray-500">Update your branch administrative password.</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                                    />
                                </div>
                            </div>
                             <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-900 transition disabled:opacity-70 text-sm font-medium"
                                >
                                    {passwordLoading ? 'Updating...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Operational Preferences */}
                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Operational Prefs</h2>
                                <p className="text-sm text-gray-500">Configure alert parameters and workflow states.</p>
                            </div>
                        </div>

                         <div className="space-y-6">
                            {/* OOO Toggle */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800">Out of Office (OOO) Auto-Delegation</h4>
                                    <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                                        Sets state to 'Away' and escalates vital branch approvals directly to Global Executive (MD).
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setOooDelegation(!oooDelegation)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${oooDelegation ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${oooDelegation ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Requisition Alert Toggle */}
                            <div className="flex items-start justify-between border-t border-gray-100 pt-5">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 flex items-center">
                                        Surge Alerts <Bell size={14} className="ml-1 text-slate-400"/>
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                                        Receive an instant ping whenever staff branch requisitions pool over 5 concurrent requests.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setAlertRequisitions(!alertRequisitions)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${alertRequisitions ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${alertRequisitions ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                     </div>
                </div>

            </div>
        </div>
            )}
        </div>
    );
};
