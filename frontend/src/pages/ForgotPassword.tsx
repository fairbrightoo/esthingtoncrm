import { useState, useEffect } from 'react';
import { Mail, ArrowRight, ArrowLeft, Building2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export const ForgotPassword = () => {
    const [searchParams] = useSearchParams();
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    
    const [companyName, setCompanyName] = useState('Esthington Group');
    const [branchName, setBranchName] = useState('');
    const [companyTheme, setCompanyTheme] = useState('#1e293b'); // Default slate-800

    useEffect(() => {
        if (companyId) {
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`)
                .then(res => {
                    const company = res.data.find((c: any) => c.id === companyId);
                    if (company) {
                        setCompanyName(company.name);
                        setCompanyTheme(company.themeColor || '#1e293b');
                    }
                })
                .catch(() => console.error("Could not fetch company branding"));

            if (branchId) {
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches`)
                    .then(res => {
                        const branch = res.data.find((b: any) => b.id === branchId);
                        if (branch) {
                            setBranchName(branch.name);
                        }
                    })
                    .catch(() => console.error("Could not fetch branch details"));
            }
        }
    }, [companyId, branchId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/forgot-password`, { email });
            setSuccessMessage(res.data.message || 'If an account exists with that email, a reset link has been sent.');
            setEmail('');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to process request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
            <div 
                className="absolute top-0 left-0 w-full h-64 opacity-10" 
                style={{ background: `linear-gradient(to bottom right, ${companyTheme}, transparent)` }}
            />

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative z-10">
                <div 
                    className="p-8 text-white text-center"
                    style={{ backgroundColor: companyTheme }}
                >
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Building2 size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">{companyName}</h2>
                    {branchName && <p className="text-white/90 font-medium">{branchName}</p>}
                    <p className="text-white/80 text-sm mt-2">Password Reset Request</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
                            <p className="text-sm text-green-700">{successMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none transition-all"
                                    placeholder={
                                        companyName.toLowerCase().includes('esthington links')
                                            ? "name@esthingtonlinks.com"
                                            : "name@esthington.com"
                                    }
                                    style={{ borderColor: 'transparent', boxShadow: 'none' }}
                                />
                                <style>{`
                                    input:focus {
                                        box-shadow: 0 0 0 2px ${companyTheme}33; 
                                        border-color: ${companyTheme};
                                    }
                                `}</style>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 brightness-110 hover:brightness-125"
                            style={{ backgroundColor: companyTheme }}
                        >
                            {isLoading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Send Reset Link</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link to={`/login${window.location.search}`} className="text-sm hover:underline text-gray-500 flex items-center justify-center gap-2">
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};


