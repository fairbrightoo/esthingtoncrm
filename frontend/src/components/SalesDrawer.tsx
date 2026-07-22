import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Tag, CreditCard, Plus, Building, MapPin, Clock } from 'lucide-react';

interface Plot {
    id: string;
    plotNumber: string;
    prototype: string;
    size: number;
    price: number;
    estate: {
        name: string;
        location: string;
        cornerPiecePrice: number;
    };
    isCornerPiece: boolean;
}

interface Sale {
    id: string;
    plot: Plot;
    isCornerPiece: boolean;
    agreedPrice: number;
    totalPaid: number;
    status: string;
    payments: Payment[];
    createdAt: string;
}

interface Payment {
    id: string;
    amount: number;
    date: string;
    method: string;
    reference?: string;
    status: string;
    proofOfPaymentUrl?: string;
    rejectionReason?: string;
}

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { ReceiptTemplate } from './ReceiptTemplate';
import { OfficialDocumentRenderer } from './OfficialDocumentRenderer';
import { FileText, ArrowRightLeft } from 'lucide-react';
import { PlotExchangeModal } from './PlotExchangeModal';

// ... (keep existing types)

export const SalesDrawer = ({ leadId, onLeadUpdate }: { leadId: string; onLeadUpdate?: () => void }) => {
    const { token, user } = useAuth();
    // ... (keep existing hooks)

    // Receipt Printing Logic
    const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt-${selectedPaymentForReceipt?.id || 'New'}`,
    });

    const triggerPrint = (payment: any) => {
        setSelectedPaymentForReceipt(payment);
        // Timeout to allow state to update and render the hidden receipt before printing
        setTimeout(() => {
            handlePrint();
        }, 100);
    };
    const { addToast } = useToast();
    const [sales, setSales] = useState<Sale[]>([]);
    const [plots, setPlots] = useState<Plot[]>([]);

    // UI States
    const [viewState, setViewState] = useState<'LIST' | 'NEW_SALE' | 'NEW_PAYMENT'>('LIST');
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [documentToPrint, setDocumentToPrint] = useState<{sale: any, type: 'OFFER'|'PROVISIONAL_ALLOCATION'|'FINAL_ALLOCATION'} | null>(null);
    const [receiptModal, setReceiptModal] = useState<{isOpen: boolean, url: string | null, isPdf: boolean}>({
        isOpen: false, url: null, isPdf: false
    });

    // Plot Exchange Component State
    const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
    const [saleToExchange, setSaleToExchange] = useState<any>(null);

    // Refund Logic
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [saleForRefund, setSaleForRefund] = useState<any>(null);
    const [refundReason, setRefundReason] = useState('');
    const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

    // Cancel Offer Logic
    const [saleToCancel, setSaleToCancel] = useState<string | null>(null);
    const [isCancellingOffer, setIsCancellingOffer] = useState(false);

    // Form: New Sale
    const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
    const [selectedPlotId, setSelectedPlotId] = useState('');
    const [marketerId, setMarketerId] = useState('');
    const [branchUsers, setBranchUsers] = useState<any[]>([]);
    const [plotSearchQuery, setPlotSearchQuery] = useState('');
    const [isPlotDropdownOpen, setIsPlotDropdownOpen] = useState(false);
    
    // Purchase Specific Document Details
    const [nameOnDocument, setNameOnDocument] = useState('');
    const [phoneOnDocument, setPhoneOnDocument] = useState('');
    const [addressOnDocument, setAddressOnDocument] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [discountCode, setDiscountCode] = useState('');

    // Form: New Payment
    const [paymentAmount, setPaymentAmount] = useState('');
    const [virtualLoanAmount, setVirtualLoanAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
    const [paymentRef, setPaymentRef] = useState('');
    const [accountPaidTo, setAccountPaidTo] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [corporateAccounts, setCorporateAccounts] = useState<any[]>([]);
    const [proofFiles, setProofFiles] = useState<File[]>([]);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    useEffect(() => {
        if (viewState === 'LIST') fetchSales();
        if (viewState === 'NEW_SALE') {
            fetchPlots();
            if (user?.role !== 'MARKETER') {
                fetchBranchUsers();
            }
        }
        if (viewState === 'NEW_PAYMENT' && corporateAccounts.length === 0) fetchCorporateAccounts();
    }, [viewState, leadId]);

    const fetchBranchUsers = async () => {
        try {
            const effectiveCompanyId = user?.companyId || user?.company?.id;
            const effectiveBranchId = user?.branchId || user?.branch?.id;
            if (!effectiveCompanyId || !effectiveBranchId) return;
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${effectiveCompanyId}/branches/${effectiveBranchId}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranchUsers(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCorporateAccounts = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/corporate-bank-accounts/global`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCorporateAccounts(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSales = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/${leadId}/sales`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSales(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchPlots = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/plots/available`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPlots(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateSale = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlotId || isSubmittingPurchase) return;
        if (!termsAccepted) {
            addToast("Client must accept Terms & Conditions", "warning");
            return;
        }
        setIsSubmittingPurchase(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sales`, {
                leadId,
                plotId: selectedPlotId,
                isCornerPiece: plots.find(p => p.id === selectedPlotId)?.isCornerPiece || false,
                nameOnDocument,
                phoneOnDocument,
                addressOnDocument,
                termsAccepted,
                discountCode,
                marketerId
            }, { headers: { Authorization: `Bearer ${token}` } });

            addToast("Purchase recorded successfully!", "success");
            setViewState('LIST');
            fetchSales();
            resetForms();
        } catch (error: any) {
            console.error("Failed to record purchase", error);
            const errMsg = error.response?.data?.error || "Failed to record purchase";
            addToast(errMsg, "error");
        } finally {
            setIsSubmittingPurchase(false);
        }
    };

    const confirmCancelOffer = async () => {
        if (!saleToCancel) return;
        setIsCancellingOffer(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sales/${saleToCancel}/cancel`, {}, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            addToast("Offer cancelled successfully.", "success");
            fetchSales();
            setSaleToCancel(null);
        } catch (error: any) {
            console.error("Failed to cancel offer", error);
            addToast(error.response?.data?.error || "Failed to cancel offer", "error");
        } finally {
            setIsCancellingOffer(false);
        }
    };

    const handleRefundRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingRefund(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/refunds`, {
                saleId: saleForRefund.id,
                reason: refundReason
            }, { headers: { Authorization: `Bearer ${token}` } });
            addToast("Refund request submitted! Awaiting Branch Admin review.", "success");
            setIsRefundModalOpen(false);
            setRefundReason('');
            fetchSales();
            if (onLeadUpdate) onLeadUpdate();
        } catch(error: any) {
            addToast(error.response?.data?.error || "Failed to request refund", "error");
        } finally {
            setIsSubmittingRefund(false);
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSaleId || !paymentAmount || isSubmittingPayment) return;
        setIsSubmittingPayment(true);
        try {
            if (paymentMethod === 'EQUITY_WALLET') {
                // Ignore File Upload rules for Equity Wallet drawdown
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sales/${selectedSaleId}/payments`, {
                    amount: paymentAmount,
                    method: 'EQUITY_WALLET',
                    reference: paymentRef,
                    userId: user?.id,
                    accountPaidTo: accountPaidTo || undefined,
                    notes: paymentNotes || undefined,
                    virtualLoanAmount: virtualLoanAmount || undefined
                }, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
            } else {
                if (proofFiles.length === 0) {
                    addToast("Please upload a proof of payment receipt.", "error");
                    return;
                }
                const formData = new FormData();
                formData.append('amount', paymentAmount);
                formData.append('method', paymentMethod);
                formData.append('reference', paymentRef);
                formData.append('userId', user?.id || '');
                if (accountPaidTo) formData.append('accountPaidTo', accountPaidTo);
                if (paymentNotes) formData.append('notes', paymentNotes);
                if (virtualLoanAmount) formData.append('virtualLoanAmount', virtualLoanAmount);
                proofFiles.forEach(file => {
                    formData.append('proofs', file);
                });

                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sales/${selectedSaleId}/payments`, formData, { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    } 
                });
            }

            addToast(paymentMethod === 'EQUITY_WALLET' ? "Equity successfully drawn and approved!" : "Payment recorded and awaits Managing Director approval!", "success");
            setViewState('LIST');
            fetchSales();
            resetForms();
            if (onLeadUpdate) onLeadUpdate();
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to record payment", "error");
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const resetForms = () => {
        setSelectedPlotId('');
        setSelectedPlotId('');
        setNameOnDocument('');
        setPhoneOnDocument('');
        setAddressOnDocument('');
        setTermsAccepted(false);
        setDiscountCode('');
        setMarketerId('');
        setPaymentAmount('');
        setPaymentMethod('TRANSFER');
        setVirtualLoanAmount('');
        setPaymentRef('');
        setPaymentNotes('');
        setProofFiles([]);
        setSelectedSaleId(null);
    };

    const getSelectedPlotPrice = () => {
        const p = plots.find(x => x.id === selectedPlotId);
        if (!p) return 0;
        return p.price;
    };

    // --- RENDERERS ---

    if (documentToPrint) {
        return (
            <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
                 <OfficialDocumentRenderer 
                      sale={documentToPrint.sale} 
                      documentType={documentToPrint.type} 
                      onClose={() => setDocumentToPrint(null)} 
                 />
            </div>
        );
    }

    if (viewState === 'NEW_SALE') {
        const price = getSelectedPlotPrice();
        return (
            <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-gray-800">New Purchase</h3>
                    <button onClick={() => setViewState('LIST')} className="text-sm text-gray-500">Cancel</button>
                </div>
                <form onSubmit={handleCreateSale} className="space-y-4 flex-1">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Property</label>
                        
                        {/* Searchable Dropdown Button */}
                        <div 
                            className="w-full border rounded px-3 py-3 outline-none focus-within:ring-2 focus-within:ring-blue-500 bg-white flex justify-between items-center cursor-pointer"
                            onClick={() => setIsPlotDropdownOpen(!isPlotDropdownOpen)}
                        >
                            <span className={`truncate ${!selectedPlotId ? 'text-gray-400' : 'text-gray-900'}`}>
                                {selectedPlotId 
                                    ? (() => { const p = plots.find(x => x.id === selectedPlotId); return p ? `${p.plotNumber} - ${p.prototype} in ${p.estate.name}` : 'Select a plot'; })() 
                                    : '-- Search & Choose Plot --'}
                            </span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isPlotDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>

                        {/* Searchable Dropdown Menu */}
                        {isPlotDropdownOpen && (
                            <>
                                {/* Invisible backdrop to close dropdown when clicking outside */}
                                <div className="fixed inset-0 z-40" onClick={() => setIsPlotDropdownOpen(false)}></div>
                                
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                                    <div className="sticky top-0 bg-white p-2 border-b z-10">
                                        <input 
                                            type="text" 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                                            placeholder="Search by plot number, prototype or estate..."
                                            value={plotSearchQuery}
                                            onChange={(e) => setPlotSearchQuery(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="p-1">
                                        {plots.filter(p => `${p.plotNumber} ${p.prototype} ${p.estate.name}`.toLowerCase().includes(plotSearchQuery.toLowerCase())).length === 0 ? (
                                            <div className="p-4 text-sm text-gray-500 text-center flex flex-col items-center">
                                                <Tag size={20} className="text-gray-300 mb-2" />
                                                No properties matched your search.
                                            </div>
                                        ) : (
                                            plots.filter(p => `${p.plotNumber} ${p.prototype} ${p.estate.name}`.toLowerCase().includes(plotSearchQuery.toLowerCase())).map(p => (
                                                <div 
                                                    key={p.id} 
                                                    className={`p-2 hover:bg-blue-50 cursor-pointer rounded-md text-sm transition-colors ${selectedPlotId === p.id ? 'bg-blue-50 text-blue-700 border-blue-100 border' : 'text-gray-700 border border-transparent'}`}
                                                    onClick={() => {
                                                        setSelectedPlotId(p.id);
                                                        setIsPlotDropdownOpen(false);
                                                        setPlotSearchQuery('');
                                                    }}
                                                >
                                                    <div className={`font-bold ${selectedPlotId === p.id ? 'text-blue-700' : 'text-gray-900'}`}>{p.plotNumber}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{p.prototype} <span className="mx-1">•</span> {p.estate.name}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                        {/* Hidden input to strictly satisfy HTML5 'required' attribute on form submit */}
                        <input type="text" className="h-0 w-0 absolute opacity-0 pointer-events-none" required value={selectedPlotId} onChange={() => {}} />
                    </div>

                    {(() => {
                        const p = plots.find(x => x.id === selectedPlotId);
                        if (p && p.isCornerPiece) {
                            return (
                                <div className="flex items-center p-3 border rounded bg-indigo-50 border-indigo-200 text-indigo-700">
                                    <span className="text-sm font-semibold">Corner Piece Selected: +₦{(p.estate.cornerPiecePrice || 1000000).toLocaleString()} included in property price</span>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="pt-2 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Document Details (Optional)</h4>
                        <p className="text-xs text-gray-500 mb-3">If left blank, the client's primary profile data will be used on generating the Offer and Allocation Letters.</p>
                        <div className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Name on Document"
                                    value={nameOnDocument}
                                    onChange={(e) => setNameOnDocument(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                            </div>
                            <div>
                                <input
                                    type="tel"
                                    placeholder="Phone on Document"
                                    value={phoneOnDocument}
                                    onChange={(e) => setPhoneOnDocument(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                            </div>
                            <div>
                                <textarea
                                    placeholder="Address on Document"
                                    value={addressOnDocument}
                                    onChange={(e) => setAddressOnDocument(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    {user?.role !== 'MARKETER' && (
                        <div className="pt-2 border-t border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 mb-1">Credit Commission To:</h4>
                            <p className="text-xs text-gray-500 mb-2">Leave blank to use the lead's default owner.</p>
                            <select
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={marketerId}
                                onChange={(e) => setMarketerId(e.target.value)}
                            >
                                <option value="">-- Lead's Default Owner --</option>
                                {branchUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 mb-4">
                        <div className="flex items-start space-x-3 p-3 border border-orange-200 bg-orange-50 rounded">
                            <input
                                type="checkbox"
                                id="terms"
                                className="w-5 h-5 text-orange-600 rounded mt-0.5"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                            />
                            <label htmlFor="terms" className="text-sm text-gray-800 leading-tight">
                                I confirm the client has read and accepted the Terms & Conditions of this purchase.
                            </label>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Apply Discount (MD Authorized)</h4>
                        <input
                            type="text"
                            placeholder="e.g. ESTH-X9B2"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono placeholder:text-gray-300 uppercase tracking-widest"
                        />
                    </div>

                    {selectedPlotId && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                            <p className="text-sm text-blue-600 mb-1">Total Agreed Price Before Discount</p>
                            <p className="text-2xl font-bold text-blue-800">₦{price.toLocaleString()}</p>
                            {discountCode && <p className="text-xs text-orange-600 mt-1 font-medium">Discount code will be validated dynamically on confirmation.</p>}
                        </div>
                    )}

                    <button disabled={!selectedPlotId || isSubmittingPurchase} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 mt-auto">
                        {isSubmittingPurchase ? 'Confirming...' : 'Confirm Purchase'}
                    </button>
                </form>
            </div>
        );
    }

    if (viewState === 'NEW_PAYMENT') {
        const sale = sales.find(s => s.id === selectedSaleId);
        if (!sale) return null;
        
        const balance = sale.agreedPrice - sale.totalPaid;
        const originalPrice = (sale.plot?.price || sale.agreedPrice);
        const discountAmount = originalPrice - sale.agreedPrice;

        return (
            <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-gray-800">Record Payment</h3>
                    <button onClick={() => setViewState('LIST')} className="text-sm text-gray-500">Cancel</button>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100">
                    {discountAmount > 0 && (
                        <div className="mb-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                ₦{discountAmount.toLocaleString()} Discount Applied
                            </span>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 mb-2">
                        <div className="flex flex-col justify-end">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Agreed Price</p>
                            {discountAmount > 0 && (
                                <p className="text-sm text-gray-400 line-through -mb-0.5" style={{ textDecorationThickness: '2px', textDecorationColor: '#f87171' }}>
                                    ₦{originalPrice.toLocaleString()}
                                </p>
                            )}
                            <p className="font-bold text-gray-800 text-lg">₦{sale.agreedPrice.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col justify-end">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Paid</p>
                            <p className="font-bold text-blue-600 text-lg">₦{sale.totalPaid.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-blue-200">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-blue-900">Outstanding Balance</p>
                            <p className="text-lg font-bold text-blue-900">₦{balance.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleRecordPayment} className="space-y-4 flex-1">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                        <input
                            type="number" required
                            max={balance} // Prevent overpayment
                            className="w-full border rounded px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                            placeholder={`Max: ${balance}`}
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()} // Prevent accidental mouse scroll decrement
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter amount being paid now.</p>
                    </div>
                    {paymentMethod !== 'EQUITY_WALLET' && (
                        <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg">
                            <label className="block text-sm font-medium text-orange-800 mb-1 flex items-center justify-between">
                                Marketer Virtual Loan (₦)
                                <span className="text-xs bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full font-bold">
                                    Max: ₦{((Number(paymentAmount) || 0) * ((sale?.marketerCommissionRate || sale?.marketer?.commissionRate || 5) / 100)).toLocaleString()}
                                </span>
                            </label>
                            <input
                                type="number"
                                max={(Number(paymentAmount) || 0) * ((sale?.marketerCommissionRate || sale?.marketer?.commissionRate || 5) / 100)}
                                className="w-full border border-orange-200 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                placeholder="Sacrifice commission to top-up"
                                value={virtualLoanAmount}
                                onChange={(e) => setVirtualLoanAmount(e.target.value)}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            />
                            <p className="text-[10px] text-orange-600 mt-1 font-medium leading-tight">
                                This amount will be credited to the property but deducted directly from your net commission.
                            </p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        <select
                            className="w-full border rounded px-3 py-3"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <option value="TRANSFER">Bank Transfer</option>
                            <option value="CASH">Cash</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="POS">POS</option>
                            <option value="EQUITY_WALLET">Client Virtual Equity Wallet</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Receipt No.</label>
                        <input
                            className="w-full border rounded px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional ref"
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Notes (Optional)</label>
                        <textarea
                            className="w-full border rounded px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="E.g. This N50m receipt covers 5 separate N10m deposits for plots 1-5"
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                    {paymentMethod !== 'EQUITY_WALLET' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Paid To</label>
                            <select
                                required
                                className="w-full border rounded px-3 py-3"
                                value={accountPaidTo}
                                onChange={(e) => setAccountPaidTo(e.target.value)}
                            >
                                <option value="" disabled>-- Select Corporate Account --</option>
                                {corporateAccounts.map((acc, i) => (
                                    <option key={i} value={`${acc.companyName} - ${acc.bankName} - ${acc.accountNumber}`}>
                                        {acc.companyName} | {acc.bankName} - {acc.accountNumber}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {paymentMethod !== 'EQUITY_WALLET' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Proof of Payment (Image/PDF)</label>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                multiple
                                required
                                className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                onChange={(e) => {
                                    if(e.target.files) {
                                        setProofFiles(Array.from(e.target.files));
                                    }
                                }}
                            />
                            {proofFiles.length > 0 && (
                                <p className="text-xs text-green-600 mt-1 font-medium">{proofFiles.length} file(s) selected</p>
                            )}
                        </div>
                    )}
                    <button disabled={isSubmittingPayment} type="submit" className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 mt-auto disabled:opacity-50">
                        {isSubmittingPayment ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {sales.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <Tag size={32} />
                    </div>
                    <h3 className="text-gray-900 font-bold mb-2">No active sales</h3>
                    <p className="text-gray-500 text-sm mb-6">This lead has not purchased any property yet.</p>
                    <button onClick={() => setViewState('NEW_SALE')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm">
                        Start New Sale
                    </button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-gray-700">Property Portfolio</h3>
                        <button onClick={() => setViewState('NEW_SALE')} className="text-sm text-blue-600 flex items-center hover:underline"><Plus size={14} className="mr-1" /> Add Another</button>
                    </div>

                    {sales.map(sale => {
                        const progress = Math.min((sale.totalPaid / sale.agreedPrice) * 100, 100);
                        const isInactive = sale.status === 'CANCELLED' || sale.status === 'EXPIRED';
                        const statusStyle = sale.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                            isInactive ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';

                        let daysLeftText = '';
                        if (sale.status === 'ONGOING' && Number(sale.totalPaid) === 0) {
                            const diffTime = Math.abs(new Date().getTime() - new Date(sale.createdAt).getTime());
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            const timeLeft = 7 - diffDays;
                            
                            if (timeLeft > 1) {
                                daysLeftText = `Expires in ${timeLeft} days`;
                            } else if (timeLeft === 1) {
                                daysLeftText = `Expires Tomorrow`;
                            } else if (timeLeft <= 0) {
                                daysLeftText = `Expires Today`;
                            }
                        }
                        
                        return (
                            <div key={sale.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${isInactive ? 'opacity-60 grayscale' : ''}`}>
                                {/* Header */}
                                <div className="p-4 border-b bg-gray-50 border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{sale.plot.prototype} {sale.isCornerPiece && <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded ml-1 uppercase font-bold">Corner Piece</span>}</h4>
                                            <div className="flex items-center text-xs text-gray-500 mt-1">
                                                <Building size={12} className="mr-1" /> {sale.plot.estate.name}
                                                <span className="mx-1">•</span>
                                                <MapPin size={12} className="mr-1" /> {sale.plot.estate.location}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}>
                                                {sale.status}
                                            </div>
                                            {daysLeftText && (
                                                <div className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center bg-red-50 px-1.5 py-0.5 rounded">
                                                    <Clock size={10} className="mr-1" /> {daysLeftText}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Progress */}
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs font-medium mb-1.5">
                                            <span className="text-gray-600">Paid: ₦{sale.totalPaid.toLocaleString()}</span>
                                            <span className="text-gray-900">Total: ₦{sale.agreedPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full ${sale.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-3 bg-white flex flex-wrap gap-2 items-center border-b">
                                    <button
                                        onClick={() => setDocumentToPrint({ sale, type: 'OFFER' })}
                                        className="text-[11px] bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded font-medium hover:bg-indigo-100 flex items-center shadow-sm"
                                    >
                                        <FileText size={12} className="mr-1" /> Offer Letter
                                    </button>
                                    
                                    {sale.totalPaid > 0 && sale.totalPaid < sale.agreedPrice && (
                                        <button
                                            onClick={() => setDocumentToPrint({ sale, type: 'PROVISIONAL_ALLOCATION' })}
                                            className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded font-medium hover:bg-blue-100 flex items-center shadow-sm"
                                        >
                                            <FileText size={12} className="mr-1" /> Provisional Allocation
                                        </button>
                                    )}

                                    {sale.totalPaid >= sale.agreedPrice && sale.totalPaid > 0 && (
                                        <button
                                            onClick={() => setDocumentToPrint({ sale, type: 'FINAL_ALLOCATION' })}
                                            className="text-[11px] bg-green-50 text-green-700 px-2.5 py-1.5 rounded font-medium hover:bg-green-100 flex items-center shadow-sm"
                                        >
                                            <FileText size={12} className="mr-1" /> Final Allocation
                                        </button>
                                    )}

                                    <div className="flex-1"></div>

                                    {['SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGING_DIRECTOR'].includes(user?.role) && sale.status !== 'EXCHANGED' && !isInactive && (
                                        <button
                                            onClick={() => { setSaleToExchange(sale); setIsExchangeModalOpen(true); }}
                                            className="text-[11px] bg-red-50 text-red-700 px-3 py-1.5 rounded font-bold hover:bg-red-100 flex items-center shadow-sm border border-red-100"
                                        >
                                            <ArrowRightLeft size={12} className="mr-1.5" /> Exchange Plot
                                        </button>
                                    )}

                                    {sale.totalPaid > 0 && !['EXCHANGED', 'REFUNDED', 'REFUND_IN_PROGRESS', 'REFUND_REQUESTED'].includes(sale.status) && !isInactive && (
                                        <button
                                            onClick={() => { setSaleForRefund(sale); setIsRefundModalOpen(true); }}
                                            className="text-[11px] bg-orange-50 text-orange-700 px-3 py-1.5 rounded font-bold hover:bg-orange-100 flex items-center shadow-sm border border-orange-100"
                                        >
                                            Refund Request
                                        </button>
                                    )}

                                    {sale.totalPaid === 0 && sale.status === 'ONGOING' && (
                                        <button
                                            onClick={() => setSaleToCancel(sale.id)}
                                            className="text-[11px] bg-red-50 text-red-700 px-3 py-1.5 rounded font-bold hover:bg-red-100 flex items-center shadow-sm border border-red-100"
                                        >
                                            Cancel Offer
                                        </button>
                                    )}

                                    {sale.status === 'REFUND_REQUESTED' && (
                                        <span className="text-[11px] bg-orange-100 text-orange-800 px-3 py-1.5 rounded font-bold border border-orange-200 shadow-sm ml-2">
                                            Refund Pending
                                        </span>
                                    )}

                                    {sale.status === 'REFUND_IN_PROGRESS' && (
                                        <span className="text-[11px] bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded font-bold border border-yellow-200 shadow-sm ml-2">
                                            Awaiting Disbursement
                                        </span>
                                    )}

                                    <button
                                        disabled={isInactive || sale.status === 'COMPLETED' || sale.status === 'EXCHANGED'}
                                        onClick={() => { setSelectedSaleId(sale.id); setViewState('NEW_PAYMENT'); }}
                                        className="text-[11px] bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded font-bold hover:bg-emerald-100 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-emerald-100"
                                    >
                                        <CreditCard size={12} className="mr-1.5" /> Record Payment
                                    </button>
                                </div>

                                {/* History */}
                                <div className="bg-gray-50/50 p-3">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment History</p>
                                    <div className="space-y-2">
                                        {sale.payments.length === 0 ? <p className="text-xs text-gray-400 italic">No payments recorded yet.</p> :
                                            sale.payments.map(p => (
                                                <div key={p.id} className="flex justify-between text-xs border-b border-gray-100 pb-1 last:border-0 last:pb-0 items-center">
                                                    <div>
                                                        <span className="font-medium text-gray-700">₦{p.amount.toLocaleString()}</span>
                                                        {p.virtualLoanAmount > 0 && (
                                                            <span className="text-[10px] text-orange-600 ml-1 font-bold bg-orange-100 px-1 rounded-sm">+ ₦{p.virtualLoanAmount.toLocaleString()} VL</span>
                                                        )}
                                                        <span className="text-gray-400 mx-1">•</span>
                                                        <span className="text-gray-500">{p.method}</span>
                                                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${p.status === 'APPROVED' ? 'bg-green-100 text-green-700' : p.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {p.status || 'PENDING'}
                                                        </span>
                                                        {p.status === 'REJECTED' && p.rejectionReason && (
                                                            <div className="mt-1 text-xs text-red-600 bg-red-50 p-1.5 rounded border border-red-100">
                                                                <strong>MD Note:</strong> {p.rejectionReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-gray-400">{new Date(p.date).toLocaleDateString()}</span>
                                                        {p.proofOfPaymentUrl && (() => {
                                                            let url = p.proofOfPaymentUrl;
                                                            try {
                                                                const parsed = JSON.parse(p.proofOfPaymentUrl);
                                                                if (Array.isArray(parsed) && parsed.length > 0) url = parsed[0];
                                                            } catch(e) {}
                                                            let fullUrl = url;
                                                            if (!url.startsWith('http')) {
                                                                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                                                                fullUrl = `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
                                                            }
                                                            const isPdf = url.toLowerCase().endsWith('.pdf');
                                                            
                                                            return isPdf ? (
                                                                <button
                                                                    onClick={() => setReceiptModal({ isOpen: true, url: fullUrl, isPdf: true })}
                                                                    className="text-[10px] text-gray-500 hover:text-indigo-600 mt-1 flex items-center transition"
                                                                >
                                                                    <FileText size={10} className="mr-1" />
                                                                    View PDF
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setReceiptModal({ isOpen: true, url: fullUrl, isPdf: false })}
                                                                    className="text-[10px] text-gray-500 hover:text-indigo-600 mt-1 flex items-center transition relative group w-6 h-6 rounded overflow-hidden ml-auto border border-gray-200"
                                                                >
                                                                    <img src={fullUrl} className="w-full h-full object-cover group-hover:scale-110 transition" alt="Receipt" />
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })()}
                                                        {p.status === 'APPROVED' && (
                                                            <button
                                                                onClick={() => triggerPrint({ ...p, sale })}
                                                                className="text-[10px] text-blue-600 hover:underline mt-1 flex items-center"
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                                Receipt
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }

            {/* Hidden Receipt Template */}
            <div style={{ display: 'none' }}>
                {selectedPaymentForReceipt && (() => {
                    const estate = selectedPaymentForReceipt.sale.plot?.estate;
                    const managingCompany = estate?.company || user?.company;
                    const managingBranch = estate?.branch;
                    const accountant = managingBranch?.users?.[0];
                    
                    const resolvedBranding = {
                        name: managingCompany?.name || 'Esthington CRM',
                        address: managingCompany?.address,
                        logoUrl: managingCompany?.logoUrl,
                        phone: managingCompany?.phone,
                        email: managingCompany?.email,
                        website: managingCompany?.website,
                        signatureUrl: accountant?.signatureUrl || managingBranch?.signatureUrl || managingCompany?.signatureUrl,
                        managingDirectorName: accountant?.fullName || managingBranch?.managerName || managingCompany?.managingDirectorName,
                        signatureRole: accountant ? 'Accountant' : 'Authorized Signature'
                    };

                    return (
                        <ReceiptTemplate
                            ref={receiptRef}
                            sale={selectedPaymentForReceipt.sale}
                            payment={selectedPaymentForReceipt}
                            lead={selectedPaymentForReceipt.sale.lead}
                            branding={resolvedBranding}
                        />
                    );
                })()}
            </div>

            <PlotExchangeModal
                isOpen={isExchangeModalOpen}
                onClose={() => setIsExchangeModalOpen(false)}
                originalSale={saleToExchange}
                onSuccess={() => {
                    fetchSales();
                    if (onLeadUpdate) onLeadUpdate();
                }}
            />

            {/* Refund Modal */}
            {isRefundModalOpen && saleForRefund && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">Initiate Refund</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Client: <span className="font-semibold text-gray-700">{saleForRefund.lead?.fullName || 'Client'}</span>
                            </p>
                        </div>
                        <div className="p-6 bg-gray-50/50">
                            <div className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm border border-orange-100 mb-6">
                                <span className="font-bold">Strict Policy Warning:</span> The client will only be refunded 80% (₦{(saleForRefund.totalPaid * 0.8).toLocaleString()}) of their total paid amount (₦{saleForRefund.totalPaid.toLocaleString()}). A 20% penalty strictly applies.
                            </div>
                            <form onSubmit={handleRefundRequest}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Refund</label>
                                    <textarea 
                                        required
                                        value={refundReason}
                                        onChange={(e) => setRefundReason(e.target.value)}
                                        rows={3}
                                        placeholder="Explain why the client is requesting this refund..."
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    ></textarea>
                                </div>
                                <div className="mt-6 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsRefundModalOpen(false)}
                                        className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingRefund}
                                        className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
                                    >
                                        {isSubmittingRefund ? 'Submitting...' : 'Confirm Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Offer Modal */}
            {saleToCancel && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Offer</h3>
                            <p className="text-gray-600 text-sm">
                                Are you sure you want to cancel this offer? The plot will be released back to the market immediately. This action cannot be undone.
                            </p>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    onClick={() => setSaleToCancel(null)}
                                    className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    disabled={isCancellingOffer}
                                >
                                    No, Keep It
                                </button>
                                <button
                                    onClick={confirmCancelOffer}
                                    disabled={isCancellingOffer}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                >
                                    {isCancellingOffer ? 'Cancelling...' : 'Yes, Cancel Offer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receiptModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setReceiptModal({ isOpen: false, url: null, isPdf: false })}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 flex items-center">
                                <FileText size={18} className="mr-2 text-indigo-500" /> 
                                Payment Receipt
                            </h3>
                            <button onClick={() => setReceiptModal({ isOpen: false, url: null, isPdf: false })} className="text-slate-400 hover:text-rose-500 transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-auto flex-1 flex justify-center items-center bg-slate-100/50">
                            {receiptModal.isPdf ? (
                                <iframe src={receiptModal.url || ''} className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white" title="PDF Receipt" />
                            ) : (
                                <img src={receiptModal.url || ''} alt="Full Receipt" className="max-w-full rounded-xl shadow-sm border border-slate-200" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
