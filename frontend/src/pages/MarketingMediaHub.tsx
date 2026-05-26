import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, Link as LinkIcon, Image as ImageIcon, Video, Trash2, ExternalLink } from 'lucide-react';

export const MarketingMediaHub = () => {
    const { token, user } = useAuth();
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', type: 'IMAGE', fileUrl: '' });
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    const branchId = user?.branchId || user?.branch?.id;
    const companyId = user?.companyId || user?.company?.id;

    useEffect(() => {
        if (companyId && branchId) fetchAssets();
    }, [companyId, branchId]);

    const fetchAssets = async () => {
        try {
            // Placeholder: Will need actual backend endpoint /api/companies/:companyId/branches/:branchId/assets
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/assets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssets(res.data);
        } catch (error) {
            console.error("Failed to fetch assets", error);
            setAssets([]); // fallback
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('type', formData.type);
            
            if (formData.type === 'VIDEO_LINK') {
                data.append('fileUrl', formData.fileUrl); // user pasted url
            } else if (fileToUpload) {
                data.append('file', fileToUpload);
            } else {
                alert('Please provide a file or URL');
                return;
            }

            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/assets`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsUploadModalOpen(false);
            setFormData({ title: '', description: '', type: 'IMAGE', fileUrl: '' });
            setFileToUpload(null);
            fetchAssets();
        } catch (error) {
            console.error("Failed to upload asset", error);
        }
    };

    const handleDeleteAsset = async (assetId: string) => {
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/assets/${assetId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAssets();
        } catch (error) {
            console.error("Failed to delete asset", error);
        }
    };

    if (loading) return <div className="p-10">Loading media library...</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Marketing Media Hub</h1>
                    <p className="text-gray-500 mt-1">Manage graphics and video assets for the branch.</p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center space-x-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition font-bold"
                >
                    <UploadCloud size={20} />
                    <span>Upload Asset</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {assets.map(asset => (
                    <div key={asset.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group">
                        <div className="h-48 bg-gray-100 relative flex items-center justify-center">
                            {asset.type === 'IMAGE' || asset.type === 'FLYER' ? (
                                <img src={asset.fileUrl.startsWith('http') ? asset.fileUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.fileUrl}`} alt={asset.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <Video size={48} />
                                    <span className="mt-2 font-medium">Video Link</span>
                                </div>
                            )}
                            <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="bg-white p-2 rounded-lg shadow-sm text-gray-600 hover:text-blue-600">
                                    <ExternalLink size={16} />
                                </a>
                                <button onClick={() => handleDeleteAsset(asset.id)} className="bg-white p-2 rounded-lg shadow-sm text-red-500 hover:text-red-700">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex items-center space-x-2 mb-1">
                                {asset.type === 'IMAGE' || asset.type === 'FLYER' ? <ImageIcon size={14} className="text-gray-400" /> : <LinkIcon size={14} className="text-gray-400" />}
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{asset.type}</span>
                            </div>
                            <h3 className="font-bold text-gray-800 line-clamp-1">{asset.title}</h3>
                            {asset.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{asset.description}</p>}
                        </div>
                    </div>
                ))}
                {assets.length === 0 && (
                    <div className="col-span-3 text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <UploadCloud size={48} className="mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-bold text-gray-700">No assets found</h3>
                        <p className="text-gray-500 text-sm">Upload graphics or link videos to build your media library.</p>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Add New Media Asset</h2>
                        <form onSubmit={handleCreateAsset} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Asset Type</label>
                                <select 
                                    className="w-full border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                                    value={formData.type} 
                                    onChange={e => setFormData({...formData, type: e.target.value, fileUrl: ''})}
                                >
                                    <option value="IMAGE">Image / Graphic</option>
                                    <option value="FLYER">Marketing Flyer</option>
                                    <option value="VIDEO_LINK">External Video Link</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                                <input required type="text" className="w-full border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
                                <textarea className="w-full border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                            </div>

                            {formData.type === 'VIDEO_LINK' ? (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Video URL (YouTube/Drive)</label>
                                    <input required type="url" placeholder="https://youtube.com/..." className="w-full border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} />
                                    <p className="text-xs text-red-500 mt-1 font-medium">To save bandwidth costs, videos cannot be directly uploaded. Paste an external link.</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Upload File (.jpg, .png)</label>
                                    <input required type="file" accept="image/*" className="w-full border-gray-300 rounded-lg" onChange={e => setFileToUpload(e.target.files ? e.target.files[0] : null)} />
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium flex items-center">
                                    <UploadCloud size={18} className="mr-2" /> Upload
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
