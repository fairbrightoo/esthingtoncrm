import { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

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
            <div className="absolute top-0 left-0 w-full h-64 opacity-10 bg-gradient-to-br from-slate-800 to-transparent" />

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative z-10">
                <div className="p-8 text-white text-center bg-slate-800">
                    <h2 className="text-2xl font-bold">Reset Password</h2>
                    <p className="text-white/80 text-sm mt-2">Enter your email address to receive a secure reset link.</p>
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
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all"
                                    placeholder="name@esthington.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-slate-800 text-white font-medium rounded-lg shadow-md hover:bg-slate-900 transition-all duration-300 flex items-center justify-center space-x-2"
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
                        <Link to="/" className="text-sm hover:underline text-gray-500 flex items-center justify-center gap-2">
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
