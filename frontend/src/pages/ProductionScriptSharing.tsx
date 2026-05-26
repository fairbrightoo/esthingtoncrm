import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, User, Calendar, Trash2 } from 'lucide-react';

export const ProductionScriptSharing = () => {
    const { token, user } = useAuth();
    const [scripts, setScripts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const branchId = user?.branchId || user?.branch?.id;
    const companyId = user?.companyId || user?.company?.id;

    useEffect(() => {
        if (companyId && branchId) fetchScripts();
    }, [companyId, branchId]);

    const fetchScripts = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/scripts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setScripts(res.data);
        } catch (error) {
            console.error("Failed to fetch scripts", error);
            setScripts([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10">Loading scripts...</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Production Scripts</h1>
                    <p className="text-gray-500 mt-1">Author and assign drama/video scripts to staff actors.</p>
                </div>
                <button
                    className="flex items-center space-x-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition font-bold"
                >
                    <Plus size={20} />
                    <span>New Script</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scripts.map(script => (
                    <div key={script.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-xl text-gray-800">{script.title}</h3>
                            <button className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                        </div>
                        <div className="text-sm text-gray-600 mb-6 flex-1 line-clamp-4">
                            {script.content}
                        </div>
                        <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="flex items-center text-xs text-gray-500 font-medium">
                                <User size={14} className="mr-1" />
                                {script.assignedCast?.length || 0} Actors Assigned
                            </div>
                            <div className="flex items-center text-xs text-gray-500 font-medium">
                                <Calendar size={14} className="mr-1" />
                                {new Date(script.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
                {scripts.length === 0 && (
                    <div className="col-span-2 text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-bold text-gray-700">No scripts found</h3>
                        <p className="text-gray-500 text-sm">Create your first production script and assign cast members.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
