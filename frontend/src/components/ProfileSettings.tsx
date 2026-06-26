import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Lock, Save, ShieldCheck, Smartphone, Bell, Mail, CreditCard, Download, Printer } from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export const ProfileSettings = () => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const resolveUrl = (url?: string) => {
        const EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        if (!url) return EMPTY_IMAGE;
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        if (url.startsWith('/')) {
            return `${apiUrl}${url}`;
        }
        
        // Proxy external URLs (like Cloudflare R2) through backend to prevent CORS issues with html-to-image
        if (url.startsWith('http')) {
            return `${apiUrl}/api/proxy-image?url=${encodeURIComponent(url)}`;
        }
        
        return url;
    };

    // Passwords
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Tabs
    const [activeTab, setActiveTab] = useState<'SECURITY' | 'ID_CARD' | 'REFERRAL'>('ID_CARD');
    const [idCardData, setIdCardData] = useState<any>(null);

    // Referrals State
    const [referralCodes, setReferralCodes] = useState<any[]>([]);
    const [networkData, setNetworkData] = useState<{ referrals: any[], totalReferralEarnings: number } | null>(null);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [newCodePercentage, setNewCodePercentage] = useState(3.0);

    React.useEffect(() => {
        if (activeTab === 'ID_CARD' && !idCardData && user) {
            // Fetch full profile to get templates and employeeId
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                setIdCardData(res.data);
            }).catch(err => {
                console.error("Failed to load profile for ID card", err);
            });
        }
        if (activeTab === 'REFERRAL' && user && !user.referralCodeId) {
            fetchReferralCodes();
        }
    }, [activeTab, user, token, idCardData]);

    const fetchReferralCodes = async () => {
        try {
            const [codesRes, networkRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/referrals/my-codes`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/referrals/my-network`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setReferralCodes(codesRes.data);
            setNetworkData(networkRes.data);
        } catch (error) {
            console.error("Failed to load referral data", error);
        }
    };

    const handleGenerateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneratingCode(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/referrals/generate`, 
                { percentage: newCodePercentage },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast("Referral Code generated successfully!", "success");
            fetchReferralCodes();
            setNewCodePercentage(3.0);
        } catch (error: any) {
            console.error("Failed to generate referral code", error);
            addToast(error.response?.data?.error || "Failed to generate referral code", "error");
        } finally {
            setGeneratingCode(false);
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

        setLoading(true);
        try {
            // Note: If you don't have a change-password route yet, this acts as a placeholder
            // for the UI. Usually it maps to /api/users/change-password
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/change-password`, {
                userId: user?.id,
                currentPassword,
                newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            addToast("Password updated successfully!", "success");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Password update failed", error);
            addToast(error.response?.data?.error || "Failed to update password", "error");
        } finally {
            setLoading(false);
        }
    };

    // Signature Upload
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [uploadingSignature, setUploadingSignature] = useState(false);

    const handleSignatureUpload = async () => {
        if (!signatureFile || !user) return;
        setUploadingSignature(true);
        try {
            const formData = new FormData();
            formData.append('signature', signatureFile);
            const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile/${user.id}`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setIdCardData(res.data);
            setSignatureFile(null);
            addToast("Signature uploaded successfully!", "success");
        } catch (error) {
            console.error("Signature upload failed", error);
            addToast("Failed to upload signature", "error");
        } finally {
            setUploadingSignature(false);
        }
    };

    // Reference Photo Upload
    const [referencePhotoFile, setReferencePhotoFile] = useState<File | null>(null);
    const [uploadingReferencePhoto, setUploadingReferencePhoto] = useState(false);

    const handleReferencePhotoUpload = async () => {
        if (!referencePhotoFile || !user) return;
        setUploadingReferencePhoto(true);
        try {
            const formData = new FormData();
            formData.append('referencePhoto', referencePhotoFile);
            const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile/${user.id}`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setIdCardData(res.data);
            setReferencePhotoFile(null);
            addToast("AI Reference Photo uploaded successfully!", "success");
        } catch (error) {
            console.error("Reference photo upload failed", error);
            addToast("Failed to upload reference photo", "error");
        } finally {
            setUploadingReferencePhoto(false);
        }
    };

    // Dummy toggles for UI
    const [twoFactor, setTwoFactor] = useState(false);
    const [emailNotifs, setEmailNotifs] = useState(true);

    return (
        <div className="max-w-5xl mx-auto pb-10">
            <header className="mb-8 border-b pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Account & Security</h1>
                    <p className="text-gray-500 mt-1">Manage your security credentials and system preferences.</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveTab('ID_CARD')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'ID_CARD' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        <div className="flex items-center space-x-2">
                            <CreditCard size={18} />
                            <span>Profile & ID Card</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('SECURITY')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'SECURITY' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        <div className="flex items-center space-x-2">
                            <Lock size={18} />
                            <span>Security</span>
                        </div>
                    </button>
                    {!user?.referralCodeId && (
                        <button
                            onClick={() => setActiveTab('REFERRAL')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'REFERRAL' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <div className="flex items-center space-x-2">
                                <User size={18} />
                                <span>Referrals</span>
                            </div>
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Fixed Info & Status */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Profile Card */}
                    <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-lg p-6 text-white text-center">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
                            <User size={40} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">{user?.fullName || 'User'}</h2>
                        <p className="text-blue-200 text-sm">{user?.email}</p>
                        <div className="mt-4">
                            <span className="inline-block text-[10px] uppercase tracking-widest font-bold bg-white text-blue-900 px-3 py-1 rounded-full shadow-sm">
                                {user?.role === 'MARKETER' ? 'BDE' : user?.role.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>

                    {/* Account Health / Core Details */}
                    <div className="bg-green-50 rounded-2xl p-5 border border-green-100/50 shadow-sm">
                        <div className="flex items-start space-x-3">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600 mt-0.5">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-green-900 text-sm">Clearance Level: High</h3>
                                <p className="text-green-800 text-xs mt-1 leading-relaxed">
                                    Your account handles sensitive financial data. Personal details are securely managed by HR.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Interactive Settings */}
                <div className="lg:col-span-8 space-y-6">
                    {activeTab === 'SECURITY' && (
                        <>
                            {/* Security Settings (Change Password) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                                <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-100">
                                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                                        <Lock size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
                                        <p className="text-sm text-gray-500">Ensure your account uses a long, random sequence.</p>
                                    </div>
                                </div>

                                <form onSubmit={handlePasswordChange} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                            placeholder="Enter current password"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                                placeholder="New secure password"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                                placeholder="Match new password"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition disabled:opacity-70"
                                        >
                                            <Save size={18} />
                                            <span>{loading ? 'Updating Security...' : 'Update Password'}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Advanced Preferences Panel */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Advanced Preferences</h2>
                                
                                <div className="space-y-4">
                                    {/* 2FA Mock Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-white p-2 border border-gray-200 rounded-lg text-gray-700 shadow-sm">
                                                <Smartphone size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-sm">Two-Factor Authentication (2FA)</h3>
                                                <p className="text-gray-500 text-xs mt-0.5">Protect your account with an extra verification step.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setTwoFactor(!twoFactor)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${twoFactor ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactor ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {/* Email Notifications Mock Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-white p-2 border border-gray-200 rounded-lg text-gray-700 shadow-sm">
                                                <Bell size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 text-sm">Disbursement Notifications</h3>
                                                <p className="text-gray-500 text-xs mt-0.5">Receive an email when MD approves a requisition.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setEmailNotifs(!emailNotifs)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${emailNotifs ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifs ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'ID_CARD' && idCardData && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Digital ID Card</h2>
                                    <p className="text-sm text-gray-500">Your official corporate identification.</p>
                                </div>
                                <div className="flex space-x-3">
                                    <button 
                                        onClick={async () => {
                                            const frontEl = document.getElementById('id-card-preview-front');
                                            const backEl = document.getElementById('id-card-preview-back');
                                            
                                            if (frontEl && backEl) {
                                                try {
                                                    const frontDataUrl = await toPng(frontEl, { pixelRatio: 3, cacheBust: true });
                                                    const backDataUrl = await toPng(backEl, { pixelRatio: 3, cacheBust: true });
                                                    
                                                    const pdf = new jsPDF({
                                                        orientation: 'portrait',
                                                        unit: 'mm',
                                                        format: [86, 54] 
                                                    });
                                                    
                                                    // Page 1
                                                    pdf.addImage(frontDataUrl, 'PNG', 0, 0, 54, 86);
                                                    // Page 2
                                                    pdf.addPage();
                                                    pdf.addImage(backDataUrl, 'PNG', 0, 0, 54, 86);
                                                    
                                                    pdf.save(`${idCardData.employeeId || 'ID'}_Card.pdf`);
                                                } catch (error) {
                                                    console.error('Oops, something went wrong!', error);
                                                    addToast("Failed to generate PDF. Check console.", "error");
                                                }
                                            }
                                        }}
                                        className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition"
                                    >
                                        <Download size={16} />
                                        <span>Download PDF</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-800">Profile Information</h3>
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Employee ID:</span>
                                            <span className="font-mono font-bold text-gray-900">{idCardData.employeeId || 'Pending Assignment'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Full Name:</span>
                                            <span className="font-medium text-gray-900">{idCardData.fullName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Role:</span>
                                            <span className="font-medium text-gray-900">{idCardData.role === 'MARKETER' ? 'BDE' : idCardData.role?.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Branch:</span>
                                            <span className="font-medium text-gray-900">{idCardData.branch?.name || 'Head Office'}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 italic mt-4">
                                        Note: If any information here is incorrect, please contact your Branch Admin or HR to update it. Profile details are locked from direct editing to maintain data integrity.
                                    </p>
                                    
                                    <div className="mt-6 border-t border-gray-100 pt-6">
                                        <h3 className="font-semibold text-gray-800 mb-3">Your Official Signature</h3>
                                        {idCardData.signatureUrl ? (
                                            <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center">
                                                <img src={resolveUrl(idCardData.signatureUrl)} alt="Signature" className="h-16 object-contain mb-3 bg-white p-2 border rounded-lg" />
                                                <p className="text-xs text-gray-500 mb-3">This signature will appear on your ID Card and Official Documents.</p>
                                                <div className="flex flex-col w-full space-y-3">
                                                    <div className="flex w-full items-center space-x-2">
                                                        <label className="flex-1 cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-gray-400 transition text-center shadow-sm">
                                                            {signatureFile ? signatureFile.name : 'Select Signature Image'}
                                                            <input 
                                                                type="file" 
                                                                accept="image/*, .svg"
                                                                onChange={(e) => setSignatureFile(e.target.files ? e.target.files[0] : null)}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        <button 
                                                            onClick={handleSignatureUpload}
                                                            disabled={!signatureFile || uploadingSignature}
                                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-sm"
                                                        >
                                                            {uploadingSignature ? 'Saving...' : 'Update'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                                                <p className="text-xs text-orange-800 mb-3">You haven't uploaded your signature yet. It is required for your ID Card.</p>
                                                <div className="flex flex-col w-full space-y-3">
                                                    <div className="flex items-center space-x-2 w-full">
                                                        <label className="flex-1 cursor-pointer bg-white border border-orange-300 text-orange-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-orange-50 hover:border-orange-400 transition text-center shadow-sm">
                                                            {signatureFile ? signatureFile.name : 'Select Signature Image'}
                                                            <input 
                                                                type="file" 
                                                                accept="image/*, .svg"
                                                                onChange={(e) => setSignatureFile(e.target.files ? e.target.files[0] : null)}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        <button 
                                                            onClick={handleSignatureUpload}
                                                            disabled={!signatureFile || uploadingSignature}
                                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-sm"
                                                        >
                                                            {uploadingSignature ? 'Saving...' : 'Upload'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-6 border-t border-gray-100 pt-6">
                                        <h3 className="font-semibold text-gray-800 mb-3">AI Facial Verification Photo</h3>
                                        <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center">
                                            {idCardData.referencePhotoUrl ? (
                                                <img src={resolveUrl(idCardData.referencePhotoUrl)} alt="Reference Photo" className="w-24 h-24 object-cover rounded-full mb-3 shadow-md border-2 border-white" />
                                            ) : (
                                                <div className="w-24 h-24 bg-gray-200 rounded-full mb-3 flex items-center justify-center text-gray-400">
                                                    <User size={32} />
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 mb-3 text-center">This photo is strictly used by the AI engine to verify your identity when you clock in for attendance.</p>
                                            <div className="flex flex-col w-full space-y-3">
                                                <div className="flex w-full items-center space-x-2">
                                                    <label className="flex-1 cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-gray-400 transition text-center shadow-sm">
                                                        {referencePhotoFile ? referencePhotoFile.name : 'Select Clear Selfie'}
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            onChange={(e) => setReferencePhotoFile(e.target.files ? e.target.files[0] : null)}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                    <button 
                                                        onClick={handleReferencePhotoUpload}
                                                        disabled={!referencePhotoFile || uploadingReferencePhoto}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-sm"
                                                    >
                                                        {uploadingReferencePhoto ? 'Saving...' : 'Upload'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center space-y-6 bg-gray-50 rounded-xl p-6 border border-dashed border-gray-200">
                                    {/* Front of ID Card Render Area */}
                                    <div 
                                        id="id-card-preview-front" 
                                        className="bg-white shadow-xl overflow-hidden relative"
                                        style={{ width: '2.125in', height: '3.375in' }}
                                    >
                                        {idCardData.branch?.idCardFrontTemplate || idCardData.company?.idCardFrontTemplate ? (
                                            <div className="h-full w-full" dangerouslySetInnerHTML={{ 
                                                __html: (idCardData.branch?.idCardFrontTemplate || idCardData.company?.idCardFrontTemplate || '')
                                                    .replace(/{{fullName}}/g, idCardData.fullName)
                                                    .replace(/{{role}}/g, idCardData.role === 'MARKETER' ? 'BDE' : idCardData.role?.replace(/_/g, ' '))
                                                    .replace(/{{employeeId}}/g, idCardData.employeeId || 'N/A')
                                                    .replace(/{{branchName}}/g, idCardData.branch?.name || 'Head Office')
                                                    .replace(/{{companyName}}/g, idCardData.company?.name || 'Esthington CRM')
                                                    .replace(/{{staffSignature}}/g, resolveUrl(idCardData.signatureUrl) || '')
                                                    .replace(/{{authorizedSignature}}/g, resolveUrl(idCardData.branch?.signatureUrl || idCardData.company?.signatureUrl) || '')
                                                    .replace(/{{passportUrl}}/g, resolveUrl(idCardData.passportUrl) || '')
                                                    .replace(/{{companyLogo}}/g, resolveUrl(idCardData.company?.logoUrl) || '')
                                            }} />
                                        ) : (
                                            <div className="h-full w-full flex flex-col relative bg-gradient-to-b from-blue-600 to-blue-900 text-white">
                                                <div className="p-4 text-center">
                                                    <div className="font-black text-sm mb-1 uppercase tracking-wider">{idCardData.company?.name || 'Company Name'}</div>
                                                    <div className="text-[8px] text-blue-200 uppercase">{idCardData.branch?.name || 'Head Office'}</div>
                                                </div>
                                                <div className="flex-1 flex flex-col items-center justify-center mt-2">
                                                    <div className="w-24 h-24 bg-white/20 rounded-xl mb-4 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center overflow-hidden">
                                                        <User size={48} className="text-white/80" />
                                                    </div>
                                                    <h2 className="text-lg font-bold leading-tight px-2 text-center text-white">{idCardData.fullName}</h2>
                                                    <div className={`text-blue-200 font-medium uppercase tracking-wide mt-1 bg-black/20 px-2 py-0.5 rounded text-center whitespace-nowrap ${idCardData.role === 'MARKETER' ? 'text-[10px]' : 'text-[10px]'}`}>{idCardData.role === 'MARKETER' ? 'BDE' : idCardData.role?.replace(/_/g, ' ')}</div>
                                                </div>
                                                <div className="p-4 flex flex-col items-center border-t border-white/10 mt-auto bg-black/10">
                                                    <div className="text-[8px] text-blue-200 uppercase mb-0.5">Employee ID</div>
                                                    <div className="font-mono text-sm font-bold tracking-wider">{idCardData.employeeId || 'PENDING'}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Back of ID Card Render Area */}
                                    <div 
                                        id="id-card-preview-back" 
                                        className="bg-white shadow-xl overflow-hidden relative"
                                        style={{ width: '2.125in', height: '3.375in' }}
                                    >
                                        {idCardData.branch?.idCardBackTemplate || idCardData.company?.idCardBackTemplate ? (
                                            <div className="h-full w-full" dangerouslySetInnerHTML={{ 
                                                __html: (idCardData.branch?.idCardBackTemplate || idCardData.company?.idCardBackTemplate || '')
                                                    .replace(/{{officeAddress}}/g, idCardData.branch?.address || idCardData.company?.address || 'Head Office')
                                                    .replace(/{{officeEmail}}/g, idCardData.branch?.email || idCardData.company?.email || '')
                                                    .replace(/{{officePhone}}/g, idCardData.branch?.phone || idCardData.company?.phone || '')
                                                    .replace(/{{officeWebsite}}/g, idCardData.company?.website || '')
                                                    .replace(/{{companyLogo}}/g, resolveUrl(idCardData.company?.logoUrl) || '')
                                                    .replace(/{{authorizedSignature}}/g, resolveUrl(idCardData.branch?.signatureUrl || idCardData.company?.signatureUrl) || '')
                                            }} />
                                        ) : (
                                            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
                                                <h3 className="text-sm font-bold text-gray-800 mb-2">If found, please return to:</h3>
                                                <p className="text-xs text-gray-600 mb-4">{idCardData.branch?.address || idCardData.company?.address || 'Company HQ'}</p>
                                                {idCardData.branch?.signatureUrl || idCardData.company?.signatureUrl ? (
                                                    <img src={resolveUrl(idCardData.branch?.signatureUrl || idCardData.company?.signatureUrl)} alt="Authorized" className="h-10 opacity-80" />
                                                ) : <div className="h-10"></div>}
                                                <div className="text-[8px] font-bold mt-1 uppercase tracking-widest text-gray-400">Authorized Signature</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'REFERRAL' && !user?.referralCodeId && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">My Referral Network</h2>
                                    <p className="text-sm text-gray-500">Generate codes to onboard external marketers to your downline.</p>
                                </div>
                            </div>
                            
                            <form onSubmit={handleGenerateCode} className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl">
                                <h3 className="font-semibold text-blue-900 mb-2">Generate New Referral Code</h3>
                                <p className="text-sm text-blue-800 mb-4">Set the commission percentage that the external marketer will receive for their sales. You will receive the remaining portion of your base commission ({user?.commissionRate || 10}%).</p>
                                
                                <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
                                    <div className="w-full sm:flex-1">
                                        <label className="block text-sm font-semibold text-blue-900 mb-1">Downliner's Commission (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max={(user?.commissionRate || 10) - 0.01}
                                            required
                                            value={newCodePercentage}
                                            onChange={(e) => setNewCodePercentage(parseFloat(e.target.value) || 0)}
                                            className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={generatingCode}
                                        className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-blue-700 transition disabled:opacity-70 h-[42px]"
                                    >
                                        {generatingCode ? 'Generating...' : 'Generate Code'}
                                    </button>
                                </div>
                            </form>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5">
                                    <h3 className="text-emerald-800 font-bold mb-1">Total Referral Earnings</h3>
                                    <p className="text-3xl font-black text-emerald-600">₦{(networkData?.totalReferralEarnings || 0).toLocaleString()}</p>
                                    <p className="text-xs text-emerald-700 mt-2">Earned from downlines' closed sales</p>
                                </div>
                                <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
                                    <h3 className="text-indigo-800 font-bold mb-1">Active Downlines</h3>
                                    <p className="text-3xl font-black text-indigo-600">{networkData?.referrals?.length || 0}</p>
                                    <p className="text-xs text-indigo-700 mt-2">Marketers in your network</p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="font-bold text-gray-800 mb-4">Your Active Codes</h3>
                                {referralCodes.length === 0 ? (
                                    <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-500">
                                        You haven't generated any referral codes yet.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {referralCodes.map(code => (
                                            <div key={code.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-50 transition group">
                                                <div>
                                                    <div className="flex items-center space-x-3 mb-1">
                                                        <span className="font-mono font-bold text-lg text-gray-900">{code.code}</span>
                                                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold">{code.percentage}% Comm.</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                        Created on {new Date(code.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-gray-800">{code._count?.users || 0} Recruits</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-800 mb-4">Network Activity</h3>
                                {!networkData?.referrals || networkData.referrals.length === 0 ? (
                                    <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-500">
                                        No marketers have joined your network yet.
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 text-gray-500 font-medium text-xs">
                                                <tr>
                                                    <th className="px-4 py-3 border-b border-gray-100">Downline Name</th>
                                                    <th className="px-4 py-3 border-b border-gray-100">Assigned Comm. Rate</th>
                                                    <th className="px-4 py-3 border-b border-gray-100">Join Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-sm">
                                                {networkData.referrals.map(referral => (
                                                    <tr key={referral.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-semibold text-gray-900">{referral.fullName}</div>
                                                            <div className="text-gray-500 text-xs">{referral.email}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">{referral.commissionRate}%</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 text-xs">
                                                            {new Date(referral.createdAt).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
