import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { MonitorPlay, FileVideo, BookOpen, Youtube, HardDrive } from 'lucide-react';

export const ICTOracleDashboard = () => {
    const { token, user } = useAuth();
    const [youtubeCount, setYoutubeCount] = useState(0);
    const [driveCount, setDriveCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const branchId = user?.branchId || user?.branch?.id;
    const companyId = user?.companyId || user?.company?.id;

    useEffect(() => {
        if (companyId && branchId) fetchAssetMetrics();
    }, [companyId, branchId]);

    const fetchAssetMetrics = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/assets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const assets = res.data;
            let yt = 0;
            let dr = 0;
            assets.forEach((a: any) => {
                if (a.type === 'VIDEO_LINK') {
                    if (a.fileUrl.includes('youtube.com') || a.fileUrl.includes('youtu.be')) yt++;
                    if (a.fileUrl.includes('drive.google.com')) dr++;
                }
            });
            setYoutubeCount(yt);
            setDriveCount(dr);
        } catch (error) {
            console.error("Failed to fetch assets", error);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">ICT Oracle Console</h1>
                <p className="text-gray-500 mt-1">Welcome, {user?.fullName}. Direct the branch's digital media and training.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-cyan-100 p-4 rounded-xl text-cyan-600"><MonitorPlay size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Media Hub</p>
                        <h2 className="text-2xl font-bold text-gray-800">Assets</h2>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-rose-100 p-4 rounded-xl text-rose-600"><FileVideo size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Productions</p>
                        <h2 className="text-2xl font-bold text-gray-800">Scripts</h2>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-blue-100 p-4 rounded-xl text-blue-600"><BookOpen size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Staff</p>
                        <h2 className="text-2xl font-bold text-gray-800">Training</h2>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-red-100 p-4 rounded-xl text-red-600"><Youtube size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">YouTube Videos</p>
                        <h2 className="text-2xl font-bold text-gray-800">{loading ? '...' : youtubeCount}</h2>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600"><HardDrive size={28} /></div>
                    <div>
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Drive Uploads</p>
                        <h2 className="text-2xl font-bold text-gray-800">{loading ? '...' : driveCount}</h2>
                    </div>
                </div>
            </div>
            
            <div className="bg-cyan-50 p-6 rounded-2xl border border-cyan-100">
                <h3 className="text-cyan-800 font-bold mb-2">Cloudflare Storage Protocol Active</h3>
                <p className="text-cyan-700 text-sm">To prevent exorbitant bandwidth costs, please remember that only graphics (images/flyers) should be uploaded directly. Large videos MUST be hosted on external platforms (YouTube/Google Drive), and only their URL links pasted here.</p>
            </div>
        </div>
    );
};
