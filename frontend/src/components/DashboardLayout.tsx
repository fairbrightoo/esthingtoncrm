import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { AICoachWidget } from './AICoachWidget';
import { Menu, X } from 'lucide-react';

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, user, isLoading } = useAuth();
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

    return (
        <div className="flex flex-col md:flex-row bg-gray-50 min-h-screen relative">
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
    );
};
