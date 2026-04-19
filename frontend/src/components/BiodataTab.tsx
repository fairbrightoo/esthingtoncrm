import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { Save, UserCircle } from 'lucide-react';

export const BiodataTab = ({ leadId, onUpdate }: { leadId: string, onUpdate?: () => void }) => {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        dateOfBirth: '',
        address: '',
        occupation: '',
        nextOfKinName: '',
        nextOfKinPhone: ''
    });

    useEffect(() => {
        fetchLeadData();
    }, [leadId]);

    const fetchLeadData = async () => {
        try {
            const res = await axios.get(`http://localhost:3000/api/leads/${leadId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const lead = res.data;
            setFormData({
                dateOfBirth: lead.dateOfBirth ? lead.dateOfBirth.split('T')[0] : '',
                address: lead.address || '',
                occupation: lead.occupation || '',
                nextOfKinName: lead.nextOfKinName || '',
                nextOfKinPhone: lead.nextOfKinPhone || ''
            });
        } catch (error) {
            console.error("Failed to load bio data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation check for empty entry
        const hasData = Object.values(formData).some(value => value.trim() !== '');
        if (!hasData) {
            addToast("Please enter at least one piece of biodata before saving.", "warning");
            return;
        }

        setIsSaving(true);
        try {
            await axios.put(`http://localhost:3000/api/leads/${leadId}`, formData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            addToast("Biodata saved successfully", "success");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to save biodata", error);
            addToast("Failed to save biodata", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-400 animate-pulse">Loading biodata...</div>;
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <UserCircle size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800">Client KYC & Biodata</h3>
                    <p className="text-xs text-gray-500">Collect necessary details for documentation.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Primary Address</label>
                    <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-none h-20"
                        placeholder="Full residential address"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Occupation / Profession</label>
                    <input
                        type="text"
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        placeholder="e.g. Software Engineer"
                    />
                </div>

                <div className="pt-2 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Next of Kin Details</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.nextOfKinName}
                                onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                placeholder="Next of kin's name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.nextOfKinPhone}
                                onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                placeholder="Next of kin's phone"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-70"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Save Biodata</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
