import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { Save, UserCircle, UploadCloud, AlertTriangle } from 'lucide-react';

export const BiodataTab = ({ leadId, onUpdate }: { leadId: string, onUpdate?: () => void }) => {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        dateOfBirth: '',
        address: '',
        occupation: '',
        nextOfKinName: '',
        nextOfKinPhone: '',
        govtIdType: ''
    });

    const [leadStatus, setLeadStatus] = useState('PROSPECT');
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
    const [govtIdUrl, setGovtIdUrl] = useState<string | null>(null);

    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [govtIdFile, setGovtIdFile] = useState<File | null>(null);

    useEffect(() => {
        fetchLeadData();
    }, [leadId]);

    const fetchLeadData = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/${leadId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const lead = res.data;
            setFormData({
                dateOfBirth: lead.dateOfBirth ? lead.dateOfBirth.split('T')[0] : '',
                address: lead.address || '',
                occupation: lead.occupation || '',
                nextOfKinName: lead.nextOfKinName || '',
                nextOfKinPhone: lead.nextOfKinPhone || '',
                govtIdType: lead.govtIdType || ''
            });
            setLeadStatus(lead.status);
            setProfilePictureUrl(lead.profilePictureUrl || null);
            setGovtIdUrl(lead.govtIdUrl || null);
        } catch (error) {
            console.error("Failed to load bio data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation check for empty entry
        const hasData = Object.values(formData).some(value => value.trim() !== '') || profilePictureFile || govtIdFile;
        if (!hasData) {
            addToast("Please enter at least one piece of biodata before saving.", "warning");
            return;
        }

        setIsSaving(true);
        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value) data.append(key, value);
            });
            if (profilePictureFile) data.append('profilePicture', profilePictureFile);
            if (govtIdFile) data.append('govtId', govtIdFile);

            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/${leadId}`, data, {
                headers: { 
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            addToast("Biodata saved successfully", "success");
            fetchLeadData(); // Refresh UI with new urls
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
                {profilePictureUrl ? (
                    <img src={profilePictureUrl.startsWith('http') ? profilePictureUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${profilePictureUrl}`} alt="Client KYC Profile" className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-blue-100" />
                ) : (
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full shadow-sm ring-1 ring-blue-100/50">
                        <UserCircle size={24} strokeWidth={1.5} />
                    </div>
                )}
                <div>
                    <h3 className="font-bold text-gray-800 tracking-tight">Client KYC & Biodata</h3>
                    <p className="text-[11px] text-gray-500 font-medium">Verify documents & identity.</p>
                </div>
            </div>

            {leadStatus === 'CLIENT' && (!profilePictureUrl || !govtIdUrl) && (
                <div className="bg-yellow-50 p-3 rounded-lg flex items-start border border-yellow-200 shadow-sm">
                    <AlertTriangle size={16} className="text-yellow-600 mr-2 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800 leading-relaxed font-medium">
                        This client has finalized a purchase, but their KYC profile is incomplete. Please request their Passport Photograph and Government-approved ID.
                    </p>
                </div>
            )}

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
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        Identity Verification (KYC)
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Profile Picture (Passport)</label>
                            <label className="flex items-center justify-center w-full min-h-[50px] border border-dashed border-gray-300 rounded-lg px-3 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors relative">
                                <span className="text-xs text-blue-600 font-medium flex items-center">
                                    <UploadCloud size={14} className="mr-1.5" /> 
                                    {profilePictureFile ? profilePictureFile.name : profilePictureUrl ? 'Change Uploaded Profile Pic' : 'Upload Passport Photo'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => { if(e.target.files) setProfilePictureFile(e.target.files[0]) }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Government Approved ID</label>
                                <select
                                    value={formData.govtIdType}
                                    onChange={(e) => setFormData({ ...formData, govtIdType: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
                                >
                                    <option value="">-- Select ID Type --</option>
                                    <option value="NATIONAL_ID">National ID (NIN)</option>
                                    <option value="VOTERS_CARD">Voters Card (PVC)</option>
                                    <option value="DRIVERS_LICENSE">Driver's License</option>
                                    <option value="INTL_PASSPORT">International Passport</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Scan / Document Upload</label>
                                <label className="flex items-center justify-center w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 cursor-pointer transition-colors relative shadow-sm">
                                    <span className="text-xs text-gray-600 flex items-center">
                                        <UploadCloud size={14} className="mr-1.5 text-gray-400" />
                                        {govtIdFile ? govtIdFile.name : govtIdUrl ? 'Replace Uploaded ID Document' : 'Upload ID Scan (PDF/Image)'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => { if (e.target.files) setGovtIdFile(e.target.files[0]) }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
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
