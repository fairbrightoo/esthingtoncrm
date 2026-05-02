import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, FileText, Settings, LogOut, BookOpen, Home, CheckCircle, Megaphone, CalendarClock, FileSpreadsheet, Calendar, MessageCircle, X } from 'lucide-react';

export const Sidebar = ({ isMobileOpen, onClose }: { isMobileOpen?: boolean; onClose?: () => void }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Use dynamic branding from user object if logged in, otherwise fallback to "Esthington CRM"
    const branding = {
        name: user?.role === 'SUPER_ADMIN' ? 'Esthington Group' : (user?.company?.name || 'Esthington CRM'),
        color: user?.company?.themeColor || 'bg-gray-800' // Using tailwind dynamic classes or style
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const getBasePath = () => {
        if (user?.role === 'SUPER_ADMIN') return '/admin';
        if (user?.role === 'GROUP_MANAGING_DIRECTOR') return '/dashboard/global';
        // Fallback to 'head-office' or 'home' if branch missing, but ideally branch is present
        const branchSlug = user?.branch?.name?.toLowerCase().replace(/\s+/g, '-') || 'head-office';
        return `/dashboard/${branchSlug}`;
    };

    const basePath = getBasePath();

    return (
        <>
        {/* Mobile Backdrop Overlay */}
        {isMobileOpen && (
            <div 
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                onClick={onClose}
            />
        )}

        <div
            className={`fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 min-h-screen text-white flex flex-col shadow-2xl md:shadow-none ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            style={{ backgroundColor: branding.color.startsWith('#') ? branding.color : undefined }}
        >
            {/* Mobile Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white md:hidden transition- रंगों"
            >
                <X size={20} />
            </button>
            <div className="p-6">
                <h2 className="text-xl font-bold leading-tight">{branding.name}</h2>
                {user?.branchId && (
                    <p className="text-white/80 font-medium text-sm mt-0.5">
                        {user.branch?.name || 'Branch Workspace'}
                    </p>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                <NavItem
                    to={user?.role === 'SUPER_ADMIN' ? '/admin' : user?.role === 'GROUP_MANAGING_DIRECTOR' ? '/dashboard' : basePath}
                    icon={<LayoutDashboard size={20} />}
                    label="Overview"
                />

                {user?.role === 'SUPER_ADMIN' && (
                    <>
                        <NavItem to="/admin/onboarding" icon={<Upload size={20} />} label="Bulk Onboarding" />
                        <NavItem to="/admin/users" icon={<Users size={20} />} label="Global User Mgmt" />
                        <NavItem to="/admin/inventory" icon={<Home size={20} />} label="Inventory" />
                        <NavItem to="/admin/announcements" icon={<Megaphone size={20} />} label="Announcements" />
                    </>
                )}

                {user?.role === 'GROUP_MANAGING_DIRECTOR' && (
                    <NavItem to="/dashboard/memos" icon={<FileText size={20} />} label="Executive Memos" />
                )}

                {user?.role === 'BRANCH_ADMIN' && (
                    <>
                        <NavItem to={`${basePath}/tasks`} icon={<CheckCircle size={20} />} label="Tasks" />
                        <NavItem to={`${basePath}/requisitions`} icon={<FileSpreadsheet size={20} />} label="Requisitions" />
                        <NavItem to={`${basePath}/users`} icon={<Users size={20} />} label="Branch Staff" />
                        <NavItem to={`${basePath}/attendance`} icon={<CalendarClock size={20} />} label="Attendance" />
                        <NavItem to={`${basePath}/leads`} icon={<FileText size={20} />} label="All Branch Leads" />
                        <NavItem to={`${basePath}/inventory`} icon={<Home size={20} />} label="Inventory" />
                        <NavItem to={`${basePath}/campaigns`} icon={<FileText size={20} />} label="Campaigns" />
                    </>
                )}

                {user?.role === 'BRANCH_HR' && (
                    <>
                        <NavItem to={`${basePath}/users`} icon={<Users size={20} />} label="Branch Staff" />
                        <NavItem to={`${basePath}/attendance`} icon={<CalendarClock size={20} />} label="Attendance Tracking" />
                        <NavItem to={`${basePath}/payroll`} icon={<FileSpreadsheet size={20} />} label="Payroll Report" />
                        
                        <NavItem to={`${basePath}/leaves`} icon={<CalendarClock size={20} />} label="Leave Approvals" />
                        <NavItem to={`${basePath}/appraisals`} icon={<CheckCircle size={20} />} label="Performance & KPIs" />
                        <NavItem to={`${basePath}/disciplinary`} icon={<FileText size={20} />} label="Queries & Warnings" />
                        <NavItem to={`${basePath}/policies`} icon={<BookOpen size={20} />} label="Company Policies" />
                        
                        <NavItem to={`${basePath}/requisitions`} icon={<FileSpreadsheet size={20} />} label="Requisitions" />
                        <NavItem to={`${basePath}/announcements`} icon={<Megaphone size={20} />} label="Announcements" />
                        <NavItem to={`${basePath}/events`} icon={<Calendar size={20} />} label="Events & Calendar" />
                    </>
                )}

                {user?.role === 'CUSTOMER_CARE' && (
                    <>
                        <NavItem to={`${basePath}/tasks`} icon={<CheckCircle size={20} />} label="Tasks" />
                        <NavItem to={`${basePath}/requisitions`} icon={<FileSpreadsheet size={20} />} label="Requisitions" />
                        <NavItem to={`${basePath}/leads`} icon={<Users size={20} />} label="All Leads" />
                        <NavItem to={`${basePath}/inventory`} icon={<Home size={20} />} label="Inventory" />
                        <NavItem to={`${basePath}/campaigns`} icon={<FileText size={20} />} label="Campaigns" />
                        <NavItem to={`${basePath}/templates`} icon={<BookOpen size={20} />} label="Templates" />
                        <NavItem to={`${basePath}/scripts`} icon={<BookOpen size={20} />} label="Scripts" />
                        <NavItem to={`${basePath}/tickets`} icon={<MessageCircle size={20} />} label="Helpdesk Tickets" />
                        <NavItem to={`${basePath}/communications`} icon={<MessageCircle size={20} />} label="Communication Logs" />
                        
                        <NavItem to={`${basePath}/my-hr`} icon={<CalendarClock size={20} />} label="My HR Desk" />
                        <NavItem to={`${basePath}/policies`} icon={<BookOpen size={20} />} label="Company Policies" />
                    </>
                )}

                {user?.role === 'MARKETER' && (
                    <>
                        <NavItem to={`${basePath}/leads`} icon={<Users size={20} />} label="My Leads" />
                        <NavItem to={`${basePath}/campaigns`} icon={<FileText size={20} />} label="Campaigns" />
                        <NavItem to={`${basePath}/scripts`} icon={<BookOpen size={20} />} label="Scripts" />
                        
                        <NavItem to={`${basePath}/my-hr`} icon={<CalendarClock size={20} />} label="My HR Desk" />
                        <NavItem to={`${basePath}/policies`} icon={<BookOpen size={20} />} label="Company Policies" />
                    </>
                )}

                {user?.role === 'MANAGING_DIRECTOR' && (
                    <>
                        <NavItem to={`${basePath}/approvals`} icon={<CheckCircle size={20} />} label="Payment Approvals" />
                        <NavItem to={`${basePath}/memos`} icon={<FileText size={20} />} label="Executive Memos" />
                        <NavItem to={`${basePath}/leaves`} icon={<CalendarClock size={20} />} label="Leave Approvals" />
                        <NavItem to={`${basePath}/knowledge-base`} icon={<BookOpen size={20} />} label="AI Knowledge Base" />
                    </>
                )}

                {user?.role === 'ACCOUNTANT' && (
                    <>
                        <NavItem to={`${basePath}/disbursements`} icon={<CheckCircle size={20} />} label="Disbursement Center" />
                        <NavItem to={`${basePath}/payroll`} icon={<FileSpreadsheet size={20} />} label="Staff Payroll" />
                        <NavItem to={`${basePath}/taxes`} icon={<BookOpen size={20} />} label="Tax Compliance" />
                    </>
                )}
                
                {user?.role !== 'GROUP_MANAGING_DIRECTOR' && (
                    <>
                        <NavItem to={`${basePath}/reports`} icon={<FileText size={20} />} label="Reports" />
                        <NavItem to={`${basePath}/settings`} icon={<Settings size={20} />} label="Settings" />
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-white/10">
                <button onClick={handleLogout} className="flex items-center space-x-3 text-white/80 hover:text-white w-full px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">
                    <LogOut size={20} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
        </>
    );
};
const NavItem = ({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick?: () => void }) => {
    const handleAction = () => {
        if (onClick) onClick();
    };

    return (
        <NavLink
            to={to}
            onClick={handleAction}
            className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-white/20 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
            }
        >
            {icon}
            <span>{label}</span>
        </NavLink>
    );
};

