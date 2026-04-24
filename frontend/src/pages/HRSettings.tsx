import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Clock, CalendarDays, Wallet, FileCheck, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const HRSettings = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [settings, setSettings] = useState({
        defaultCheckInTime: '08:00',
        defaultCheckOutTime: '17:00',
        lateToleranceMinutes: 15,
        annualLeaveDays: 20,
        sickLeaveDays: 10,
        maternityLeaveDays: 90,
        lateDeductionFee: 0,
        standardPensionRate: 0,
        standardTaxRate: 0,
        onboardingChecklist: 'Guarantor Form,Valid ID,Passport Photo'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-settings`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                if (res.data) setSettings(res.data);
            } catch (error) {
                console.error('Failed to load HR settings', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (field: string, value: string | number) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-settings`, settings, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            alert('HR Rules & Settings saved successfully.');
        } catch (error) {
            console.error('Failed to save settings', error);
            alert('Error saving settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Settings className="mr-3 text-blue-600" size={32} />
                    HR Operations & Policies
                </h1>
                <p className="text-gray-500 mt-2">Manage branch-level staff requirements, payroll constraints, and attendance parameters.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Working Hours */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                    <div className="flex items-center space-x-3 text-gray-800 border-b pb-4">
                        <div className="bg-blue-50 p-2 rounded-lg"><Clock className="text-blue-600" size={24} /></div>
                        <h2 className="text-lg font-bold">Attendance & Working Hours</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Check-in Time</label>
                            <input type="time" value={settings.defaultCheckInTime} onChange={(e) => handleChange('defaultCheckInTime', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-blue-500" />
                            <p className="text-xs text-gray-400 mt-1">Expected daily arrival</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Check-out Time</label>
                            <input type="time" value={settings.defaultCheckOutTime} onChange={(e) => handleChange('defaultCheckOutTime', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-blue-500" />
                            <p className="text-xs text-gray-400 mt-1">Expected daily departure</p>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Late Tolerance (Minutes)</label>
                        <input type="number" min="0" value={settings.lateToleranceMinutes} onChange={(e) => handleChange('lateToleranceMinutes', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-blue-500" />
                        <p className="text-xs text-gray-400 mt-1">Grace period before staff is automatically marked as 'LATE'</p>
                    </div>
                </div>

                {/* Time-Off Policies */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                    <div className="flex items-center space-x-3 text-gray-800 border-b pb-4">
                        <div className="bg-purple-50 p-2 rounded-lg"><CalendarDays className="text-purple-600" size={24} /></div>
                        <h2 className="text-lg font-bold">Time-Off Quotas</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Leave (Days)</label>
                            <input type="number" min="0" value={settings.annualLeaveDays} onChange={(e) => handleChange('annualLeaveDays', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-purple-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sick Leave (Days)</label>
                            <input type="number" min="0" value={settings.sickLeaveDays} onChange={(e) => handleChange('sickLeaveDays', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-purple-500" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Maternity/Paternity Leave (Days)</label>
                            <input type="number" min="0" value={settings.maternityLeaveDays} onChange={(e) => handleChange('maternityLeaveDays', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-purple-500" />
                        </div>
                    </div>
                </div>

                {/* Payroll Defaults */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                    <div className="flex items-center space-x-3 text-gray-800 border-b pb-4">
                        <div className="bg-green-50 p-2 rounded-lg"><Wallet className="text-green-600" size={24} /></div>
                        <h2 className="text-lg font-bold">Payroll & Deductions</h2>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lateness Flat Deduction (₦)</label>
                        <input type="number" min="0" step="100" value={settings.lateDeductionFee} onChange={(e) => handleChange('lateDeductionFee', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-green-500" />
                        <p className="text-xs text-gray-400 mt-1">Automatic flat deduction applied per late day during payroll generation</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pension Tax Rate (%)</label>
                            <input type="number" min="0" max="100" step="0.1" value={settings.standardPensionRate} onChange={(e) => handleChange('standardPensionRate', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-green-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Personal Tax Rate (%)</label>
                            <input type="number" min="0" max="100" step="0.1" value={settings.standardTaxRate} onChange={(e) => handleChange('standardTaxRate', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-green-500" />
                        </div>
                    </div>
                </div>

                {/* Onboarding Requirements */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                    <div className="flex items-center space-x-3 text-gray-800 border-b pb-4">
                        <div className="bg-amber-50 p-2 rounded-lg"><FileCheck className="text-amber-600" size={24} /></div>
                        <h2 className="text-lg font-bold">Onboarding Checklist</h2>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Required Documents (Comma-separated)</label>
                        <textarea rows={4} value={settings.onboardingChecklist} onChange={(e) => handleChange('onboardingChecklist', e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-amber-500 resize-none font-mono text-sm leading-relaxed" placeholder="Guarantor Form, Valid ID, Utility Bill, ..." />
                        <p className="text-xs text-gray-400 mt-2">These requirements will automatically show up when HR triggers a bulk staff onboarding push.</p>
                    </div>
                </div>

            </div>

            <div className="flex justify-end pt-4 mb-10 border-t border-gray-200">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-md active:scale-95 disabled:opacity-75"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    <span>{isSaving ? 'Processing...' : 'Save Global Policies'}</span>
                </button>
            </div>
            
        </div>
    );
};
