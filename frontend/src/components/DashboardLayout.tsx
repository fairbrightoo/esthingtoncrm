import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { AICoachWidget } from './AICoachWidget';
import { Menu, UserCog, FileText } from 'lucide-react';
import axios from 'axios';

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, user, token, isLoading, isAdminImpersonating, returnToAdmin } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [unreadMemosCount, setUnreadMemosCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-close sidebar on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Fetch unread memos
    useEffect(() => {
        if (!user || !token) return;
        
        const fetchUnreadCount = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/memos/unread-count`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUnreadMemosCount(res.data.unreadCount || 0);
            } catch (error) {
                console.error('Failed to fetch unread memo count', error);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [user, token, location.pathname]);

    useEffect(() => {
        // If not authenticated and not loading, redirect to Landing Page. 
        if (!isLoading && !isAuthenticated && !user) {
            navigate('/');
        }
    }, [isAuthenticated, user, isLoading, navigate]);

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
    );

    if (!user) return null; // Blink prevention

    const handleReturnToAdmin = () => {
        returnToAdmin();
        navigate('/admin/users');
    };

    return (
        <div className="flex flex-col bg-gray-50 min-h-screen relative">
            {/* Impersonation Banner */}
            {isAdminImpersonating && (
                <div className="bg-red-600 text-white px-4 py-2 flex flex-col sm:flex-row items-center justify-center text-sm font-medium z-50 sticky top-0 shadow-md">
                    <div className="flex items-center mb-2 sm:mb-0 sm:mr-4">
                        <UserCog size={18} className="mr-2 animate-pulse" />
                        <span>You are currently impersonating <strong>{user.fullName}</strong>. Actions taken are recorded under their identity.</span>
                    </div>
                    <button 
                        onClick={handleReturnToAdmin}
                        className="bg-white text-red-600 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-red-50 transition-colors shadow-sm"
                    >
                        Return to Admin
                    </button>
                </div>
            )}

            {/* Unread Memos Banner */}
            {unreadMemosCount > 0 && !location.pathname.includes('/memos') && (
                <div className="bg-blue-600 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-center text-sm font-medium z-40 shadow-sm">
                    <div className="flex items-center mb-2 sm:mb-0 sm:mr-4">
                        <FileText size={18} className="mr-2 animate-bounce" />
                        <span>You have <strong>{unreadMemosCount} unread {unreadMemosCount === 1 ? 'Memo' : 'Memos'}</strong> requiring your attention.</span>
                    </div>
                    <button 
                        onClick={() => {
                            const basePath = user?.branch ? `/dashboard/${user.branch.name.toLowerCase().replace(/\s+/g, '-')}` : '/dashboard';
                            navigate(`${basePath}/memos`);
                        }}
                        className="bg-white text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm"
                    >
                        View Memos
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row flex-1">
                {/* Mobile Header */}
                <div className="md:hidden bg-white shadow-sm border-b border-gray-100 sticky top-0 z-30 px-4 py-3 flex justify-between items-center">
                    <div className="font-black text-gray-900 text-lg tracking-tight">Esthington CRM</div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                <Sidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                
                <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden w-full max-w-[100vw]">
                    {children}
                </main>
                <AICoachWidget />
            </div>
        </div>
    );
};
