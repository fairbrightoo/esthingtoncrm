import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, UserCircle2, Mail, Phone, FileText, CheckCircle2, Building, Upload } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

export const PartnerRegistration = () => {
    const [searchParams] = useSearchParams();
    const referralCode = searchParams.get('ref');
    const branchId = searchParams.get('branch');
    const { addToast } = useToast();

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        companyName: '',
        documentsUrl: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            await axios.post(`${API_URL}/api/partners/submit`, {
                ...formData,
                referralCode,
                branchId
            });
            setIsSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error: any) {
            console.error('Submit error:', error);
            addToast(error.response?.data?.error || 'Failed to submit application', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden text-center p-10 border border-slate-100">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">Application Received!</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Thank you for your interest in partnering with us. Your application is currently under review. Please allow up to 3 business days for processing.
                    </p>
                    <p className="text-sm font-medium text-slate-500">We will notify you via email.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

            <div className="max-w-xl w-full relative z-10">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                        <Building2 size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Partner Registration</h1>
                    <p className="text-indigo-200">Join our network of elite real estate partners.</p>
                </div>

                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="p-8 md:p-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* Personal Details */}
                            <div className="space-y-5">
                                <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase border-b pb-2">Personal Details</h3>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <UserCircle2 size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="fullName"
                                            required
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-800"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail size={18} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-800"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone size={18} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="tel"
                                                name="phone"
                                                required
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-800"
                                                placeholder="+234..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Company Details */}
                            <div className="space-y-5 pt-4">
                                <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase border-b pb-2">Business Details (Optional)</h3>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company / Agency Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Building size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-800"
                                            placeholder="Leave blank if individual"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Document Link (CAC / ID Card)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FileText size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="url"
                                            name="documentsUrl"
                                            value={formData.documentsUrl}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-800"
                                            placeholder="Google Drive or Dropbox link"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 ml-1">Please provide a link to a folder containing your ID and CAC certificate (if applicable).</p>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={20} className="mr-2" /> Submit Application
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
