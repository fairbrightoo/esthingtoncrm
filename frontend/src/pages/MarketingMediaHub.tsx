import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    UploadCloud,
    Image as ImageIcon,
    Video,
    Film,
    Play,
    Download,
    Copy,
    Check,
    Share2,
    Trash2,
    Edit3,
    Eye,
    Search,
    Filter,
    Sparkles,
    Smartphone,
    Monitor,
    Square,
    ExternalLink,
    X,
    Plus,
    Hash,
    Layers,
    FileText,
    CheckCircle2,
    AlertCircle,
    ArrowDownToLine,
    TrendingUp,
    Building2,
    MessageCircle,
    Globe,
    PartyPopper,
    Smile,
    GraduationCap
} from 'lucide-react';

interface CompanyOption {
    id: string;
    name: string;
    logoUrl?: string;
    themeColor?: string;
}

interface EstateOption {
    id: string;
    name: string;
    location?: string;
    companyId?: string;
}

interface MediaAsset {
    id: string;
    title: string;
    description?: string | null;
    type: string; // FLYER, STORY_REEL, PROMO_VIDEO, PRICELIST, BRANDING, MEETING_EVENT, ENTERTAINMENT, TRAINING, IMAGE, VIDEO_LINK
    aspectRatio: string; // 1:1, 9:16, 16:9
    fileUrl: string;
    thumbnailUrl?: string | null;
    storageProvider: string; // R2, YOUTUBE, GOOGLE_DRIVE, VIMEO, EXTERNAL_URL
    fileSizeMB?: number | null;
    marketingCaption?: string | null;
    downloadCount: number;
    estateId?: string | null;
    estate?: { id: string; name: string; location?: string } | null;
    companyId: string;
    company?: { id: string; name: string; logoUrl?: string } | null;
    branchId?: string | null;
    branch?: { id: string; name: string } | null;
    uploadedByOracleId: string;
    uploadedByOracle?: { id: string; fullName: string; role?: string } | null;
    createdAt: string;
    updatedAt: string;
}

