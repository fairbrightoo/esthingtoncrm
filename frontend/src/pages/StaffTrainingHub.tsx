import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Search } from 'lucide-react';

export const StaffTrainingHub = () => {
    const { user } = useAuth();
    
    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Staff Training Hub</h1>
                    <p className="text-gray-500 mt-1">Organize and deploy training materials for branch staff.</p>
                </div>
            </header>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-3 mb-6">
                <Search className="text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search training modules..." 
                    className="flex-1 bg-transparent border-none outline-none text-gray-700"
                />
            </div>

            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300 mt-6">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-bold text-gray-700">Training Modules Coming Soon</h3>
                <p className="text-gray-500 text-sm">The curriculum builder is currently under development.</p>
            </div>
        </div>
    );
};
