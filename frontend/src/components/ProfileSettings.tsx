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
    
    // Passwords
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Tabs
    const [activeTab, setActiveTab] = useState<'SECURITY' | 'ID_CARD'>('ID_CARD');
    const [idCardData, setIdCardData] = useState<any>(null);

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
    }, [activeTab, user, token, idCardData]);

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
                                {user?.role.replace(/_/g, ' ')}
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
                                        onClick={() => {
                                            const idCardElement = document.getElementById('id-card-preview');
                                            if (idCardElement) {
                                                toPng(idCardElement, { pixelRatio: 2 })
                                                    .then(function (dataUrl) {
                                                        const pdf = new jsPDF({
                                                            orientation: 'portrait',
                                                            unit: 'mm',
                                                            format: [86, 54] // Standard ID card size (portrait)
                                                        });
                                                        pdf.addImage(dataUrl, 'PNG', 0, 0, 54, 86);
                                                        pdf.save(`${idCardData.employeeId || 'ID'}_Card.pdf`);
                                                    })
                                                    .catch(function (error) {
                                                        console.error('Oops, something went wrong!', error);
                                                        addToast("Failed to generate PDF. Check console.", "error");
                                                    });
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
                                            <span className="font-medium text-gray-900">{idCardData.role?.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Branch:</span>
                                            <span className="font-medium text-gray-900">{idCardData.branch?.name || 'Head Office'}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 italic mt-4">
                                        Note: If any information here is incorrect, please contact your Branch Admin or HR to update it. Profile details are locked from direct editing to maintain data integrity.
                                    </p>
                                </div>

                                <div className="flex justify-center items-center bg-gray-50 rounded-xl p-6 border border-dashed border-gray-200">
                                    {/* ID Card Render Area */}
                                    <div 
                                        id="id-card-preview" 
                                        className="bg-white shadow-xl overflow-hidden relative"
                                        style={{ 
                                            width: '2.125in', 
                                            height: '3.375in', 
                                            // 86x54mm is standard CR80. Portrait means 54mm width, 86mm height.
                                            // That's roughly 2.125 inches by 3.375 inches.
                                        }}
                                    >
                                        {/* This is a placeholder default template. The real one will be injected from HTML template in the DB */}
                                        {idCardData.branch?.idCardFrontTemplate || idCardData.company?.idCardFrontTemplate ? (
                                            <div dangerouslySetInnerHTML={{ 
                                                __html: (idCardData.branch?.idCardFrontTemplate || idCardData.company?.idCardFrontTemplate || '')
                                                    .replace(/{{fullName}}/g, idCardData.fullName)
                                                    .replace(/{{role}}/g, idCardData.role?.replace(/_/g, ' '))
                                                    .replace(/{{employeeId}}/g, idCardData.employeeId || 'N/A')
                                                    .replace(/{{branchName}}/g, idCardData.branch?.name || 'Head Office')
                                                    .replace(/{{companyName}}/g, idCardData.company?.name || 'Esthington CRM')
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
                                                    <div className="text-[10px] text-blue-200 font-medium uppercase tracking-wide mt-1 bg-black/20 px-2 py-0.5 rounded">{idCardData.role?.replace(/_/g, ' ')}</div>
                                                </div>
                                                <div className="p-4 flex flex-col items-center border-t border-white/10 mt-auto bg-black/10">
                                                    <div className="text-[8px] text-blue-200 uppercase mb-0.5">Employee ID</div>
                                                    <div className="font-mono text-sm font-bold tracking-wider">{idCardData.employeeId || 'PENDING'}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
