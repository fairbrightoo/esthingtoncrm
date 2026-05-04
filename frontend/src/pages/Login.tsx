import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, Building2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [companyName, setCompanyName] = useState('Esthington Group');
    const [branchName, setBranchName] = useState('');
    const [companyTheme, setCompanyTheme] = useState('#1e293b'); // Default slate-800

    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');
    const isAdminLogin = searchParams.get('admin') === 'true';

    useEffect(() => {
        if (companyId) {
            // Fetch company details for branding
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`)
                .then(res => {
                    const company = res.data.find((c: any) => c.id === companyId);
                    if (company) {
                        setCompanyName(company.name);
                        setCompanyTheme(company.themeColor || '#1e293b');
                    }
                })
                .catch(() => console.error("Could not fetch company branding"));

            // Fetch branch details if branchId exists
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
        setIsLoading(true);

        try {
            const loginPayload = {
                email,
                password,
                companyId: isAdminLogin ? undefined : companyId,
                branchId
            };

            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/login`, loginPayload);

            const user = res.data.user;
            login(res.data.token, user);

            if (user.role === 'SUPER_ADMIN') {
                navigate('/admin');
            } else if (user.role === 'BRANCH_ADMIN' || user.role === 'BRANCH_HR' || user.role === 'MARKETER' || user.role === 'CUSTOMER_CARE' || user.role === 'MANAGING_DIRECTOR' || user.role === 'ACCOUNTANT') {
                // Redirect to dynamic URL: /dashboard/garki
                const branchSlug = user.branch?.name?.toLowerCase().replace(/\s+/g, '-') || 'branch-home';
                navigate(`/dashboard/${branchSlug}`);
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div
                className="absolute top-0 left-0 w-full h-64 opacity-10"
                style={{ background: `linear-gradient(to bottom right, ${companyTheme}, transparent)` }}
            />

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative z-10">
                {/* Header */}
                <div
                    className="p-8 text-white text-center"
                    style={{ backgroundColor: companyTheme }}
                >
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Building2 size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">{companyName}</h2>
                    {branchName && <p className="text-white/90 font-medium">{branchName}</p>}
                    <p className="text-white/80 text-sm mt-1">Workspace Login</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start">
                            <AlertCircle className="text-red-500 w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
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
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all"
                                    placeholder={
                                        companyName.toLowerCase().includes('esthington links')
                                            ? "name@esthingtonlinks.com"
                                            : "name@esthington.com"
                                    }
                                    style={{ borderColor: 'transparent', boxShadow: 'none' }}
                                // box-shadow hack to reset, then apply focus ring color logically via utility if possible, 
                                // but dynamic colors are tricky with plain tailwind classes. Using inline style for focus ring color is harder.
                                // Keeping it simple with gray focus for now or generic primary.
                                />
                                {/* Custom border logic via style for dynamic color */}
                                <style>{`
                                    input:focus {
                                        box-shadow: 0 0 0 2px ${companyTheme}33; 
                                        border-color: ${companyTheme};
                                    }
                                `}</style>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg outline-none transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
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
                                    <span>Sign In</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link to={`/forgot-password${window.location.search}`} className="text-sm hover:underline text-gray-500">
                            Forgot your password?
                        </Link>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">Protected by Esthington Security</p>
                </div>
            </div>
        </div>
    );
};
