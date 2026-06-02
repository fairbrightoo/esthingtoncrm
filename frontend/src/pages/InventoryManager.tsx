import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Home, MapPin, ArrowLeft, CheckSquare, Square, Save, Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Estate {
    id: string;
    name: string;
    location: string;
    companyId?: string;
    managingBranchId?: string;
    managingCompany: string;
    managingBranch: string;
    totalPlots: number;
    availablePlots: number;
    documentSearchNumber?: string;
    searchDocumentUrl?: string;
    siteLayoutUrl?: string;
    plotBreakdown?: { size: string; count: number }[];
}

interface Plot {
    id: string;
    plotNumber: string;
    prototype: string;
    size: number;
    price: number;
    isCornerPiece: boolean;
    status: string;
}

const SecurePdfViewer = ({ estate }: { estate: Estate }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [numPages, setNumPages] = useState<number | null>(null);
    const { token } = useAuth();

    useEffect(() => {
        let active = true;
        setLoading(true);
        if (!estate.siteLayoutUrl) return;

        axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/secure-pdf-stream`, 
            { filePath: estate.siteLayoutUrl }, 
            { 
                responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` }
            }
        )
            .then(res => {
                if (active) {
                    const objectUrl = URL.createObjectURL(res.data);
                    setBlobUrl(objectUrl);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("PDF Blob load error:", err);
                if (active) setError(true);
                setLoading(false);
            });
        
        return () => {
            active = false;
        };
    }, [estate, token]);

    if (error) return <div className="w-full h-full flex flex-col items-center justify-center text-red-400 bg-slate-900 rounded-xl border border-slate-700 font-medium">Failed to load layout securely. Reload process recommended.</div>;
    if (loading || !blobUrl) return <div className="w-full h-full flex items-center justify-center text-teal-400 bg-slate-900 rounded-xl border border-slate-700 font-bold animate-pulse">Loading Secure PDF Buffer...</div>;

    return (
        <div className="w-full h-full rounded-xl bg-slate-900 shadow-2xl border border-slate-700 flex flex-col overflow-hidden relative">
            {/* Top Toolbar overlay */}
            <div className="absolute top-4 right-4 z-10">
                <button 
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="flex items-center px-4 py-2 bg-slate-800/80 backdrop-blur border border-slate-600 text-white rounded-lg hover:bg-slate-700 transition shadow-lg"
                >
                    <RefreshCw size={18} className="mr-2" /> Rotate
                </button>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar flex justify-center p-8 bg-slate-800/30">
                <Document
                    file={blobUrl}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    loading={<div className="text-teal-400 font-bold animate-pulse mt-20">Parsing layout framework...</div>}
                    className="flex flex-col items-center shadow-lg"
                >
                    <Page 
                        pageNumber={1} 
                        rotate={rotation}
                        className="transition-transform duration-300"
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                    />
                </Document>
            </div>
        </div>
    );
};

