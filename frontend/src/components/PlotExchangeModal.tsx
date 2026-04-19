import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Search, Building, Tag, ArrowRightLeft } from 'lucide-react';

interface PlotExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalSale: any; // The sale to be exchanged
    onSuccess: () => void;
}

export const PlotExchangeModal = ({ isOpen, onClose, originalSale, onSuccess }: PlotExchangeModalProps) => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [availablePlots, setAvailablePlots] = useState<any[]>([]);
    const [selectedPlotId, setSelectedPlotId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPlots();
        }
    }, [isOpen]);

    const fetchPlots = async () => {
        try {
            const res = await axios.get(`http://localhost:3000/api/plots/available`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailablePlots(res.data);
        } catch (error) {
            console.error("Failed to load inventory for exchange", error);
        }
    };

    const handleExchange = async () => {
        if (!selectedPlotId) {
            addToast("Please select a target plot first.", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await axios.post(`http://localhost:3000/api/sales/${originalSale.id}/exchange`, {
                newPlotId: selectedPlotId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { surplusStored } = res.data;
            if (surplusStored > 0) {
                addToast(`Exchange completed! ₦${surplusStored.toLocaleString()} loaded into Client's Equity Wallet.`, "success");
            } else {
                addToast(`Plot Exchanged successfully!`, "success");
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to execute exchange.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !originalSale) return null;

    const filteredPlots = availablePlots.filter(p => 
        p.plotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.estate.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedPlot = availablePlots.find(p => p.id === selectedPlotId);
    const existingEquity = originalSale.totalPaid;
    
    let simulatedRemainingBalance = 0;
    let simulatedSurplus = 0;

    if (selectedPlot) {
        if (selectedPlot.price <= existingEquity) {
            simulatedSurplus = existingEquity - selectedPlot.price;
        } else {
            simulatedRemainingBalance = selectedPlot.price - existingEquity;
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm shadow-2xl">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-100">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold flex items-center text-gray-800">
                            <ArrowRightLeft className="mr-2 text-blue-600" size={20} />
                            Execute Plot Exchange
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Transfer equity from an abandoned plot into a new property.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:bg-white hover:shadow-sm p-2 rounded-lg transition-all">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Origin Section */}
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2">Relinquishing Plot</p>
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg">{originalSale.plot.plotNumber} - {originalSale.plot.prototype}</h4>
                                <div className="text-xs text-gray-600 flex items-center mt-1">
                                    <Building size={12} className="mr-1" /> {originalSale.plot.estate.name}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase">Paid Equity</p>
                                <p className="font-bold text-red-600 text-xl">₦{existingEquity.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center -my-3 relative z-10">
                        <div className="bg-white border shadow-sm rounded-full p-2 text-blue-600">
                            <ArrowRightLeft size={16} />
                        </div>
                    </div>

                    {/* Target Selection */}
                    <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">Select Replacement Property</p>
                        <div className="relative mb-3">
                            <Search className="absolute pt-[2px] left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search inventory by plot number or estate..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                        
                        <div className="border border-gray-100 rounded-xl overflow-hidden h-48 overflow-y-auto bg-gray-50">
                            {filteredPlots.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No available plots found.</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filteredPlots.map(plot => (
                                        <div 
                                            key={plot.id} 
                                            onClick={() => setSelectedPlotId(plot.id)}
                                            className={`p-3 cursor-pointer flex justify-between items-center transition-colors ${selectedPlotId === plot.id ? 'bg-blue-50 border-l-4 border-blue-600 pl-2' : 'hover:bg-gray-100 pl-3'}`}
                                        >
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{plot.plotNumber} - {plot.prototype}</p>
                                                <p className="text-xs text-gray-500">{plot.estate.name}</p>
                                            </div>
                                            <p className="font-bold text-blue-900 text-sm">₦{plot.price.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    {selectedPlot && (
                         <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                            <h4 className="font-bold text-gray-900 text-sm mb-3 border-b border-green-200 pb-2">Financial Projection</h4>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-600">New Plot Price:</span>
                                <span className="font-medium text-gray-800">₦{selectedPlot.price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-gray-600">Transferred Equity:</span>
                                <span className="font-medium text-red-600">- ₦{Math.min(existingEquity, selectedPlot.price).toLocaleString()}</span>
                            </div>

                            {simulatedRemainingBalance > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t border-green-200">
                                    <span className="text-sm font-bold text-gray-800">Remaining Balance to Pay:</span>
                                    <span className="text-lg font-bold text-blue-600">₦{simulatedRemainingBalance.toLocaleString()}</span>
                                </div>
                            )}
                            
                            {simulatedSurplus > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t border-green-200">
                                    <span className="text-sm font-bold text-gray-800 flex items-center"><Tag size={12} className="mr-1"/> Equity Surplus (To Virtual Wallet):</span>
                                    <span className="text-lg font-bold text-green-600">+ ₦{simulatedSurplus.toLocaleString()}</span>
                                </div>
                            )}
                         </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        disabled={!selectedPlotId || isSubmitting}
                        onClick={handleExchange}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center"
                    >
                        {isSubmitting ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"/> Processing...</>
                        ) : 'Confirm Exchange'}
                    </button>
                </div>
            </div>
        </div>
    );
};
