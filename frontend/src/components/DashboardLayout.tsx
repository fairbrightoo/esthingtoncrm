import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { AICoachWidget } from './AICoachWidget';
import { Menu, UserCog } from 'lucide-react';

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, user, isLoading, isAdminImpersonating, returnToAdmin } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-close sidebar on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

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
        navigate('/global-user-management');
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
