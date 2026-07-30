import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Papa from 'papaparse';
import { 
    Map, Upload, Plus, AlertCircle, CheckCircle, Search, 
    ChevronDown, Edit2, Link, Unlink, FileSpreadsheet,
    Loader2, X
} from 'lucide-react';

export const SitePlotMapping = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [estates, setEstates] = useState<any[]>([]);
    const [selectedEstateId, setSelectedEstateId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'DATABASE' | 'ALLOCATION'>('DATABASE');
    const [loading, setLoading] = useState(false);

    const [physicalPlots, setPhysicalPlots] = useState<any[]>([]);
    const [unmappedPlots, setUnmappedPlots] = useState<any[]>([]);
    
    // For mapping
    const [mappingSystemPlot, setMappingSystemPlot] = useState<any>(null); // Plot being mapped
    const [showMappingModal, setShowMappingModal] = useState(false);

    // For Add/Edit
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingPlot, setEditingPlot] = useState<any>(null);
    const [formData, setFormData] = useState({
        physicalPlotNumber: '',
        size: '',
        isCornerPiece: false,
        coordinates: ''
    });

    const [sizeFilter, setSizeFilter] = useState<string>('ALL');
    
    const canEdit = ['SUPER_ADMIN', 'GLOBAL_CHAIRMAN', 'GLOBAL_MANAGING_DIRECTOR', 'MANAGING_DIRECTOR', 'BRANCH_ADMIN'].includes(user?.role || '');

    useEffect(() => {
        fetchEstates();
    }, [token, user]);

    useEffect(() => {
        if (selectedEstateId) {
            fetchData();
        }
    }, [selectedEstateId]);

    const fetchEstates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            let filtered = res.data;
            if (user?.role === 'BRANCH_ADMIN') {
                filtered = res.data.filter((e: any) => e.managingBranchId === user.branchId);
            }
            setEstates(filtered);
            if (filtered.length > 0) {
                setSelectedEstateId(filtered[0].id);
            }
        } catch (error) {
            console.error(error);
            addToast("Failed to fetch estates", "error");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [plotsRes, unmappedRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstateId}/physical-plots`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstateId}/plots/unmapped`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setPhysicalPlots(plotsRes.data);
            setUnmappedPlots(unmappedRes.data);
        } catch (error) {
            console.error(error);
            addToast("Failed to fetch layout data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const plots = results.data.map((row: any) => ({
                    physicalPlotNumber: row['Plot Number'] || row['PlotNumber'] || row['Plot'],
                    size: row['Size (sqm)'] || row['Size'] || 0,
                    isCornerPiece: row['Corner Piece']?.toLowerCase() === 'yes' || row['IsCornerPiece']?.toLowerCase() === 'true',
                    coordinates: row['Coordinates'] || null
                })).filter(p => p.physicalPlotNumber);

                if (plots.length === 0) {
                    addToast("No valid plots found in CSV.", "error");
                    return;
                }

                try {
                    setLoading(true);
                    const res = await axios.post(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstateId}/physical-plots/bulk`,
                        { plots },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    addToast(`Successfully uploaded ${res.data.count} physical plots`, "success");
                    fetchData();
                } catch (error: any) {
                    addToast(error.response?.data?.error || "Upload failed", "error");
                } finally {
                    setLoading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            }
        });
    };

    const handleMapPlot = async (physicalPlotId: string) => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstateId}/physical-plots/${physicalPlotId}/map`,
                { systemPlotId: mappingSystemPlot.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast("Successfully mapped physical plot to client", "success");
            setShowMappingModal(false);
            setMappingSystemPlot(null);
            fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.error || "Mapping failed", "error");
        }
    };

    const handleUnmap = async (physicalPlotId: string) => {
        if (!window.confirm("Are you sure you want to decouple this client's plot from its physical location?")) return;
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstateId}/physical-plots/${physicalPlotId}/unmap`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast("Plot unmapped successfully", "success");
            fetchData();
        } catch (error: any) {
            addToast("Failed to unmap", "error");
        }
    };

    const handleOpenAddEdit = (plot: any = null) => {
        setEditingPlot(plot);
        if (plot) {
            setFormData({
                physicalPlotNumber: plot.physicalPlotNumber,
                size: plot.size.toString(),
                isCornerPiece: plot.isCornerPiece,
                coordinates: plot.coordinates || ''
            });
        } else {
            setFormData({
                physicalPlotNumber: '',
                size: '',
                isCornerPiece: false,
                coordinates: ''
            });
        }
        setShowAddEditModal(true);
    };

    const handleSavePlot = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                size: parseFloat(formData.size),
                id: editingPlot?.id
            };
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${selectedEstateId}/physical-plots`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast(`Successfully ${editingPlot ? 'updated' : 'added'} plot`, "success");
            setShowAddEditModal(false);
            fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to save plot", "error");
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
                        <Map className="mr-3 text-indigo-600" size={32} />
                        Site Plot Mapping
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Link client plots to surveyor physical layouts.</p>
                </div>
                
                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 min-w-[300px]">
                    <select
                        value={selectedEstateId}
                        onChange={(e) => setSelectedEstateId(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {estates.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner border border-gray-200 w-fit">
                <button
                    onClick={() => setActiveTab('DATABASE')}
                    className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'DATABASE' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Surveyor Layouts
                </button>
                <button
                    onClick={() => setActiveTab('ALLOCATION')}
                    className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'ALLOCATION' ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Allocation Desk
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                </div>
            ) : (
                <>
                    {activeTab === 'DATABASE' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Physical Layout Database</h3>
                                    <p className="text-sm text-gray-500">Total Plots: {physicalPlots.length}</p>
                                </div>
                                {canEdit && (
                                    <div className="flex space-x-3">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center font-semibold text-sm shadow-sm"
                                        >
                                            <Upload size={16} className="mr-2 text-indigo-600" /> Upload CSV
                                        </button>
                                        <button 
                                            onClick={() => handleOpenAddEdit()}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center font-semibold text-sm shadow-sm shadow-indigo-200"
                                        >
                                            <Plus size={16} className="mr-2" /> Add Plot
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white border-b border-gray-100 text-gray-500 font-medium">
                                        <tr>
                                            <th className="p-4">Physical Plot No.</th>
                                            <th className="p-4">Size</th>
                                            <th className="p-4">Corner Piece?</th>
                                            <th className="p-4">Coordinates</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Mapped To (System)</th>
                                            {canEdit && <th className="p-4 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {physicalPlots.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-400">
                                                    <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-20" />
                                                    No physical plots found. Upload a layout spreadsheet to begin.
                                                </td>
                                            </tr>
                                        ) : physicalPlots.map(plot => (
                                            <tr key={plot.id} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-bold text-gray-900">{plot.physicalPlotNumber}</td>
                                                <td className="p-4">{plot.size} sqm</td>
                                                <td className="p-4">
                                                    {plot.isCornerPiece ? 
                                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">Yes</span> 
                                                        : <span className="text-gray-400">No</span>
                                                    }
                                                </td>
                                                <td className="p-4 font-mono text-xs text-gray-500">{plot.coordinates || 'N/A'}</td>
                                                <td className="p-4">
                                                    {plot.status === 'ALLOCATED' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 font-bold text-xs">
                                                            <CheckCircle size={12} className="mr-1" /> Allocated
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-600 font-bold text-xs">
                                                            Available
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {plot.mappedSystemPlot ? (
                                                        <div>
                                                            <div className="font-bold text-gray-800">{plot.mappedSystemPlot.plotNumber}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                {plot.mappedSystemPlot.sales?.[0]?.lead?.fullName || 'Client'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Unmapped</span>
                                                    )}
                                                </td>
                                                {canEdit && (
                                                    <td className="p-4 text-right">
                                                        {plot.mappedSystemPlot ? (
                                                            <button 
                                                                onClick={() => handleUnmap(plot.id)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Unmap Plot"
                                                            >
                                                                <Unlink size={16} />
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleOpenAddEdit(plot)}
                                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ALLOCATION' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[60vh]">
                            <div className="p-6 border-b border-gray-100 bg-indigo-50/50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                                <div>
                                    <h3 className="font-bold text-indigo-900 text-lg">Unmapped Client Plots</h3>
                                    <p className="text-sm text-indigo-600/70">These system plots have been purchased or reserved, but lack a physical geographical mapping.</p>
                                </div>
                                <div className="mt-4 md:mt-0 bg-white p-1 rounded-lg border border-indigo-100 flex items-center shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 px-3 uppercase tracking-wide">Size Filter:</span>
                                    <select 
                                        value={sizeFilter}
                                        onChange={e => setSizeFilter(e.target.value)}
                                        className="bg-transparent border-none focus:outline-none text-indigo-700 font-bold py-1.5 px-2 text-sm pr-6 cursor-pointer"
                                    >
                                        <option value="ALL">All Sizes</option>
                                        {Array.from(new Set(unmappedPlots.map(p => p.size))).sort((a,b) => a-b).map(size => (
                                            <option key={size} value={size}>{size} sqm</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="p-6">
                                {unmappedPlots.filter(p => sizeFilter === 'ALL' || p.size.toString() === sizeFilter).length === 0 ? (
                                    <div className="text-center text-gray-400 py-10">
                                        <CheckCircle size={48} className="mx-auto mb-3 text-green-400 opacity-50" />
                                        <h3 className="text-gray-900 font-bold mb-1">All Caught Up!</h3>
                                        <p>Every sold plot has been successfully mapped to a physical layout.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {unmappedPlots.filter(p => sizeFilter === 'ALL' || p.size.toString() === sizeFilter).map(plot => (
                                            <div key={plot.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all bg-white relative group flex flex-col justify-between">
                                                <div>
                                                    <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded bg-blue-50 text-blue-700">
                                                        {plot.size} sqm
                                                    </div>
                                                    <div className="mb-4 pr-16">
                                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">System Plot</div>
                                                        <div className="font-black text-gray-900 text-lg break-all">{plot.plotNumber}</div>
                                                    </div>
                                                    <div className="p-3 bg-gray-50 rounded-lg mb-4">
                                                        <div className="text-xs text-gray-500 mb-1">Purchased By</div>
                                                        <div className="font-bold text-gray-800">
                                                            {plot.sales?.[0]?.lead?.fullName || 'Client'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {canEdit ? (
                                                    <button 
                                                        onClick={() => {
                                                            setMappingSystemPlot(plot);
                                                            setShowMappingModal(true);
                                                        }}
                                                        className="w-full py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center mt-auto"
                                                    >
                                                        <Link size={16} className="mr-2" /> Map to Physical Layout
                                                    </button>
                                                ) : (
                                                    <div className="w-full py-2.5 bg-gray-50 text-gray-400 font-bold rounded-lg text-center text-sm border border-gray-100 mt-auto">
                                                        Awaiting Admin Mapping
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Mapping Modal */}
            {showMappingModal && mappingSystemPlot && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                            <div>
                                <h3 className="font-black text-xl text-gray-900">Map to Physical Plot</h3>
                                <p className="text-sm text-gray-500 mt-1">Select an available physical plot of <b>{mappingSystemPlot.size} sqm</b></p>
                            </div>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50/50 rounded-xl">
                                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Target Internal Plot</div>
                                <div className="font-black text-indigo-900 text-lg">{mappingSystemPlot.plotNumber}</div>
                            </div>
                            
                            <h4 className="font-bold text-gray-700 mb-3 text-sm">Available Physical Layouts:</h4>
                            <div className="space-y-2">
                                {physicalPlots.filter(p => p.status === 'AVAILABLE' && p.size === mappingSystemPlot.size).length === 0 ? (
                                    <div className="p-4 text-center border border-dashed border-gray-200 rounded-xl text-gray-500">
                                        <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                                        No available physical plots matching {mappingSystemPlot.size}sqm found.
                                    </div>
                                ) : (
                                    physicalPlots.filter(p => p.status === 'AVAILABLE' && p.size === mappingSystemPlot.size).map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleMapPlot(p.id)}
                                            className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group flex justify-between items-center bg-white"
                                        >
                                            <div>
                                                <div className="font-black text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{p.physicalPlotNumber}</div>
                                                <div className="text-xs text-gray-500 mt-1">Coordinates: {p.coordinates || 'N/A'}</div>
                                            </div>
                                            <div className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CheckCircle size={24} />
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 text-right">
                            <button 
                                onClick={() => {
                                    setShowMappingModal(false);
                                    setMappingSystemPlot(null);
                                }}
                                className="px-6 py-2.5 font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Add/Edit Modal */}
            {showAddEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <form onSubmit={handleSavePlot}>
                            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-black text-xl text-gray-900">{editingPlot ? 'Edit Plot' : 'Add New Plot'}</h3>
                                <button type="button" onClick={() => setShowAddEditModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Physical Plot Number <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.physicalPlotNumber} 
                                        onChange={e => setFormData({...formData, physicalPlotNumber: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. P1, Block A - Plot 4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Size (sqm) <span className="text-red-500">*</span></label>
                                    <input 
                                        type="number" 
                                        required 
                                        value={formData.size} 
                                        onChange={e => setFormData({...formData, size: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Is this a Corner Piece?</label>
                                    <select 
                                        value={formData.isCornerPiece ? 'Yes' : 'No'} 
                                        onChange={e => setFormData({...formData, isCornerPiece: e.target.value === 'Yes'})}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Coordinates (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={formData.coordinates} 
                                        onChange={e => setFormData({...formData, coordinates: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                        placeholder="e.g. 6.4531° N, 3.3958° E"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowAddEditModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold transition-colors">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm">Save Plot</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