export const InventoryManager = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    const [estates, setEstates] = useState<Estate[]>([]);
    const [loading, setLoading] = useState(true);

    const canManageEstate = (estate: Estate | null) => {
        if (!user || !estate) return false;
        if (user.role === 'SUPER_ADMIN' || user.role === 'GLOBAL_CHAIRMAN') return true;
        if (user.companyId === estate.companyId) {
            if (user.role === 'MANAGING_DIRECTOR') return true;
            if (user.role === 'BRANCH_ADMIN' && user.branchId === estate.managingBranchId) return true;
        }
        return false;
    };
    
    // View States
    const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL'>('LIST');
    const [selectedEstate, setSelectedEstate] = useState<Estate | null>(null);
    const [estatePlots, setEstatePlots] = useState<Plot[]>([]);
    const [plotsLoading, setPlotsLoading] = useState(false);

    // Modals & Forms
    const [isEstateModalOpen, setIsEstateModalOpen] = useState(false);
    const [isEditEstateModalOpen, setIsEditEstateModalOpen] = useState(false);
    const [estateForm, setEstateForm] = useState({ name: '', location: '', documentSearchNumber: '' });
    const [searchDocument, setSearchDocument] = useState<File | null>(null);
    const [siteLayout, setSiteLayout] = useState<File | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    const [estateToDelete, setEstateToDelete] = useState<Estate | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Bulk Plot Form
    const [plotForm, setPlotForm] = useState({ prototype: '', size: '', price: '', quantity: '' });
    const [isGenerating, setIsGenerating] = useState(false);

    // Legacy Imports & Edits
    const [plotCreationMode, setPlotCreationMode] = useState<'AUTO' | 'LEGACY' | 'LEGACY_SALES'>('AUTO');
    const [legacyTab, setLegacyTab] = useState<'SINGLE' | 'CSV'>('SINGLE');
    const [legacyPlotForm, setLegacyPlotForm] = useState({ plotNumber: '', prototype: '', size: '', price: '', isCornerPiece: false });
    
    // Legacy Sales Onboarding
    const [legacySaleTab, setLegacySaleTab] = useState<'SINGLE' | 'CSV'>('SINGLE');
    const [legacySaleForm, setLegacySaleForm] = useState({
        clientName: '', clientPhone: '', clientEmail: '',
        plotNumber: '', prototype: '', size: '', agreedPrice: '',
        amountPaidSoFar: '', dateOfSale: '', marketerEmail: ''
    });
    const [legacySaleCsvText, setLegacySaleCsvText] = useState('');
    const [isLegacySaleLoading, setIsLegacySaleLoading] = useState(false);
    const [csvText, setCsvText] = useState('');
    const [isLegacyLoading, setIsLegacyLoading] = useState(false);

    const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
    const [bulkPriceForm, setBulkPriceForm] = useState({ size: '', newPrice: '' });
    const [isUpdatingBulkPrice, setIsUpdatingBulkPrice] = useState(false);

    const [historyModal, setHistoryModal] = useState<{isOpen: boolean, plot: Plot | null, logs: any[], loading: boolean}>({isOpen: false, plot: null, logs: [], loading: false});

    useEffect(() => {
        if (viewMode === 'LIST') {
            fetchEstates();
            // Reset state
            setPlotCreationMode('AUTO');
            setLegacyTab('SINGLE');
        }
    }, [viewMode]);

    useEffect(() => {
        if (selectedEstate && viewMode === 'DETAIL') {
            fetchEstatePlots(selectedEstate.id);
        }
    }, [selectedEstate, viewMode]);

    const fetchEstates = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEstates(res.data);
        } catch (error) {
            addToast("Failed to load estates", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchEstatePlots = async (estateId: string) => {
        setPlotsLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${estateId}/plots`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEstatePlots(res.data);
        } catch (error) {
            addToast("Failed to load plots", "error");
        } finally {
            setPlotsLoading(false);
        }
    };

    // --- ESTATE ACTIONS ---
    const handleCreateEstate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('name', estateForm.name);
            formData.append('location', estateForm.location);
            if (estateForm.documentSearchNumber) formData.append('documentSearchNumber', estateForm.documentSearchNumber);
            if (searchDocument) formData.append('searchDocument', searchDocument);
            if (siteLayout) formData.append('siteLayout', siteLayout);

            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            addToast("Estate created successfully", "success");
            setIsEstateModalOpen(false);
            setEstateForm({ name: '', location: '', documentSearchNumber: '' });
            setSearchDocument(null);
            setSiteLayout(null);
            fetchEstates();
        } catch (error) {
            addToast("Failed to create estate", "error");
        }
    };

    const handleUpdateEstate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEstate) return;
        try {
            const formData = new FormData();
            formData.append('name', estateForm.name);
            formData.append('location', estateForm.location);
            if (estateForm.documentSearchNumber !== undefined) formData.append('documentSearchNumber', estateForm.documentSearchNumber);
            if (searchDocument) formData.append('searchDocument', searchDocument);
            if (siteLayout) formData.append('siteLayout', siteLayout);
            
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstate.id}`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            addToast("Estate updated successfully", "success");
            setIsEditEstateModalOpen(false);
            setSearchDocument(null);
            setSiteLayout(null);
            // Re-fetch to update detail view
            fetchEstates();
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates`, { headers: { Authorization: `Bearer ${token}` } });
            const updated = res.data.find((E: Estate) => E.id === selectedEstate.id);
            if(updated) setSelectedEstate(updated);
        } catch (error) {
            addToast("Failed to update estate", "error");
        }
    };

    const confirmDeleteEstate = async () => {
        if (!estateToDelete) return;
        setIsDeleting(true);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${estateToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Estate deleted", "success");
            setEstateToDelete(null);
            if (viewMode === 'DETAIL') {
                setViewMode('LIST');
            } else {
                fetchEstates();
            }
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to delete estate", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    // --- PLOT ACTIONS ---
    const handleBulkGeneratePlots = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEstate) return;
        setIsGenerating(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstate.id}/plots/bulk`, {
                prototype: plotForm.prototype,
                size: Number(plotForm.size),
                price: Number(plotForm.price),
                quantity: Number(plotForm.quantity)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            addToast("Plots generated successfully", "success");
            setPlotForm({ prototype: '', size: '', price: '', quantity: '' });
            fetchEstatePlots(selectedEstate.id);
        } catch (error) {
            addToast("Failed to generate plots", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleCornerPiece = async (plotId: string, currentValue: boolean) => {
        try {
            const newValue = !currentValue;
            
            // Optimistic update
            const updatedPlots = estatePlots.map(p => {
                if (p.id === plotId) {
                    let newPlotNum = p.plotNumber;
                    const sizeStr = String(p.size);
                    if (newValue) {
                        newPlotNum = newPlotNum.replace(`-${sizeStr}-`, `-${sizeStr}CP-`);
                    } else {
                        newPlotNum = newPlotNum.replace(`-${sizeStr}CP-`, `-${sizeStr}-`);
                    }
                    return { ...p, isCornerPiece: newValue, plotNumber: newPlotNum };
                }
                return p;
            });
            setEstatePlots(updatedPlots);

            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/plots/${plotId}/toggle-cp`, { isCornerPiece: newValue }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Corner piece toggled", "success");
        } catch (error) {
            addToast("Failed to toggle corner piece", "error");
            fetchEstatePlots(selectedEstate!.id); // revert on error
        }
    };

    const handleAddLegacyPlot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEstate) return;
        setIsLegacyLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstate.id}/plots/manual`, legacyPlotForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Legacy plot imported successfully", "success");
            setLegacyPlotForm({ plotNumber: '', prototype: '', size: '', price: '', isCornerPiece: false });
            fetchEstatePlots(selectedEstate.id);
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to import plot", "error");
        } finally {
            setIsLegacyLoading(false);
        }
    };

    const handleBulkLegacyImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEstate) return;
        
        try {
            let preparedPlots = [];
            // Basic CSV parsing
            const lines = csvText.split('\n').filter(l => l.trim().length > 0);
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const cols = line.split(',');
                if (cols.length < 4) continue; // Minimal: plotNumber, prototype, size, price
                preparedPlots.push({
                    plotNumber: cols[0].trim(),
                    prototype: cols[1].trim(),
                    size: Number(cols[2].trim()),
                    price: Number(cols[3].trim()),
                    isCornerPiece: cols[4] ? cols[4].trim().toLowerCase() === 'true' : false
                });
            }

            if (preparedPlots.length === 0) {
                addToast("No valid plots parsed from CSV text", "error");
                return;
            }

            setIsLegacyLoading(true);

            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstate.id}/plots/bulk-import`, { plots: preparedPlots }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            addToast(`Successfully imported ${res.data.count} plots. ${res.data.skipped} skipped.`, "success");
            setCsvText('');
            fetchEstatePlots(selectedEstate.id);
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to bulk import plots", "error");
        } finally {
            setIsLegacyLoading(false);
        }
    };

    const handleAddLegacySale = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEstate) return;
        setIsLegacySaleLoading(true);
        try {
            const saleData = [{
                ...legacySaleForm,
                estateId: selectedEstate.id
            }];
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sales/legacy-onboard`, 
                { salesData: saleData, companyId: user?.companyId, branchId: user?.branchId }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast(res.data.message, "success");
            setLegacySaleForm({
                clientName: '', clientPhone: '', clientEmail: '',
                plotNumber: '', prototype: '', size: '', agreedPrice: '',
                amountPaidSoFar: '', dateOfSale: '', marketerEmail: ''
            });
            fetchEstatePlots(selectedEstate.id);
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to onboard legacy sale", "error");
        } finally {
            setIsLegacySaleLoading(false);
        }
    };

    const handleBulkLegacySaleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEstate) return;
        
        try {
            let preparedSales = [];
            const lines = legacySaleCsvText.split('\n').filter(l => l.trim().length > 0);
            for (let i = 0; i < lines.length; i++) {
                // simple csv split handling commas inside quotes could be complex, assuming standard
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length < 9) continue;
                // Expected: ClientName, Phone, Email, PlotNumber, Prototype, Size, AgreedPrice, AmountPaid, Date
                preparedSales.push({
                    clientName: cols[0],
                    clientPhone: cols[1],
                    clientEmail: cols[2] === '' ? undefined : cols[2],
                    plotNumber: cols[3],
                    prototype: cols[4],
                    size: Number(cols[5]),
                    agreedPrice: Number(cols[6]),
                    amountPaidSoFar: Number(cols[7]),
                    dateOfSale: cols[8],
                    estateId: selectedEstate.id
                });
            }

            if (preparedSales.length === 0) {
                addToast("No valid sales parsed from CSV text", "error");
                return;
            }

            setIsLegacySaleLoading(true);

            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sales/legacy-onboard`, 
                { salesData: preparedSales, companyId: user?.companyId, branchId: user?.branchId }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );

            addToast(res.data.message, "success");
            setLegacySaleCsvText('');
            fetchEstatePlots(selectedEstate.id);
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to bulk onboard legacy sales", "error");
        } finally {
            setIsLegacySaleLoading(false);
        }
    };

    const handleBulkPriceUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEstate) return;
        setIsUpdatingBulkPrice(true);
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstate.id}/plots/bulk-price`, bulkPriceForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast(`Successfully updated the price of ${res.data.updatedCount} plots.`, "success");
            setIsBulkPriceModalOpen(false);
            setBulkPriceForm({ size: '', newPrice: '' });
            fetchEstatePlots(selectedEstate.id);
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to bulk update plot prices", "error");
        } finally {
            setIsUpdatingBulkPrice(false);
        }
    };

    const fetchPlotHistory = async (plot: Plot) => {
        setHistoryModal({ isOpen: true, plot, logs: [], loading: true });
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/plots/${plot.id}/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistoryModal({ isOpen: true, plot, logs: res.data, loading: false });
        } catch (error) {
            addToast("Failed to load plot history", "error");
            setHistoryModal({ isOpen: false, plot: null, logs: [], loading: false });
        }
    };

    const deleteModal = estateToDelete ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 scale-100 transition-all opacity-100">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
                <div className="p-6 bg-red-50/50 border-b border-red-100 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <Trash2 size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Delete Estate?</h2>
                    <p className="text-sm text-gray-500 mt-2">
                        Are you sure you want to delete <strong className="text-gray-700">{estateToDelete.name}</strong>? This will permanently erase all available plots within it. This action cannot be undone.
                    </p>
                </div>
                <div className="p-6 flex space-x-3 bg-gray-50">
                    <button
                        onClick={() => setEstateToDelete(null)}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-medium transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmDeleteEstate}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl font-medium shadow-md shadow-red-200 transition disabled:opacity-50 flex justify-center items-center"
                    >
                        {isDeleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                </div>
            </div>
        </div>
    ) : null;



    if (viewMode === 'LIST') {
        return (
            <div className="space-y-6">
                <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Global Inventory</h1>
                        <p className="text-gray-500 mt-1">Manage estates and bulk-generate properties across all branches.</p>
                    </div>
                    {['BRANCH_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') && (
                        <button
                            onClick={() => setIsEstateModalOpen(true)}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium shadow-md shadow-indigo-200"
                        >
                            <Plus size={20} />
                            <span>Create New Estate</span>
                        </button>
                    )}
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-12 text-center text-gray-400">Loading Estates...</div>
                    ) : estates.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
                            No estates found. Create one to get started.
                        </div>
                    ) : (
                        estates.map(estate => (
                            <div key={estate.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                            <Home size={24} />
                                        </div>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold uppercase tracking-wider rounded-full">
                                            {estate.managingCompany} ({estate.managingBranch})
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">{estate.name}</h3>
                                    <div className="flex items-center text-gray-500 text-sm mb-6">
                                        <MapPin size={14} className="mr-1.5" />
                                        {estate.location}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium uppercase mb-1">Total Units</p>
                                            <p className="text-lg font-bold text-gray-800">{estate.totalPlots}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-green-600 font-medium uppercase mb-1">Available</p>
                                            <p className="text-lg font-bold text-green-700">{estate.availablePlots}</p>
                                        </div>
                                    </div>

                                    {estate.plotBreakdown && estate.plotBreakdown.length > 0 && (
                                        <div className="mb-6">
                                            <p className="text-xs text-gray-400 font-medium uppercase mb-2">Available Plot Sizes</p>
                                            <div className="flex flex-wrap gap-2">
                                                {estate.plotBreakdown.map((pb, idx) => (
                                                    <span key={idx} className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 text-[11px] font-semibold rounded-md shadow-sm">
                                                        {pb.size}: <span className="text-green-600 ml-1">{pb.count}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {canManageEstate(estate) && (
                                    <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex justify-end">
                                        <button 
                                            onClick={() => { setSelectedEstate(estate); setViewMode('DETAIL'); }}
                                            className="text-indigo-600 font-medium text-sm flex items-center hover:text-indigo-700 group-hover:translate-x-1 transition-transform"
                                        >
                                            Manage Plots →
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Create Estate Modal */}
                {isEstateModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                            <div className="p-6 bg-gray-50 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-800">Create New Estate</h2>
                                <p className="text-sm text-gray-500 mt-1">This estate will be managed by {user?.branch?.name || 'your branch'}.</p>
                            </div>
                            <form onSubmit={handleCreateEstate} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estate Name</label>
                                    <input required className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                        placeholder="e.g. Double King Villa"
                                        value={estateForm.name} onChange={e => setEstateForm({ ...estateForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
                                    <input required className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                        placeholder="e.g. Guzape 2"
                                        value={estateForm.location} onChange={e => setEstateForm({ ...estateForm, location: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Document Search Number (Optional)</label>
                                    <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                        placeholder="e.g. FCDA/2023/XYZ"
                                        value={estateForm.documentSearchNumber} onChange={e => setEstateForm({ ...estateForm, documentSearchNumber: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Search Document (PDF/Image) (Optional)</label>
                                    <input type="file" accept="image/*,.pdf" 
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        onChange={e => setSearchDocument(e.target.files ? e.target.files[0] : null)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site Layout Map (PDF/Image) (Optional)</label>
                                    <input type="file" accept="image/*,.pdf" 
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                        onChange={e => setSiteLayout(e.target.files ? e.target.files[0] : null)} />
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Aesthetic preview map restricted to Admins/MDs</p>
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button type="button" onClick={() => setIsEstateModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">Cancel</button>
                                    <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition">
                                        Create Estate
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {deleteModal}
            </div>
        );
    }

    if (viewMode === 'DETAIL' && selectedEstate) {
        return (
            <div className="space-y-6 pb-12">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setViewMode('LIST')} className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{selectedEstate.name}</h1>
                            <div className="flex flex-col text-gray-500 text-sm mt-1 space-y-1">
                                <div className="flex items-center">
                                    <MapPin size={14} className="mr-1" /> {selectedEstate.location} • Managed by {selectedEstate.managingCompany} ({selectedEstate.managingBranch})
                                </div>
                                {selectedEstate.documentSearchNumber && (
                                    <div className="flex items-center text-indigo-700 font-medium">
                                        <CheckSquare size={14} className="mr-1" /> Search No: {selectedEstate.documentSearchNumber}
                                    </div>
                                )}
                                {selectedEstate.searchDocumentUrl && (
                                    <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${selectedEstate.searchDocumentUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                                        <Save size={14} className="mr-1" /> View/Download Search Document
                                    </a>
                                )}
                            </div>
                            
                            {selectedEstate.siteLayoutUrl && ['BRANCH_ADMIN', 'SUPER_ADMIN', 'MANAGING_DIRECTOR'].includes(user?.role || '') && (
                                <button 
                                    onClick={() => setIsViewerOpen(true)}
                                    className="mt-3 flex items-center px-4 py-2 bg-slate-900 border border-slate-700 text-slate-100 hover:bg-slate-800 rounded-lg text-sm font-semibold transition"
                                >
                                    <MapPin size={16} className="mr-2 text-teal-400" /> View Site Layout
                                </button>
                            )}
                        </div>
                    </div>
                    {canManageEstate(selectedEstate) && (
                        <div className="flex space-x-3">
                            <button 
                                onClick={() => {
                                    setEstateForm({ name: selectedEstate.name, location: selectedEstate.location, documentSearchNumber: selectedEstate.documentSearchNumber || '' });
                                    setSearchDocument(null);
                                    setIsEditEstateModalOpen(true);
                                }} 
                                className="flex items-center px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl font-medium transition shadow-sm border border-indigo-100"
                            >
                                <Edit2 size={16} className="mr-2" /> Edit Estate
                            </button>
                            <button onClick={() => setEstateToDelete(selectedEstate)} className="flex items-center px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition shadow-sm border border-red-100 hover:border-red-200">
                                <Trash2 size={16} className="mr-2" /> Delete Estate
                            </button>
                        </div>
                    )}
                </header>

                {/* Addition Section */}
                {canManageEstate(selectedEstate) && (
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <Activity size={120} />
                        </div>
                        
                        <div className="flex border-b border-indigo-200 mb-5 relative z-10 space-x-6 overflow-x-auto custom-scrollbar">
                            <button 
                                className={`pb-3 font-bold text-sm tracking-wide transition-colors whitespace-nowrap ${plotCreationMode === 'AUTO' ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-indigo-400 hover:text-indigo-600'}`}
                                onClick={() => setPlotCreationMode('AUTO')}
                            >
                                AUTO GENERATE PLOTS
                            </button>
                            <button 
                                className={`pb-3 font-bold text-sm tracking-wide transition-colors whitespace-nowrap ${plotCreationMode === 'LEGACY' ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-indigo-400 hover:text-indigo-600'}`}
                                onClick={() => setPlotCreationMode('LEGACY')}
                            >
                                IMPORT LEGACY PLOTS (UNSOLD)
                            </button>
                            <button 
                                className={`pb-3 font-bold text-sm tracking-wide transition-colors whitespace-nowrap ${plotCreationMode === 'LEGACY_SALES' ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-indigo-400 hover:text-indigo-600'}`}
                                onClick={() => setPlotCreationMode('LEGACY_SALES')}
                            >
                                ONBOARD LEGACY SALES
                            </button>
                        </div>

                        {plotCreationMode === 'AUTO' && (
                            <form onSubmit={handleBulkGeneratePlots} className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-indigo-900/70 uppercase tracking-wider mb-1.5">Building Prototype</label>
                                    <input required className="w-full border border-indigo-200/60 rounded-xl px-4 py-2.5 bg-white/80 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                        placeholder="4 Bedroom Terrace Duplex"
                                        value={plotForm.prototype} onChange={e => setPlotForm({ ...plotForm, prototype: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-900/70 uppercase tracking-wider mb-1.5">Size (sqm)</label>
                                    <input required type="number" className="w-full border border-indigo-200/60 rounded-xl px-4 py-2.5 bg-white/80 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                        placeholder="250"
                                        value={plotForm.size} onChange={e => setPlotForm({ ...plotForm, size: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-900/70 uppercase tracking-wider mb-1.5">Base Price (₦)</label>
                                    <input required type="number" className="w-full border border-indigo-200/60 rounded-xl px-4 py-2.5 bg-white/80 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                        placeholder="26000000"
                                        value={plotForm.price} onChange={e => setPlotForm({ ...plotForm, price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-900/70 uppercase tracking-wider mb-1.5">Quantity</label>
                                    <div className="flex space-x-2">
                                        <input required type="number" min="1" max="500" className="w-full border border-indigo-200/60 rounded-xl px-4 py-2.5 bg-white/80 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                            placeholder="150 units"
                                            value={plotForm.quantity} onChange={e => setPlotForm({ ...plotForm, quantity: e.target.value })} />
                                        <button 
                                            type="submit" 
                                            disabled={isGenerating}
                                            className="bg-indigo-600 text-white px-4 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 flex-shrink-0 flex items-center justify-center"
                                            title="Generate Plots"
                                        >
                                            {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {plotCreationMode === 'LEGACY' && (
                            <div className="relative z-10">
                                <div className="flex space-x-2 mb-4 bg-white/50 p-1 rounded-full w-max border border-indigo-100">
                                    <button onClick={() => setLegacyTab('SINGLE')} type="button" className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${legacyTab === 'SINGLE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-600 hover:bg-indigo-100'}`}>Single Plot Entry</button>
                                    <button onClick={() => setLegacyTab('CSV')} type="button" className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${legacyTab === 'CSV' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-600 hover:bg-indigo-100'}`}>Bulk CSV Parse</button>
                                </div>

                                {legacyTab === 'SINGLE' ? (
                                    <form onSubmit={handleAddLegacyPlot} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1.5">Exact Plot Number</label>
                                            <input required className="w-full border border-indigo-200/60 rounded-xl px-4 py-2.5 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                                placeholder="e.g. PLOT-2A-OLD"
                                                value={legacyPlotForm.plotNumber} onChange={e => setLegacyPlotForm({ ...legacyPlotForm, plotNumber: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1.5">Building Prototype</label>
                                            <input required className="w-full border border-indigo-200/60 rounded-xl px-4 py-2.5 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                                value={legacyPlotForm.prototype} onChange={e => setLegacyPlotForm({ ...legacyPlotForm, prototype: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1.5">Size (sqm)</label>
                                            <input required type="number" className="w-full border border-indigo-200/60 rounded-xl px-4 py-2.5 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                                value={legacyPlotForm.size} onChange={e => setLegacyPlotForm({ ...legacyPlotForm, size: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1.5">Price (₦)</label>
                                            <input required type="number" className="w-full border border-indigo-200/60 rounded-xl px-4 py-2.5 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                                value={legacyPlotForm.price} onChange={e => setLegacyPlotForm({ ...legacyPlotForm, price: e.target.value })} />
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={isLegacyLoading}
                                            className="w-full bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center font-bold"
                                        >
                                            {isLegacyLoading ? 'Importing...' : 'Add Legacy Plot'}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleBulkLegacyImport} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-900/70 uppercase tracking-wider mb-1.5">Paste CSV Lines (Format: Plot Number, Prototype, Size, Price, IsCornerPiece)</label>
                                            <textarea 
                                                className="w-full h-32 border border-indigo-200/60 rounded-xl p-4 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm font-mono"
                                                placeholder="PLOT-1, 4 Bedroom Duplex, 500, 25000000, false&#10;PLOT-2, 4 Bedroom Duplex, 500, 26000000, true"
                                                value={csvText}
                                                onChange={e => setCsvText(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button 
                                                type="submit" 
                                                disabled={isLegacyLoading || !csvText.trim()}
                                                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition disabled:opacity-50 font-bold"
                                            >
                                                {isLegacyLoading ? 'Importing Array...' : 'Process Bulk Array'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}

                        {plotCreationMode === 'LEGACY_SALES' && (
                            <div className="relative z-10">
                                <div className="flex space-x-2 mb-4 bg-white/50 p-1 rounded-full w-max border border-indigo-100">
                                    <button onClick={() => setLegacySaleTab('SINGLE')} type="button" className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${legacySaleTab === 'SINGLE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-600 hover:bg-indigo-100'}`}>Single Sale Entry</button>
                                    <button onClick={() => setLegacySaleTab('CSV')} type="button" className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${legacySaleTab === 'CSV' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-600 hover:bg-indigo-100'}`}>Bulk CSV Parse</button>
                                </div>

                                {legacySaleTab === 'SINGLE' ? (
                                    <form onSubmit={handleAddLegacySale} className="bg-white/60 p-4 rounded-xl border border-indigo-100/50">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            {/* Client Info */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-indigo-900 border-b border-indigo-100 pb-1">CLIENT DETAILS</h4>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Full Name</label>
                                                    <input required className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        value={legacySaleForm.clientName} onChange={e => setLegacySaleForm({ ...legacySaleForm, clientName: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Phone Number</label>
                                                    <input required className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        value={legacySaleForm.clientPhone} onChange={e => setLegacySaleForm({ ...legacySaleForm, clientPhone: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Email (Optional)</label>
                                                    <input type="email" className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        value={legacySaleForm.clientEmail} onChange={e => setLegacySaleForm({ ...legacySaleForm, clientEmail: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Marketer Email (Optional)</label>
                                                    <input type="email" placeholder="e.g. marketer@company.com" className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        value={legacySaleForm.marketerEmail} onChange={e => setLegacySaleForm({ ...legacySaleForm, marketerEmail: e.target.value })} />
                                                </div>
                                            </div>
                                            {/* Plot Info */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-indigo-900 border-b border-indigo-100 pb-1">PLOT DETAILS</h4>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Plot Number</label>
                                                    <input required className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        placeholder="e.g. PLOT-2A-OLD"
                                                        value={legacySaleForm.plotNumber} onChange={e => setLegacySaleForm({ ...legacySaleForm, plotNumber: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Prototype</label>
                                                    <input required className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        value={legacySaleForm.prototype} onChange={e => setLegacySaleForm({ ...legacySaleForm, prototype: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Size (sqm)</label>
                                                    <input required type="number" className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        value={legacySaleForm.size} onChange={e => setLegacySaleForm({ ...legacySaleForm, size: e.target.value })} />
                                                </div>
                                            </div>
                                            {/* Payment Info */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-indigo-900 border-b border-indigo-100 pb-1">SALE DETAILS</h4>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Agreed Price (₦)</label>
                                                    <input required type="number" className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        value={legacySaleForm.agreedPrice} onChange={e => setLegacySaleForm({ ...legacySaleForm, agreedPrice: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Amount Paid So Far (₦)</label>
                                                    <input required type="number" className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        value={legacySaleForm.amountPaidSoFar} onChange={e => setLegacySaleForm({ ...legacySaleForm, amountPaidSoFar: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-900/70 uppercase tracking-wider mb-1">Original Date of Sale</label>
                                                    <input required type="date" className="w-full border border-indigo-200/60 rounded-lg px-3 py-2 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-700"
                                                        value={legacySaleForm.dateOfSale} onChange={e => setLegacySaleForm({ ...legacySaleForm, dateOfSale: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={isLegacySaleLoading}
                                            className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center font-bold"
                                        >
                                            {isLegacySaleLoading ? 'Onboarding...' : 'Onboard Legacy Sale'}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleBulkLegacySaleImport} className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-end mb-1.5">
                                                <label className="block text-xs font-bold text-indigo-900/70 uppercase tracking-wider">Paste CSV Lines</label>
                                                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Format: ClientName, Phone, Email, PlotNumber, Prototype, Size, AgreedPrice, AmountPaid, Date(YYYY-MM-DD), MarketerEmail</span>
                                            </div>
                                            <textarea 
                                                className="w-full h-32 border border-indigo-200/60 rounded-xl p-4 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm font-mono"
                                                placeholder="John Doe, 08012345678, john@email.com, PLOT-A1, 4 Bedroom Duplex, 500, 25000000, 10000000, 2023-05-12, mark@esthington.com&#10;Jane Smith, 08098765432, , PLOT-A2, 4 Bedroom Duplex, 500, 26000000, 26000000, 2023-06-20, mark@esthington.com"
                                                value={legacySaleCsvText}
                                                onChange={e => setLegacySaleCsvText(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <button 
                                                type="submit" 
                                                disabled={isLegacySaleLoading || !legacySaleCsvText.trim()}
                                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 font-bold"
                                            >
                                                {isLegacySaleLoading ? 'Importing Array...' : 'Process Bulk Sales Array'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                        
                        {plotCreationMode === 'AUTO' && (
                            <p className="text-xs text-indigo-600/70 mt-3 font-medium">This will instantly generate unique plot IDs based on the company acronym, prototype acronym, and current date.</p>
                        )}
                    </div>
                )}

                {/* Data Grid */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center space-x-3">
                            <h3 className="font-bold text-gray-700">Generated Plots ({estatePlots.length})</h3>
                            {['BRANCH_ADMIN', 'SUPER_ADMIN', 'MANAGING_DIRECTOR'].includes(user?.role || '') && estatePlots.length > 0 && (
                                <button 
                                    onClick={() => setIsBulkPriceModalOpen(true)}
                                    className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold rounded-lg transition"
                                >
                                    Bulk Update Prices
                                </button>
                            )}
                        </div>
                        <div className="flex space-x-4 text-sm font-medium">
                            <div className="flex items-center space-x-1.5 text-green-600">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                <span>{estatePlots.filter(p => p.status === 'AVAILABLE').length} Available</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-blue-600">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span>{estatePlots.filter(p => p.status === 'SOLD').length} Sold</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-orange-600">
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                <span>{estatePlots.filter(p => p.status === 'RESERVED').length} Reserved</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm outline outline-1 outline-gray-100">
                                <tr className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                    <th className="px-6 py-4">Plot Number</th>
                                    <th className="px-6 py-4">Building Prototype</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Details</th>
                                    <th className="px-6 py-4 text-center">Corner Piece</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {plotsLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading plots...</td></tr>
                                ) : estatePlots.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No plots generated yet. Use the form above to add plots.</td></tr>
                                ) : (
                                    estatePlots.map(plot => (
                                        <tr key={plot.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <span className="font-mono text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">{plot.plotNumber}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-gray-700 font-medium">
                                                {plot.prototype}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    plot.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                                                    plot.status === 'SOLD' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {plot.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-gray-500">
                                                {plot.size} sqm • ₦{plot.price.toLocaleString()}
                                                <div className="flex items-center space-x-2">

                                                    <button 
                                                        onClick={() => fetchPlotHistory(plot)}
                                                        className="p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded transition flex items-center justify-center"
                                                        title="View Price Tracking History"
                                                    >
                                                        <Activity size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <button 
                                                    onClick={() => {
                                                        if (['BRANCH_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
                                                            toggleCornerPiece(plot.id, plot.isCornerPiece);
                                                        }
                                                    }}
                                                    disabled={!['BRANCH_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')}
                                                    className={`p-1.5 rounded transition ${
                                                        plot.isCornerPiece 
                                                            ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' 
                                                            : 'text-gray-300 hover:text-indigo-400 hover:bg-gray-100'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed mx-auto`}
                                                    title={plot.isCornerPiece ? "Remove Corner Piece" : "Mark as Corner Piece"}
                                                >
                                                    {plot.isCornerPiece ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isEditEstateModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                            <div className="p-6 bg-indigo-50 border-b border-indigo-100">
                                <h2 className="text-xl font-bold text-gray-800">Edit Estate Details</h2>
                                <p className="text-sm text-gray-500 mt-1">Update fields or upload missing Search Documents.</p>
                            </div>
                            <form onSubmit={handleUpdateEstate} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estate Name</label>
                                    <input required className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                        value={estateForm.name} onChange={e => setEstateForm({ ...estateForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
                                    <input required className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                        value={estateForm.location} onChange={e => setEstateForm({ ...estateForm, location: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Document Search Number (Optional)</label>
                                    <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                        placeholder="e.g. FCDA/2023/XYZ"
                                        value={estateForm.documentSearchNumber} onChange={e => setEstateForm({ ...estateForm, documentSearchNumber: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Search Document (PDF/Image) (Optional)</label>
                                    <input type="file" accept="image/*,.pdf" 
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        onChange={e => setSearchDocument(e.target.files ? e.target.files[0] : null)} />
                                    {selectedEstate.searchDocumentUrl && !searchDocument && <p className="text-xs text-gray-500 mt-2">A document is currently uploaded. Uploading a new one will replace it.</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site Layout Map (PDF/Image) (Optional)</label>
                                    <input type="file" accept="image/*,.pdf" 
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                        onChange={e => setSiteLayout(e.target.files ? e.target.files[0] : null)} />
                                    {selectedEstate.siteLayoutUrl && !siteLayout && <p className="text-xs text-gray-500 mt-2">A layout map is currently saved. Uploading a new one will overwrite it.</p>}
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button type="button" onClick={() => setIsEditEstateModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">Cancel</button>
                                    <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition">
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {deleteModal}

                {/* Site Layout Fullscreen Viewer */}
                {isViewerOpen && selectedEstate.siteLayoutUrl && (
                    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col z-[70] transition-opacity">
                        <header className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-100 flex items-center"><MapPin className="mr-2 text-teal-400" /> {selectedEstate.name} Site Layout</h3>
                                <p className="text-sm text-slate-400 mt-1">Confidential viewing restricted to Management layers</p>
                            </div>
                            <button 
                                onClick={() => setIsViewerOpen(false)}
                                className="px-5 py-2.5 bg-slate-800 text-slate-200 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl transition font-medium"
                            >
                                Close Viewer
                            </button>
                        </header>
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
                            {selectedEstate.siteLayoutUrl.toLowerCase().endsWith('.pdf') ? (
                                <SecurePdfViewer estate={selectedEstate} />
                            ) : (
                                <img 
                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${selectedEstate.siteLayoutUrl}`} 
                                    alt={`${selectedEstate.name} Site Layout`}
                                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-700 bg-slate-100"
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Bulk Price Update Modal */}
                {isBulkPriceModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
                            <div className="p-6 bg-blue-50 border-b border-blue-100">
                                <h2 className="text-xl font-bold text-blue-900">Bulk Update Block</h2>
                                <p className="text-sm text-blue-700/70 mt-1">Change the valuation of all plots matching a specific dimension instantly. History logs will be generated automatically.</p>
                            </div>
                            <form onSubmit={handleBulkPriceUpdate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Target Plot Size (sqm)</label>
                                    <select required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        value={bulkPriceForm.size} onChange={e => setBulkPriceForm({ ...bulkPriceForm, size: e.target.value })}>
                                        <option value="">Select a documented size...</option>
                                        {Array.from(new Set(estatePlots.map(p => p.size))).sort((a,b) => a-b).map(size => (
                                            <option key={size} value={size}>{size} sqm ({estatePlots.filter(p => p.size === size).length} units)</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">New Valuation Price (₦)</label>
                                    <input required type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        placeholder="e.g. 50000000"
                                        value={bulkPriceForm.newPrice} onChange={e => setBulkPriceForm({ ...bulkPriceForm, newPrice: e.target.value })} />
                                </div>
                                
                                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setIsBulkPriceModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition">Cancel</button>
                                    <button type="submit" disabled={isUpdatingBulkPrice || !bulkPriceForm.size} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-md shadow-blue-200 transition disabled:opacity-50">
                                        {isUpdatingBulkPrice ? 'Executing...' : 'Confirm Update'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Plot Price History Modal */}
                {historyModal.isOpen && historyModal.plot && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all flex flex-col max-h-[80vh]">
                            <div className="p-6 bg-purple-50 border-b border-purple-100 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-purple-900 flex items-center"><Activity className="mr-2" /> Price History</h2>
                                    <p className="text-sm text-purple-700/70 mt-1 font-mono">{historyModal.plot.plotNumber}</p>
                                </div>
                                <button onClick={() => setHistoryModal({ isOpen: false, plot: null, logs: [], loading: false })} className="p-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200">
                                    <Trash2 size={16} className="opacity-0 w-0 h-0" />
                                    <span>Close</span>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                                {historyModal.loading ? (
                                    <div className="text-center text-slate-400 py-8">Fetching appreciation trajectory...</div>
                                ) : historyModal.logs.length === 0 ? (
                                    <div className="text-center bg-white p-8 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-slate-500 font-medium">No price changes recorded yet.</p>
                                        <p className="text-xs text-slate-400 mt-1">This plot is still at its original entry price.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                        {historyModal.logs.map((log: any, index: number) => (
                                            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 font-bold text-xs">
                                                    {historyModal.logs.length - index}
                                                </div>
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="flex items-center justify-between mb-1 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                                        <span>{new Date(log.changedAt).toLocaleDateString()}</span>
                                                        <span>{new Date(log.changedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-500 line-through">₦{log.oldPrice.toLocaleString()}</div>
                                                    <div className="text-lg font-bold text-green-600 flex items-center"><ArrowLeft className="w-4 h-4 mr-1 text-green-500 -rotate-45" /> ₦{log.newPrice.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
};
