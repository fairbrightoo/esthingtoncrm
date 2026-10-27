import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
    Search, 
    Building, 
    Tag, 
    ArrowRightLeft, 
    Filter, 
    X, 
    Check, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Sparkles,
    Trash2,
    DollarSign,
    Layers
} from 'lucide-react';

interface PlotExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalSale: any; // The sale to be exchanged
    onSuccess: () => void;
}

export const PlotExchangeModal: React.FC<PlotExchangeModalProps> = ({ 
    isOpen, 
    onClose, 
    originalSale, 
    onSuccess 
}) => {
    const { token } = useAuth();
    const { addToast } = useToast();

    const [availablePlots, setAvailablePlots] = useState<any[]>([]);
    const [selectedPlotId, setSelectedPlotId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingPlots, setIsLoadingPlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Advanced Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [filterEstate, setFilterEstate] = useState('');
    const [filterPrototype, setFilterPrototype] = useState('');
    const [filterMinPrice, setFilterMinPrice] = useState('');
    const [filterMaxPrice, setFilterMaxPrice] = useState('');
    const [filterCornerPiece, setFilterCornerPiece] = useState(false);

    // Discount Code State
    const [discountInput, setDiscountInput] = useState('');
    const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
    const [appliedDiscount, setAppliedDiscount] = useState<{
        id: string;
        code: string;
        type: 'FLAT' | 'PERCENTAGE';
        value: number;
        formattedValue: string;
    } | null>(null);
    const [discountError, setDiscountError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchPlots();
            resetState();
        }
    }, [isOpen]);

    const resetState = () => {
        setSelectedPlotId('');
        setSearchTerm('');
        setShowFilters(false);
        setFilterEstate('');
        setFilterPrototype('');
        setFilterMinPrice('');
        setFilterMaxPrice('');
        setFilterCornerPiece(false);
        setDiscountInput('');
        setAppliedDiscount(null);
        setDiscountError(null);
    };

    const fetchPlots = async () => {
        setIsLoadingPlots(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await axios.get(`${baseUrl}/api/plots/available`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailablePlots(res.data);
        } catch (error) {
            console.error("Failed to load inventory for exchange", error);
            addToast("Failed to load available plots.", "error");
        } finally {
            setIsLoadingPlots(false);
        }
    };

    // Validate and Apply Discount Code
    const handleApplyDiscount = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const code = discountInput.trim().toUpperCase();
        if (!code) {
            setDiscountError("Please enter a discount code.");
            return;
        }

        setIsValidatingDiscount(true);
        setDiscountError(null);

        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await axios.get(`${baseUrl}/api/discounts/validate?code=${encodeURIComponent(code)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.valid) {
                setAppliedDiscount(res.data);
                setDiscountError(null);
                addToast(`Discount code ${res.data.code} applied (${res.data.formattedValue})!`, "success");
            }
        } catch (error: any) {
            console.error("Discount validation error:", error);
            const msg = error.response?.data?.error || "Invalid or inactive discount code.";
            setDiscountError(msg);
            setAppliedDiscount(null);
            addToast(msg, "error");
        } finally {
            setIsValidatingDiscount(false);
        }
    };

    const handleRemoveDiscount = () => {
        setAppliedDiscount(null);
        setDiscountInput('');
        setDiscountError(null);
        addToast("Discount removed.", "info");
    };

    const handleClearFilters = () => {
        setFilterEstate('');
        setFilterPrototype('');
        setFilterMinPrice('');
        setFilterMaxPrice('');
        setFilterCornerPiece(false);
    };

    const handleExchange = async () => {
        if (!selectedPlotId) {
            addToast("Please select a target plot first.", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await axios.post(`${baseUrl}/api/sales/${originalSale.id}/exchange`, {
                newPlotId: selectedPlotId,
                discountCode: appliedDiscount?.code || undefined
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { surplusStored, discountApplied } = res.data;
            let msg = `Plot exchanged successfully!`;
            if (discountApplied) {
                msg += ` (Discount ${discountApplied.code} applied)`;
            }
            if (surplusStored > 0) {
                msg += ` ₦${surplusStored.toLocaleString()} credited to Client's Equity Wallet.`;
            }
            addToast(msg, "success");

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Plot exchange error:", error);
            addToast(error.response?.data?.error || "Failed to execute exchange.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !originalSale) return null;

    // Dynamic Lists for Filters
    const availableEstates = Array.from(new Set(availablePlots.map(p => p.estate?.name).filter(Boolean))).sort();

    // Prototypes automatically load based on selected estate (or all if no estate selected)
    const availablePrototypes = Array.from(new Set(
        (filterEstate ? availablePlots.filter(p => p.estate?.name === filterEstate) : availablePlots)
            .map(p => `${p.prototype} (${p.size}sqm)`)
            .filter(Boolean)
    )).sort();

    // Active filters count
    const activeFilterCount = [
        Boolean(filterEstate),
        Boolean(filterPrototype),
        Boolean(filterMinPrice),
        Boolean(filterMaxPrice),
        filterCornerPiece
    ].filter(Boolean).length;

    // Filter available plots
    const filteredPlots = availablePlots.filter(p => {
        const matchesSearch = searchTerm.trim() === '' || 
            `${p.plotNumber} ${p.prototype} ${p.estate?.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEstate = filterEstate ? p.estate?.name === filterEstate : true;
        const matchesPrototype = filterPrototype ? `${p.prototype} (${p.size}sqm)` === filterPrototype : true;
        const matchesMinPrice = filterMinPrice ? p.price >= Number(filterMinPrice) : true;
        const matchesMaxPrice = filterMaxPrice ? p.price <= Number(filterMaxPrice) : true;
        const matchesCornerPiece = filterCornerPiece ? p.isCornerPiece === true : true;

        return matchesSearch && matchesEstate && matchesPrototype && matchesMinPrice && matchesMaxPrice && matchesCornerPiece;
    });

    const selectedPlot = availablePlots.find(p => p.id === selectedPlotId);
    const existingEquity = Number(originalSale.totalPaid || 0);

    // Calculate Financials & Discounts
    let basePrice = selectedPlot ? selectedPlot.price : 0;
    let discountDeduction = 0;
    let effectiveNewPrice = basePrice;

    if (selectedPlot && appliedDiscount) {
        if (appliedDiscount.type === 'FLAT') {
            discountDeduction = appliedDiscount.value;
            effectiveNewPrice = Math.max(0, basePrice - discountDeduction);
        } else if (appliedDiscount.type === 'PERCENTAGE') {
            discountDeduction = basePrice * (appliedDiscount.value / 100);
            effectiveNewPrice = Math.max(0, basePrice - discountDeduction);
        }
    }

    const transferredEquity = Math.min(existingEquity, effectiveNewPrice);
    const simulatedRemainingBalance = Math.max(0, effectiveNewPrice - existingEquity);
    const simulatedSurplus = Math.max(0, existingEquity - effectiveNewPrice);

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs shadow-2xl animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-100">
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
                            <ArrowRightLeft className="text-blue-200" size={20} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold leading-tight">
                                Execute Plot Exchange
                            </h2>
                            <p className="text-xs text-blue-200 mt-0.5">Transfer client equity into a new property with MD authorized terms</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                    {/* Relinquishing Plot Section */}
                    <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-4 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                                Relinquishing Plot (Original Purchase)
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                                Agreed: ₦{Number(originalSale.agreedPrice || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                            <div>
                                <h4 className="font-bold text-gray-900 text-base">
                                    {originalSale.plot?.plotNumber || originalSale.plotNumber} - {originalSale.plot?.prototype || originalSale.prototype}
                                </h4>
                                <div className="text-xs text-gray-600 flex items-center mt-1">
                                    <Building size={13} className="mr-1 text-gray-400" />
                                    <span>{originalSale.plot?.estate?.name || 'Estate'}</span>
                                    {originalSale.plot?.size && (
                                        <span className="ml-2 text-gray-400">• {originalSale.plot.size} sqm</span>
                                    )}
                                </div>
                            </div>
                            <div className="sm:text-right bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-rose-100">
                                <p className="text-[11px] text-gray-500 uppercase font-semibold">Accumulated Paid Equity</p>
                                <p className="font-black text-rose-600 text-xl tracking-tight">₦{existingEquity.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Exchange Arrow Divider */}
                    <div className="flex items-center justify-center -my-2 relative z-10">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md text-white rounded-full p-2 border-2 border-white">
                            <ArrowRightLeft size={16} />
                        </div>
                    </div>

                    {/* Target Replacement Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers size={13} className="text-blue-600" />
                                Select Replacement Property
                            </p>
                            <span className="text-xs text-gray-400 font-medium">
                                {filteredPlots.length} {filteredPlots.length === 1 ? 'plot' : 'plots'} available
                            </span>
                        </div>

                        {/* Search Bar & Filter Toggle Button */}
                        <div className="flex gap-2 mb-2.5">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by plot number, prototype or estate..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition"
                                />
                                {searchTerm && (
                                    <button 
                                        type="button" 
                                        onClick={() => setSearchTerm('')} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-2.5 border rounded-xl flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 ${
                                    showFilters || activeFilterCount > 0
                                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                                title="Filter by Estate, Prototype / Plot Size, Price Range"
                            >
                                <Filter size={15} />
                                <span className="hidden sm:inline">Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="bg-blue-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Expandable Advanced Filters Panel */}
                        {showFilters && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 mb-3 animate-fadeIn shadow-2xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Estate Filter */}
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                            Estate
                                        </label>
                                        <select
                                            className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            value={filterEstate}
                                            onChange={(e) => {
                                                const newEstate = e.target.value;
                                                setFilterEstate(newEstate);
                                                // Reset prototype if it does not exist in new estate
                                                setFilterPrototype('');
                                            }}
                                        >
                                            <option value="">All Estates ({availableEstates.length})</option>
                                            {availableEstates.map(estate => (
                                                <option key={estate} value={estate}>{estate}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Prototype / Plot Size (Dynamic based on selected estate) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                                Prototype (Plot Size)
                                            </label>
                                            {filterEstate && (
                                                <span className="text-[10px] text-blue-600 font-semibold">Scoped to Estate</span>
                                            )}
                                        </div>
                                        <select
                                            className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            value={filterPrototype}
                                            onChange={(e) => setFilterPrototype(e.target.value)}
                                        >
                                            <option value="">All Prototypes & Sizes ({availablePrototypes.length})</option>
                                            {availablePrototypes.map(proto => (
                                                <option key={proto} value={proto}>{proto}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Price Range Filter */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                            Min Price (₦)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 5,000,000"
                                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            value={filterMinPrice}
                                            onChange={(e) => setFilterMinPrice(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                            Max Price (₦)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="No limit"
                                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            value={filterMaxPrice}
                                            onChange={(e) => setFilterMaxPrice(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Corner Piece Checkbox and Clear Filters */}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                            checked={filterCornerPiece}
                                            onChange={(e) => setFilterCornerPiece(e.target.checked)}
                                        />
                                        <span className="text-xs text-gray-700 font-medium">Corner Piece Only</span>
                                    </label>
                                    
                                    {activeFilterCount > 0 && (
                                        <button 
                                            type="button" 
                                            onClick={handleClearFilters}
                                            className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition"
                                        >
                                            <Trash2 size={12} /> Clear Filters
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Plots List */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden h-44 sm:h-48 overflow-y-auto bg-gray-50 divide-y divide-gray-100 custom-scrollbar">
                            {isLoadingPlots ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-xs gap-2">
                                    <Loader2 size={16} className="animate-spin text-blue-600" />
                                    <span>Loading available inventory...</span>
                                </div>
                            ) : filteredPlots.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs p-4 text-center">
                                    <AlertCircle size={20} className="mb-1 text-gray-300" />
                                    <span>No available plots matching your criteria.</span>
                                    {activeFilterCount > 0 && (
                                        <button 
                                            type="button" 
                                            onClick={handleClearFilters} 
                                            className="text-blue-600 font-semibold mt-1 hover:underline text-xs"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredPlots.map(plot => {
                                    const isSelected = selectedPlotId === plot.id;
                                    return (
                                        <div 
                                            key={plot.id} 
                                            onClick={() => setSelectedPlotId(plot.id)}
                                            className={`p-3 cursor-pointer flex items-center justify-between transition-all ${
                                                isSelected 
                                                    ? 'bg-blue-50/90 border-l-4 border-blue-600 shadow-2xs' 
                                                    : 'hover:bg-white bg-gray-50/50'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                                                    isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'
                                                }`}>
                                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-800 text-xs sm:text-sm">
                                                            {plot.plotNumber} - {plot.prototype}
                                                        </p>
                                                        {plot.isCornerPiece && (
                                                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                                                CP
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {plot.estate?.name || 'Estate'} {plot.size ? `• ${plot.size} sqm` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-blue-900 text-xs sm:text-sm">
                                                    ₦{Number(plot.price || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* MD Authorized Discount Code Section */}
                    {selectedPlot && (
                        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles size={13} className="text-purple-600" />
                                    MD Authorized Discount on Replacement Plot
                                </span>
                                <span className="text-[11px] text-purple-600 font-medium">Optional</span>
                            </div>

                            {appliedDiscount ? (
                                <div className="bg-white border border-purple-200 rounded-lg p-2.5 flex items-center justify-between shadow-2xs">
                                    <div className="flex items-center space-x-2">
                                        <div className="p-1 bg-green-100 text-green-700 rounded-md">
                                            <CheckCircle2 size={16} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-xs text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded">
                                                    {appliedDiscount.code}
                                                </span>
                                                <span className="text-xs font-bold text-green-700">
                                                    {appliedDiscount.formattedValue}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Deduction of ₦{discountDeduction.toLocaleString()} applied to replacement property
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveDiscount}
                                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <form onSubmit={handleApplyDiscount} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="e.g. DSC-8X9P or ESTH-XXXX"
                                                value={discountInput}
                                                onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                                                className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-xs uppercase font-mono tracking-wider outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isValidatingDiscount || !discountInput.trim()}
                                            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                                        >
                                            {isValidatingDiscount ? (
                                                <Loader2 size={13} className="animate-spin" />
                                            ) : (
                                                <Tag size={13} />
                                            )}
                                            <span>Apply Code</span>
                                        </button>
                                    </form>
                                    {discountError && (
                                        <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                                            <AlertCircle size={12} /> {discountError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Financial Projection & Audit Summary */}
                    {selectedPlot && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 animate-fadeIn shadow-2xs">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm uppercase tracking-wide border-b border-slate-200 pb-2 flex items-center justify-between">
                                <span>Exchange Financial Projection</span>
                                <span className="text-[11px] text-gray-500 font-normal normal-case">Live computation</span>
                            </h4>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between items-center text-gray-600">
                                    <span>Replacement Plot List Price:</span>
                                    <span className="font-medium text-gray-800">
                                        ₦{basePrice.toLocaleString()}
                                    </span>
                                </div>

                                {appliedDiscount && (
                                    <div className="flex justify-between items-center text-green-700 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Tag size={11} /> MD Authorized Discount ({appliedDiscount.code}):
                                        </span>
                                        <span>- ₦{discountDeduction.toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-gray-800 font-bold pt-1 border-t border-slate-200">
                                    <span>Final Agreed Replacement Price:</span>
                                    <span className="text-blue-900">₦{effectiveNewPrice.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center text-rose-600 font-medium pt-1">
                                    <span>Transferred Client Paid Equity:</span>
                                    <span>- ₦{transferredEquity.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Net Settlement Outcome */}
                            {simulatedRemainingBalance > 0 && (
                                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                                    <div>
                                        <span className="text-xs font-bold text-blue-900 block">Remaining Balance to Pay:</span>
                                        <span className="text-[10px] text-blue-700">Client will continue installments toward this balance.</span>
                                    </div>
                                    <span className="text-base sm:text-lg font-black text-blue-700 tracking-tight">
                                        ₦{simulatedRemainingBalance.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            
                            {simulatedSurplus > 0 && (
                                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                                    <div>
                                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                                            <Tag size={12} /> Equity Surplus Credit:
                                        </span>
                                        <span className="text-[10px] text-emerald-700">Auto-credited to Client's Virtual Equity Wallet for future plots.</span>
                                    </div>
                                    <span className="text-base sm:text-lg font-black text-emerald-700 tracking-tight">
                                        + ₦{simulatedSurplus.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {simulatedRemainingBalance === 0 && simulatedSurplus === 0 && (
                                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                        Even Exchange (100% Fully Paid)
                                    </span>
                                    <span className="text-xs font-bold text-emerald-700">
                                        ₦0 Balance Remaining
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end space-x-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200/60 rounded-xl text-xs sm:text-sm font-medium transition"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        disabled={!selectedPlotId || isSubmitting}
                        onClick={handleExchange}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2 transition active:scale-95"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Executing Exchange...</span>
                            </>
                        ) : (
                            <>
                                <ArrowRightLeft size={15} />
                                <span>Confirm Plot Exchange</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