export const MarketingMediaHub: React.FC = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();

    // Data State
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [estates, setEstates] = useState<EstateOption[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<string>('ALL'); // 'ALL' = Group-wide across all sister companies
    const [selectedEstate, setSelectedEstate] = useState<string>('ALL'); // 'ALL', 'NON_ESTATE', or estate UUID
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('ALL');

    // Modals
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
    const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

    // Upload Form State
    const [uploadForm, setUploadForm] = useState({
        title: '',
        description: '',
        type: 'FLYER',
        aspectRatio: '1:1',
        estateId: 'ALL', // 'ALL' or 'NON_ESTATE' or estate UUID
        companyId: user?.companyId || 'ALL',
        marketingCaption: '',
        storageMethod: 'FILE', // 'FILE' (R2) or 'LINK' (YouTube/Drive/Vimeo)
        fileUrl: ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);

    // Permission Check: ICT Oracles and Admins can publish & edit
    const canManage = useMemo(() => {
        if (!user) return false;
        const privilegedRoles = [
            'SUPER_ADMIN',
            'GLOBAL_CHAIRMAN',
            'GROUP_MANAGING_DIRECTOR',
            'MANAGING_DIRECTOR',
            'GENERAL_MANAGER',
            'BRANCH_ADMIN',
            'ICT_ORACLE'
        ];
        return privilegedRoles.includes(user.role);
    }, [user]);

    // Load Data on Filter Changes
    useEffect(() => {
        fetchCompanies();
        fetchEstates();
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [selectedCompany, selectedEstate, selectedType, selectedAspectRatio]);

    const fetchCompanies = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setCompanies(res.data || []);
        } catch (error) {
            console.error('Failed to load companies', error);
        }
    };

    const fetchEstates = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setEstates(res.data || []);
        } catch (error) {
            console.error('Failed to load estates', error);
        }
    };

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (selectedCompany !== 'ALL') params.companyId = selectedCompany;
            if (selectedEstate !== 'ALL') params.estateId = selectedEstate;
            if (selectedType !== 'ALL') params.type = selectedType;
            if (selectedAspectRatio !== 'ALL') params.aspectRatio = selectedAspectRatio;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/media-assets`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params
                }
            );
            setAssets(res.data || []);
        } catch (error) {
            console.error('Failed to fetch media assets', error);
            addToast('Failed to load media assets', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filtered Assets (Search Query)
    const filteredAssets = useMemo(() => {
        if (!searchQuery.trim()) return assets;
        const q = searchQuery.toLowerCase();
        return assets.filter(
            (a) =>
                a.title.toLowerCase().includes(q) ||
                (a.description && a.description.toLowerCase().includes(q)) ||
                (a.marketingCaption && a.marketingCaption.toLowerCase().includes(q)) ||
                (a.estate && a.estate.name.toLowerCase().includes(q)) ||
                (a.company && a.company.name.toLowerCase().includes(q)) ||
                (a.branch && a.branch.name.toLowerCase().includes(q))
        );
    }, [assets, searchQuery]);

    // Dynamically Filter Estates by Selected Sister Company
    const displayedEstates = useMemo(() => {
        if (selectedCompany === 'ALL') return estates;
        return estates.filter((est) => est.companyId === selectedCompany);
    }, [estates, selectedCompany]);

    const uploadModalEstates = useMemo(() => {
        if (uploadForm.companyId === 'ALL') return estates;
        return estates.filter((est) => est.companyId === uploadForm.companyId);
    }, [estates, uploadForm.companyId]);

    // Metrics Counters
    const metrics = useMemo(() => {
        const total = assets.length;
        const flyers = assets.filter((a) => a.type === 'FLYER' || a.type === 'IMAGE').length;
        const estateVideos = assets.filter(
            (a) => a.type === 'STORY_REEL' || a.type === 'PROMO_VIDEO' || a.type === 'VIDEO_LINK'
        ).length;
        const cultureVideos = assets.filter(
            (a) => a.type === 'MEETING_EVENT' || a.type === 'ENTERTAINMENT' || a.type === 'TRAINING'
        ).length;
        const totalDownloads = assets.reduce((sum, a) => sum + (a.downloadCount || 0), 0);
        return { total, flyers, estateVideos, cultureVideos, totalDownloads };
    }, [assets]);

    // Handle File Selection with preview
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFilePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('video/')) {
                setFilePreview(URL.createObjectURL(file));
            } else {
                setFilePreview(null);
            }
        }
    };

    // Create Asset
    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('title', uploadForm.title);
            formData.append('description', uploadForm.description);
            formData.append('type', uploadForm.type);
            formData.append('aspectRatio', uploadForm.aspectRatio);
            formData.append('marketingCaption', uploadForm.marketingCaption);

            if (uploadForm.companyId && uploadForm.companyId !== 'ALL') {
                formData.append('companyId', uploadForm.companyId);
            }

            if (uploadForm.estateId && uploadForm.estateId !== 'ALL' && uploadForm.estateId !== 'NON_ESTATE') {
                formData.append('estateId', uploadForm.estateId);
            }

            if (uploadForm.storageMethod === 'LINK') {
                if (!uploadForm.fileUrl.trim()) {
                    addToast('Please enter a valid video link', 'error');
                    setIsUploading(false);
                    return;
                }
                formData.append('fileUrl', uploadForm.fileUrl.trim());
            } else {
                if (!selectedFile) {
                    addToast('Please select a creative file to upload', 'error');
                    setIsUploading(false);
                    return;
                }
                formData.append('file', selectedFile);
            }

            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/media-assets`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            addToast('Creative asset published group-wide across Esthington Group!', 'success');
            setIsUploadModalOpen(false);
            setUploadForm({
                title: '',
                description: '',
                type: 'FLYER',
                aspectRatio: '1:1',
                estateId: 'ALL',
                companyId: user?.companyId || 'ALL',
                marketingCaption: '',
                storageMethod: 'FILE',
                fileUrl: ''
            });
            setSelectedFile(null);
            setFilePreview(null);
            fetchAssets();
        } catch (error: any) {
            console.error('Failed to upload asset', error);
            addToast(error.response?.data?.error || 'Failed to upload creative asset', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    // Update Asset
    const handleUpdateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAsset) return;

        try {
            await axios.put(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/media-assets/${editingAsset.id}`,
                {
                    title: editingAsset.title,
                    description: editingAsset.description,
                    type: editingAsset.type,
                    aspectRatio: editingAsset.aspectRatio,
                    estateId:
                        editingAsset.estateId === 'ALL' || editingAsset.estateId === 'NON_ESTATE'
                            ? null
                            : editingAsset.estateId,
                    marketingCaption: editingAsset.marketingCaption
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            addToast('Asset details updated successfully', 'success');
            setIsEditModalOpen(false);
            setEditingAsset(null);
            fetchAssets();
        } catch (error) {
            console.error('Failed to update asset', error);
            addToast('Failed to update asset', 'error');
        }
    };

    // Delete Asset
    const handleDeleteAsset = async (assetId: string) => {
        if (!window.confirm('Are you sure you want to delete this creative asset?')) return;
        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/media-assets/${assetId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            addToast('Creative asset deleted', 'success');
            if (previewAsset?.id === assetId) setPreviewAsset(null);
            fetchAssets();
        } catch (error) {
            console.error('Failed to delete asset', error);
            addToast('Failed to delete asset', 'error');
        }
    };

    // Copy Caption & Hashtags
    const handleCopyCaption = (asset: MediaAsset) => {
        const textToCopy =
            asset.marketingCaption ||
            `${asset.title}\n\nFor inquiries, site inspection bookings or more information, reach out to us today!`;
        navigator.clipboard.writeText(textToCopy);
        setCopiedAssetId(asset.id);
        addToast('Caption & hashtags copied to clipboard!', 'success');
        setTimeout(() => setCopiedAssetId(null), 3000);
    };

    // Download Asset
    const handleDownloadAsset = async (asset: MediaAsset) => {
        try {
            axios
                .post(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/media-assets/${asset.id}/download`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                .catch(() => {});

            setAssets((prev) =>
                prev.map((a) => (a.id === asset.id ? { ...a, downloadCount: (a.downloadCount || 0) + 1 } : a))
            );

            const fileUrl = asset.fileUrl.startsWith('http')
                ? asset.fileUrl
                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.fileUrl}`;

            if (asset.storageProvider === 'YOUTUBE' || asset.storageProvider === 'VIMEO') {
                window.open(fileUrl, '_blank');
                addToast('Opening video in new tab', 'info');
                return;
            }

            addToast('Downloading creative file...', 'info');
            const res = await fetch(fileUrl);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const ext =
                asset.fileUrl.split('.').pop()?.split('?')[0] || (isVideoType(asset.type) ? 'mp4' : 'png');
            a.download = `${asset.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${ext}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            addToast('Download complete!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            window.open(asset.fileUrl, '_blank');
        }
    };

    // Share to WhatsApp
    const handleShareWhatsApp = (asset: MediaAsset) => {
        const fileUrl = asset.fileUrl.startsWith('http')
            ? asset.fileUrl
            : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${asset.fileUrl}`;

        const caption = asset.marketingCaption
            ? `${asset.marketingCaption}\n\nMedia Link: ${fileUrl}`
            : `*${asset.title}*\n\nCheck out this official update from ${asset.company?.name || 'Esthington Group'}!\nMedia Link: ${fileUrl}`;

        const waUrl = `https://wa.me/?text=${encodeURIComponent(caption)}`;
        window.open(waUrl, '_blank');
    };

    // Video Embed Helper
    const getVideoEmbedUrl = (url: string) => {
        if (!url) return null;
        const ytMatch = url.match(
            /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
        );
        if (ytMatch && ytMatch[1]) {
            return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
        }
        const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
        if (vimeoMatch && vimeoMatch[1]) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
        }
        const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) {
            return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }
        return url;
    };

    const isVideoType = (type: string) => {
        return (
            type === 'STORY_REEL' ||
            type === 'PROMO_VIDEO' ||
            type === 'VIDEO_LINK' ||
            type === 'MEETING_EVENT' ||
            type === 'ENTERTAINMENT' ||
            type === 'TRAINING' ||
            type.includes('VIDEO')
        );
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'MEETING_EVENT':
                return <PartyPopper size={12} className="text-amber-400" />;
            case 'ENTERTAINMENT':
                return <Smile size={12} className="text-pink-400" />;
            case 'TRAINING':
                return <GraduationCap size={12} className="text-emerald-400" />;
            case 'STORY_REEL':
                return <Smartphone size={12} className="text-cyan-400" />;
            case 'PROMO_VIDEO':
                return <Film size={12} className="text-purple-400" />;
            case 'PRICELIST':
                return <FileText size={12} className="text-blue-400" />;
            case 'BRANDING':
                return <Sparkles size={12} className="text-yellow-400" />;
            default:
                return <ImageIcon size={12} className="text-emerald-400" />;
        }
    };

    const getTypeBadgeLabel = (type: string) => {
        switch (type) {
            case 'MEETING_EVENT':
                return 'Monday Meeting & Event';
            case 'ENTERTAINMENT':
                return 'Entertainment & Skit';
            case 'TRAINING':
                return 'Staff Training';
            case 'STORY_REEL':
                return '9:16 Status Reel';
            case 'PROMO_VIDEO':
                return 'Walkthrough Video';
            case 'PRICELIST':
                return 'Price List';
            case 'BRANDING':
                return 'Branding';
            default:
                return 'Flyer';
        }
    };

    // Quick hashtag adder for upload form
    const addHashtag = (tag: string) => {
        setUploadForm((prev) => ({
            ...prev,
            marketingCaption: prev.marketingCaption ? `${prev.marketingCaption} ${tag}` : tag
        }));
    };

    return (
        <div className="space-y-8 pb-16 min-h-screen text-slate-800">
            {/* HERO & GROUP-WIDE BANNER */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 md:p-10 shadow-2xl border border-slate-800">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold tracking-wide uppercase mb-3">
                            <Globe size={14} className="text-cyan-400 animate-pulse" />
                            Esthington Group Creative Hub • Shared Across All Companies & Branches
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                            Marketing Media Hub
                        </h1>
                        <p className="text-slate-300 mt-2 max-w-2xl text-sm md:text-base leading-relaxed">
                            Official marketing flyers, property walkthrough videos, Monday meeting highlights, cultural day celebrations, skits, and 9:16 status reels. All creative assets from every ICT Oracle across the entire Esthington Group are accessible to all staff for instant preview, 1-click download, and caption copying.
                        </p>
                    </div>

                    {canManage && (
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm whitespace-nowrap cursor-pointer"
                        >
                            <UploadCloud size={20} className="stroke-[2.5]" />
                            <span>Upload Creative Asset</span>
                        </button>
                    )}
                </div>

                {/* KPI METRIC TILES */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-8 pt-8 border-t border-slate-800/80">
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <Layers size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.total}</div>
                            <div className="text-[11px] text-slate-400 font-medium">Total Assets</div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <ImageIcon size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.flyers}</div>
                            <div className="text-[11px] text-slate-400 font-medium">Estate Flyers</div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Film size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.estateVideos}</div>
                            <div className="text-[11px] text-slate-400 font-medium">Walkthroughs & Reels</div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <PartyPopper size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.cultureVideos}</div>
                            <div className="text-[11px] text-slate-400 font-medium">Meetings & Culture</div>
                        </div>
                    </div>

                    <div className="col-span-2 lg:col-span-1 bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">{metrics.totalDownloads}</div>
                            <div className="text-[11px] text-slate-400 font-medium">Staff Downloads</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FILTER & DISCOVERY ENGINE */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
                {/* 1. Sister Company Switcher (Group-Wide Scope) */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <Globe size={14} className="text-slate-500" /> Group Scope & Sister Companies
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button
                            onClick={() => setSelectedCompany('ALL')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                selectedCompany === 'ALL'
                                    ? 'bg-indigo-900 text-white shadow-md shadow-indigo-950/20'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <Globe size={14} /> 🌐 All Esthington Group (Cross-Company)
                        </button>
                        {companies.map((comp) => (
                            <button
                                key={comp.id}
                                onClick={() => setSelectedCompany(comp.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    selectedCompany === comp.id
                                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <Building2 size={13} /> {comp.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Estate / Corporate Filter Row */}
                <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <Building2 size={14} className="text-slate-500" /> Estate / Collateral Scope
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button
                            onClick={() => setSelectedEstate('ALL')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                selectedEstate === 'ALL'
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            ✨ All Materials
                        </button>

                        {/* Dedicated Pill for Meetings, Cultural Days & Non-Estate Creatives */}
                        <button
                            onClick={() => setSelectedEstate('NON_ESTATE')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                selectedEstate === 'NON_ESTATE'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                            }`}
                        >
                            <PartyPopper size={13} /> 🏢 Corporate & Culture (Monday Meetings, Events, Skits)
                        </button>

                        {displayedEstates.map((est) => (
                            <button
                                key={est.id}
                                onClick={() => setSelectedEstate(est.id)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    selectedEstate === est.id
                                        ? 'bg-cyan-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {est.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Category Tabs, Aspect Ratio & Live Search */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-3 border-t border-slate-100">
                    {/* Media Category Tabs */}
                    <div className="md:col-span-6 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {[
                            { id: 'ALL', label: 'All Collateral' },
                            { id: 'FLYER', label: '🖼️ Flyers' },
                            { id: 'STORY_REEL', label: '📱 9:16 Reels' },
                            { id: 'PROMO_VIDEO', label: '🎬 Walkthroughs' },
                            { id: 'MEETING_EVENT', label: '🎪 Monday Meetings & Events' },
                            { id: 'ENTERTAINMENT', label: '🍿 Skits & Lifestyle' },
                            { id: 'TRAINING', label: '🎓 Training' },
                            { id: 'PRICELIST', label: '📄 Price Lists' },
                            { id: 'BRANDING', label: '🏷️ Branding' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedType(t.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                                    selectedType === t.id
                                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Format / Aspect Ratio */}
                    <div className="md:col-span-3 flex items-center gap-1.5 justify-start md:justify-center">
                        <span className="text-xs font-bold text-slate-400 mr-1 hidden lg:inline">Format:</span>
                        {[
                            { id: 'ALL', label: 'All' },
                            { id: '9:16', label: '9:16' },
                            { id: '1:1', label: '1:1' },
                            { id: '16:9', label: '16:9' }
                        ].map((fmt) => (
                            <button
                                key={fmt.id}
                                onClick={() => setSelectedAspectRatio(fmt.id)}
                                className={`px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                                    selectedAspectRatio === fmt.id
                                        ? 'bg-slate-800 text-white font-bold'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {fmt.label}
                            </button>
                        ))}
                    </div>

                    {/* Live Search */}
                    <div className="md:col-span-3 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search creatives, captions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* CREATIVE GRID */}
            {loading ? (
                <div className="py-20 text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-slate-500">Loading creative library...</p>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 mx-auto mb-4">
                        <UploadCloud size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Creative Materials Found</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                        No materials match your current filter selections. Try clearing filters or publish new flyers, Monday meeting highlights, or cultural videos!
                    </p>
                    {canManage && (
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="mt-5 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer"
                        >
                            <Plus size={16} /> Upload First Creative
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAssets.map((asset) => {
                        const isVideo = isVideoType(asset.type);
                        const displayThumb =
                            asset.thumbnailUrl ||
                            (asset.type.includes('IMAGE') || asset.type === 'FLYER' ? asset.fileUrl : null);

                        return (
                            <div
                                key={asset.id}
                                className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-cyan-300 transition-all duration-300 overflow-hidden flex flex-col justify-between"
                            >
                                {/* MEDIA THUMBNAIL AREA */}
                                <div
                                    className={`relative bg-slate-950 overflow-hidden cursor-pointer ${
                                        asset.aspectRatio === '9:16'
                                            ? 'aspect-[4/5]'
                                            : asset.aspectRatio === '16:9'
                                            ? 'aspect-video'
                                            : 'aspect-square'
                                    }`}
                                    onClick={() => setPreviewAsset(asset)}
                                >
                                    {displayThumb ? (
                                        <img
                                            src={
                                                displayThumb.startsWith('http')
                                                    ? displayThumb
                                                    : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${displayThumb}`
                                            }
                                            alt={asset.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-center">
                                            {isVideo ? (
                                                <Film size={40} className="text-cyan-400/60 mb-2" />
                                            ) : (
                                                <ImageIcon size={40} className="text-slate-600 mb-2" />
                                            )}
                                            <span className="text-xs font-semibold text-slate-400 line-clamp-2">
                                                {asset.title}
                                            </span>
                                        </div>
                                    )}

                                    {/* Video Play Overlay */}
                                    {isVideo && (
                                        <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                                            <div className="w-13 h-13 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                                <Play size={24} className="fill-white translate-x-0.5" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Badges (Format + Category) */}
                                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {asset.aspectRatio && (
                                                <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase border border-white/10">
                                                    {asset.aspectRatio === '9:16'
                                                        ? '📱 9:16'
                                                        : asset.aspectRatio === '1:1'
                                                        ? '⏹️ 1:1'
                                                        : '🖥️ 16:9'}
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-cyan-200 text-[10px] font-bold uppercase border border-cyan-500/30 flex items-center gap-1">
                                                {getTypeIcon(asset.type)}
                                                {getTypeBadgeLabel(asset.type)}
                                            </span>
                                        </div>

                                        {asset.fileSizeMB && (
                                            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-slate-300 text-[10px] font-medium border border-white/10">
                                                {asset.fileSizeMB} MB
                                            </span>
                                        )}
                                    </div>

                                    {/* Bottom Badges: Estate OR Corporate Tag + Company Tag */}
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                                        {asset.estate ? (
                                            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/85 backdrop-blur-md text-emerald-300 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                                                <Building2 size={12} className="text-emerald-400" />
                                                {asset.estate.name}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-lg bg-amber-950/85 backdrop-blur-md text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                                                <PartyPopper size={12} className="text-amber-400" />
                                                Corporate & Culture
                                            </span>
                                        )}

                                        {/* Company & Branch Tag */}
                                        {asset.company && (
                                            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-slate-300 text-[10px] font-semibold border border-white/10">
                                                {asset.company.name}
                                                {asset.branch?.name ? ` • ${asset.branch.name}` : ''}
                                            </span>
                                        )}
                                    </div>

                                    {/* Hover Preview Overlay */}
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                        <span className="px-3.5 py-1.5 rounded-xl bg-white/95 text-slate-900 text-xs font-bold shadow-xl flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                            <Eye size={14} /> Full Preview
                                        </span>
                                    </div>
                                </div>

                                {/* CARD CONTENT */}
                                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <h3
                                                className="font-bold text-slate-900 text-sm leading-snug line-clamp-1 hover:text-cyan-600 transition"
                                                title={asset.title}
                                            >
                                                {asset.title}
                                            </h3>

                                            {/* Admin Actions */}
                                            {canManage && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            setEditingAsset(asset);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                                        title="Edit Details"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAsset(asset.id)}
                                                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                                        title="Delete Asset"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Description / Caption Snippet */}
                                        {asset.marketingCaption ? (
                                            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 line-clamp-2 italic leading-relaxed">
                                                "{asset.marketingCaption}"
                                            </div>
                                        ) : asset.description ? (
                                            <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                {asset.description}
                                            </p>
                                        ) : null}
                                    </div>

                                    {/* FOOTER ACTION BAR */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                            <span>
                                                {asset.uploadedByOracle
                                                    ? `Oracle: ${asset.uploadedByOracle.fullName}`
                                                    : 'ICT Oracle'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ArrowDownToLine size={12} className="text-slate-400" />
                                                {asset.downloadCount || 0} downloads
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                                            {/* Copy Caption */}
                                            <button
                                                onClick={() => handleCopyCaption(asset)}
                                                className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                                                    copiedAssetId === asset.id
                                                        ? 'bg-emerald-500 text-white shadow-sm'
                                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                }`}
                                                title="Copy Ready-to-Post Caption & Hashtags"
                                            >
                                                {copiedAssetId === asset.id ? (
                                                    <>
                                                        <Check size={12} className="stroke-[3]" /> Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={12} /> Caption
                                                    </>
                                                )}
                                            </button>

                                            {/* WhatsApp Share */}
                                            <button
                                                onClick={() => handleShareWhatsApp(asset)}
                                                className="py-2 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                                                title="Share Directly to WhatsApp"
                                            >
                                                <MessageCircle size={12} className="stroke-[2.5]" /> WhatsApp
                                            </button>

                                            {/* Download Button */}
                                            <button
                                                onClick={() => handleDownloadAsset(asset)}
                                                className="py-2 px-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition cursor-pointer"
                                                title="Download High-Res Creative File"
                                            >
                                                <Download size={12} className="stroke-[2.5]" /> Get File
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* LIGHTBOX / FULL-SCREEN MEDIA PLAYER MODAL */}
            {previewAsset && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-8 animate-fadeIn">
                    <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[90vh]">
                        {/* Close Button */}
                        <button
                            onClick={() => setPreviewAsset(null)}
                            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center transition cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        {/* Media Stage */}
                        <div className="lg:w-7/12 bg-black flex items-center justify-center relative min-h-[300px] lg:min-h-[500px] overflow-hidden">
                            {isVideoType(previewAsset.type) ? (
                                previewAsset.storageProvider === 'R2' || previewAsset.fileUrl.endsWith('.mp4') ? (
                                    <video
                                        controls
                                        autoPlay
                                        className="w-full max-h-[75vh] object-contain rounded-xl"
                                        src={
                                            previewAsset.fileUrl.startsWith('http')
                                                ? previewAsset.fileUrl
                                                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${previewAsset.fileUrl}`
                                        }
                                    />
                                ) : (
                                    <iframe
                                        className="w-full h-full min-h-[360px] lg:min-h-[500px]"
                                        src={getVideoEmbedUrl(previewAsset.fileUrl) || previewAsset.fileUrl}
                                        title={previewAsset.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                )
                            ) : (
                                <img
                                    src={
                                        previewAsset.fileUrl.startsWith('http')
                                            ? previewAsset.fileUrl
                                            : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${previewAsset.fileUrl}`
                                    }
                                    alt={previewAsset.title}
                                    className="w-full max-h-[75vh] object-contain"
                                />
                            )}
                        </div>

                        {/* Right Details Drawer */}
                        <div className="lg:w-5/12 p-6 md:p-8 flex flex-col justify-between overflow-y-auto space-y-6 bg-slate-900 text-white">
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-xs font-bold tracking-wide uppercase border border-cyan-500/30 flex items-center gap-1">
                                            {getTypeIcon(previewAsset.type)}
                                            {getTypeBadgeLabel(previewAsset.type)}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold">
                                            {previewAsset.aspectRatio} format
                                        </span>
                                        {previewAsset.company && (
                                            <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                                                {previewAsset.company.name}
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                                        {previewAsset.title}
                                    </h2>

                                    {previewAsset.estate ? (
                                        <p className="text-sm text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
                                            <Building2 size={14} />
                                            {previewAsset.estate.name}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-amber-400 font-semibold mt-1 flex items-center gap-1.5">
                                            <PartyPopper size={14} />
                                            Corporate & Culture Highlight
                                        </p>
                                    )}
                                </div>

                                {/* Marketing Caption Box */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                            <Sparkles size={12} className="text-amber-400" /> Promotional Caption & Hashtags
                                        </label>
                                        <button
                                            onClick={() => handleCopyCaption(previewAsset)}
                                            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                                        >
                                            <Copy size={12} /> Copy
                                        </button>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                        {previewAsset.marketingCaption ||
                                            'No custom promotional caption provided for this asset.'}
                                    </div>
                                </div>

                                {/* Metadata Pill Grid */}
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                                        <span className="block text-[10px] text-slate-500 uppercase">Provider</span>
                                        <span className="font-semibold text-slate-200">{previewAsset.storageProvider}</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                                        <span className="block text-[10px] text-slate-500 uppercase">Downloads</span>
                                        <span className="font-semibold text-slate-200">{previewAsset.downloadCount || 0} times</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2.5 pt-4 border-t border-slate-800">
                                <button
                                    onClick={() => handleDownloadAsset(previewAsset)}
                                    className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition cursor-pointer"
                                >
                                    <Download size={18} /> Download High-Resolution Asset
                                </button>
                                <button
                                    onClick={() => handleShareWhatsApp(previewAsset)}
                                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                                >
                                    <MessageCircle size={18} /> Share Directly to WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOAD CREATIVE STUDIO MODAL */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn">
                    <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8 my-8">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                    <UploadCloud size={22} className="text-cyan-600" /> Publish Creative Asset
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Upload marketing flyers, Monday meeting highlights, cultural videos, or skits for all staff across Esthington Group.
                                </p>
                            </div>
                            <button
                                onClick={() => !isUploading && setIsUploadModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAsset} className="space-y-5 mt-5">
                            {/* Title & Company */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Creative Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Monday Assembly Highlights / Cultural Day Reel"
                                        value={uploadForm.title}
                                        onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Publishing Company
                                    </label>
                                    <select
                                        value={uploadForm.companyId}
                                        onChange={(e) => setUploadForm({ ...uploadForm, companyId: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none"
                                    >
                                        <option value="ALL">🌐 Esthington Group (All Sister Companies)</option>
                                        {companies.map((comp) => (
                                            <option key={comp.id} value={comp.id}>
                                                {comp.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Category & Format */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Creative Category
                                    </label>
                                    <select
                                        value={uploadForm.type}
                                        onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none"
                                    >
                                        <option value="FLYER">🖼️ Marketing Flyer / Graphic</option>
                                        <option value="STORY_REEL">📱 9:16 Reel / WhatsApp Status</option>
                                        <option value="PROMO_VIDEO">🎬 Estate Walkthrough / Drone Reel</option>
                                        <option value="MEETING_EVENT">🎪 Monday Meeting / Cultural Day / Event</option>
                                        <option value="ENTERTAINMENT">🍿 Office Entertainment, Skit & Fun</option>
                                        <option value="TRAINING">🎓 Staff Training & Masterclass</option>
                                        <option value="PRICELIST">📄 Price List / Layout Sheet</option>
                                        <option value="BRANDING">🏷️ Logo / Brand Kit</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Aspect Ratio (Format)
                                    </label>
                                    <select
                                        value={uploadForm.aspectRatio}
                                        onChange={(e) => setUploadForm({ ...uploadForm, aspectRatio: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none"
                                    >
                                        <option value="1:1">⏹️ 1:1 Square (Feed Post)</option>
                                        <option value="9:16">📱 9:16 Vertical (Stories, Reels, WhatsApp Status)</option>
                                        <option value="16:9">🖥️ 16:9 Widescreen (YouTube, Ads, TV)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Estate or Corporate Attachment */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Estate Attachment
                                </label>
                                <select
                                    value={uploadForm.estateId}
                                    onChange={(e) => setUploadForm({ ...uploadForm, estateId: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none"
                                >
                                    <option value="NON_ESTATE">
                                        🏢 Corporate / Culture (Monday Meeting, Cultural Day, Skit, No Estate)
                                    </option>
                                    <option value="ALL">🌟 General / Multi-Estate Promotion</option>
                                    {uploadModalEstates.map((est) => (
                                        <option key={est.id} value={est.id}>
                                            📍 {est.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Storage Method Toggle */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Asset Source
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setUploadForm({ ...uploadForm, storageMethod: 'FILE' })}
                                        className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                                            uploadForm.storageMethod === 'FILE'
                                                ? 'bg-cyan-50 border-cyan-500 text-cyan-800 shadow-sm'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <UploadCloud size={16} /> Direct File Upload (Cloudflare R2)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setUploadForm({ ...uploadForm, storageMethod: 'LINK' })}
                                        className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                                            uploadForm.storageMethod === 'LINK'
                                                ? 'bg-cyan-50 border-cyan-500 text-cyan-800 shadow-sm'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Video size={16} /> Video Link (YouTube / Drive / Vimeo)
                                    </button>
                                </div>
                            </div>

                            {/* File Upload Zone OR Link Input */}
                            {uploadForm.storageMethod === 'FILE' ? (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Select Creative File (PNG, JPG, MP4, WebM)
                                    </label>
                                    <div className="border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-cyan-50/20 transition cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        {selectedFile ? (
                                            <div className="space-y-2">
                                                <div className="text-cyan-600 font-bold text-sm flex items-center justify-center gap-2">
                                                    <CheckCircle2 size={18} /> {selectedFile.name}
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload to Cloudflare R2
                                                </p>
                                                {filePreview && (
                                                    <div className="mt-3 max-h-36 max-w-xs mx-auto rounded-lg overflow-hidden border border-slate-200">
                                                        {selectedFile.type.startsWith('video') ? (
                                                            <video src={filePreview} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <UploadCloud size={32} className="mx-auto text-slate-400 mb-2" />
                                                <p className="text-sm font-semibold text-slate-700">
                                                    Click to browse or drag & drop creative file
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Images & short video clips stored with zero marketer egress limits
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Video URL (YouTube Unlisted, Google Drive, or Vimeo)
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://www.youtube.com/watch?v=... or https://drive.google.com/..."
                                        value={uploadForm.fileUrl}
                                        onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none"
                                    />
                                    <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                                        <Sparkles size={12} /> Large 4K walkthroughs, Monday meeting recordings, and skits stream instantly with 0 CRM storage cost!
                                    </p>
                                </div>
                            )}

                            {/* Marketing Caption & Copywriting */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Marketing Caption & Pitch (For Marketers to Copy)
                                    </label>
                                    <span className="text-xs text-slate-400">Marketers will 1-click copy this</span>
                                </div>
                                <textarea
                                    rows={4}
                                    placeholder="Write compelling sales copy, meeting takeaways, event highlights, or call-to-action with hashtags..."
                                    value={uploadForm.marketingCaption}
                                    onChange={(e) => setUploadForm({ ...uploadForm, marketingCaption: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none leading-relaxed"
                                />

                                {/* Quick Hashtag Injector Chips */}
                                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-0.5">
                                        <Hash size={12} /> Quick Tags:
                                    </span>
                                    {[
                                        '#MondayMotivation',
                                        '#CulturalDay',
                                        '#EsthingtonGroup',
                                        '#TeamCulture',
                                        '#RealEstateAbuja',
                                        '#LuxuryLiving',
                                        '#LandForSale',
                                        '#ZeroInterest'
                                    ].map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => addHashtag(tag)}
                                            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-cyan-100 text-slate-600 hover:text-cyan-800 text-[11px] font-medium transition cursor-pointer"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Form Footer */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md shadow-cyan-600/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Publishing Asset...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud size={16} /> Publish to Media Hub
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT ASSET MODAL */}
            {isEditModalOpen && editingAsset && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Edit3 size={18} className="text-cyan-600" /> Edit Asset Information
                            </h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateAsset} className="space-y-4 mt-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={editingAsset.title}
                                    onChange={(e) => setEditingAsset({ ...editingAsset, title: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                                    <select
                                        value={editingAsset.type}
                                        onChange={(e) => setEditingAsset({ ...editingAsset, type: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                                    >
                                        <option value="FLYER">Flyer</option>
                                        <option value="STORY_REEL">9:16 Reel</option>
                                        <option value="PROMO_VIDEO">Walkthrough Video</option>
                                        <option value="MEETING_EVENT">Monday Meeting & Event</option>
                                        <option value="ENTERTAINMENT">Entertainment & Skit</option>
                                        <option value="TRAINING">Staff Training</option>
                                        <option value="PRICELIST">Price List</option>
                                        <option value="BRANDING">Branding</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Aspect Ratio</label>
                                    <select
                                        value={editingAsset.aspectRatio}
                                        onChange={(e) => setEditingAsset({ ...editingAsset, aspectRatio: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                                    >
                                        <option value="1:1">1:1 Square</option>
                                        <option value="9:16">9:16 Vertical</option>
                                        <option value="16:9">16:9 Widescreen</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estate Attachment</label>
                                <select
                                    value={editingAsset.estateId || 'NON_ESTATE'}
                                    onChange={(e) => setEditingAsset({ ...editingAsset, estateId: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                                >
                                    <option value="NON_ESTATE">Corporate & Culture (No Specific Estate)</option>
                                    {estates.map((est) => (
                                        <option key={est.id} value={est.id}>
                                            📍 {est.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Marketing Caption</label>
                                <textarea
                                    rows={4}
                                    value={editingAsset.marketingCaption || ''}
                                    onChange={(e) =>
                                        setEditingAsset({ ...editingAsset, marketingCaption: e.target.value })
                                    }
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none leading-relaxed"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
