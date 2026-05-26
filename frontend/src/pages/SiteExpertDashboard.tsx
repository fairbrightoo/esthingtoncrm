import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Map, Calendar, Camera } from 'lucide-react';

export const SiteExpertDashboard = () => {
    const { user } = useAuth();
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Site Expert Headquarters</h1>
                <p className="text-gray-500 mt-1">Welcome back, {user?.fullName}. Manage your inspections and media.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-blue-100 p-4 rounded-xl text-blue-600"><Map size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Estates</p>
                        <h2 className="text-2xl font-bold text-gray-800">Knowledge Base</h2>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600"><Calendar size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Inspections</p>
                        <h2 className="text-2xl font-bold text-gray-800">Track Hub</h2>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-purple-100 p-4 rounded-xl text-purple-600"><Camera size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Media</p>
                        <h2 className="text-2xl font-bold text-gray-800">Site Uploads</h2>
                    </div>
                </div>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="text-blue-800 font-bold mb-2">Notice: Hybrid Role</h3>
                <p className="text-blue-700 text-sm">As a Site Expert, you also have full Marketer privileges. You can manage your own leads and record your sales using the 'My Leads' section in the sidebar.</p>
            </div>
        </div>
    );
};
