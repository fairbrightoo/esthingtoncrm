import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BarChart3, TrendingUp, Plus, Youtube, Instagram, Facebook, Share2 } from 'lucide-react';

export const SocialMediaAnalytics = () => {
    const { token, user } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ platform: 'YOUTUBE', assetId: '', views: '', likes: '', comments: '', shares: '' });

    const branchId = user?.branchId || user?.branch?.id;
    const companyId = user?.companyId || user?.company?.id;

    useEffect(() => {
        if (companyId && branchId) {
            fetchReports();
            fetchAssets();
        }
    }, [companyId, branchId]);

    const fetchReports = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/social-reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(res.data);
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssets = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/assets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssets(res.data);
        } catch (error) {
            console.error("Failed to fetch assets", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/social-reports`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsModalOpen(false);
            setFormData({ platform: 'YOUTUBE', assetId: '', views: '', likes: '', comments: '', shares: '' });
            fetchReports();
        } catch (error) {
            console.error("Failed to submit report", error);
        }
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'YOUTUBE': return <Youtube size={16} className="text-red-500" />;
            case 'INSTAGRAM': return <Instagram size={16} className="text-pink-500" />;
            case 'FACEBOOK': return <Facebook size={16} className="text-blue-600" />;
            case 'TIKTOK': return <TrendingUp size={16} className="text-black" />;
            default: return <Share2 size={16} className="text-gray-500" />;
        }
    };

    if (loading) return <div className="p-10">Loading analytics...</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Social Media Analytics</h1>
                    <p className="text-gray-500 mt-1">Track post performance to replicate successful campaigns.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-bold"
                >
                    <Plus size={20} />
                    <span>Log Performance</span>
                </button>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium text-sm">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Platform</th>
                            <th className="px-6 py-4">Asset / Video Link</th>
                            <th className="px-6 py-4">Views</th>
                            <th className="px-6 py-4">Engagement (L/C/S)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {reports.map(report => (
                            <tr key={report.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                    {new Date(report.reportDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 flex items-center space-x-2">
                                    {getPlatformIcon(report.platform)}
                                    <span className="font-bold text-gray-800">{report.platform}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {report.asset ? (
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-800 line-clamp-1">{report.asset.title}</span>
                                            {report.asset.type === 'VIDEO_LINK' && (
                                                <a href={report.asset.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">View Video</a>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">General Account Update</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-800">
                                    {report.views.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <span className="text-pink-600 font-medium">{report.likes}</span> / <span className="text-blue-600 font-medium">{report.comments}</span> / <span className="text-emerald-600 font-medium">{report.shares}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {reports.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <BarChart3 size={48} className="mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-bold text-gray-700">No performance data</h3>
                        <p className="text-sm mt-1">Log your first engagement report to start tracking metrics.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Log Engagement Data</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Platform</label>
                                <select 
                                    className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.platform} 
                                    onChange={e => setFormData({...formData, platform: e.target.value})}
                                >
                                    <option value="YOUTUBE">YouTube</option>
                                    <option value="INSTAGRAM">Instagram</option>
                                    <option value="FACEBOOK">Facebook</option>
                                    <option value="TIKTOK">TikTok</option>
                                    <option value="TWITTER">Twitter/X</option>
                                    <option value="LINKEDIN">LinkedIn</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Specific Asset / Video (Optional)</label>
                                <select 
                                    className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.assetId} 
                                    onChange={e => setFormData({...formData, assetId: e.target.value})}
                                >
                                    <option value="">General Account / Non-tracked asset</option>
                                    {assets.map(a => (
                                        <option key={a.id} value={a.id}>{a.title} ({a.type})</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Tie these metrics to a specific video link or flyer in the hub to track individual asset performance.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Total Views</label>
                                    <input type="number" min="0" required className="w-full border-gray-300 rounded-lg" value={formData.views} onChange={e => setFormData({...formData, views: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Total Likes</label>
                                    <input type="number" min="0" required className="w-full border-gray-300 rounded-lg" value={formData.likes} onChange={e => setFormData({...formData, likes: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Comments</label>
                                    <input type="number" min="0" className="w-full border-gray-300 rounded-lg" value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Shares/Forwards</label>
                                    <input type="number" min="0" className="w-full border-gray-300 rounded-lg" value={formData.shares} onChange={e => setFormData({...formData, shares: e.target.value})} />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center">
                                    Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
