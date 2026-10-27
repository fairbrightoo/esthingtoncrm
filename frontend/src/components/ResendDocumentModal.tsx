import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, Send, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ResendDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: any;
    initialDocumentType?: 'OFFER' | 'ALLOCATION' | 'PROVISIONAL_ALLOCATION' | 'FINAL_ALLOCATION' | 'RECEIPT' | 'ALL';
    onSuccess?: () => void;
}

export const ResendDocumentModal: React.FC<ResendDocumentModalProps> = ({
    isOpen,
    onClose,
    sale,
    initialDocumentType = 'OFFER',
    onSuccess
}) => {
    const { token } = useAuth();
    const { addToast } = useToast();

    const [recipientEmail, setRecipientEmail] = useState('');
    const [documentType, setDocumentType] = useState<string>(initialDocumentType);
    const [customMessage, setCustomMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && sale) {
            setRecipientEmail(sale.lead?.email || '');
            setDocumentType(initialDocumentType);
            setCustomMessage('');
        }
    }, [isOpen, sale, initialDocumentType]);

    if (!isOpen || !sale) return null;

    const estateName = sale.plot?.estate?.name || 'Property';
    const plotNumber = sale.plot?.plotNumber || sale.plotNumber || 'Plot';
    const clientName = sale.nameOnDocument || sale.lead?.fullName || 'Client';

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!recipientEmail || !recipientEmail.trim()) {
            addToast('Please enter a valid recipient email address.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await axios.post(
                `${baseUrl}/api/sales/${sale.id}/resend-documents`,
                {
                    documentType,
                    customEmail: recipientEmail.trim(),
                    customMessage: customMessage.trim() || undefined
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            addToast(res.data?.message || `Document(s) successfully resent to ${recipientEmail}`, 'success');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to resend documents:', error);
            const msg = error.response?.data?.error || 'Failed to dispatch document email. Please check server logs.';
            addToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
                            <Mail size={22} className="text-purple-200" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Resend Official Documents</h3>
                            <p className="text-xs text-purple-200 mt-0.5">Email freshly compiled PDF attachments to client</p>
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

                {/* Body Form */}
                <form onSubmit={handleSend} className="p-6 space-y-4 overflow-y-auto">
                    {/* Sale Context Badge */}
                    <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3.5 flex items-start justify-between">
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Client & Property</div>
                            <div className="font-bold text-gray-800 text-sm mt-0.5">{clientName}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{estateName} • Plot #{plotNumber}</div>
                        </div>
                        <div className="text-right">
                            <span className="text-[11px] bg-white border border-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                NGN {Number(sale.agreedPrice || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Recipient Email */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                            Recipient Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            required
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="client@example.com"
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                            Defaults to the client's registered email. You can modify this if the client requests delivery to a secondary address.
                        </p>
                    </div>

                    {/* Document Selection */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                            Document Package to Send <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition"
                        >
                            <option value="OFFER">📄 Offer Letter (Updated with latest particulars)</option>
                            <option value="ALLOCATION">📜 Provisional / Final Allocation Letter</option>
                            <option value="RECEIPT">🧾 Latest Payment Receipt</option>
                            <option value="ALL">📦 Complete Package (All Available Documents)</option>
                        </select>
                        <p className="text-[11px] text-gray-400 mt-1">
                            PDFs are generated on-the-fly using the estate company's official letterhead and digital signatures.
                        </p>
                    </div>

                    {/* Custom Message Note */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                            Custom Email Note <span className="text-gray-400 font-normal text-[11px]">(Optional)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="e.g. Dear Client, please find attached your updated Offer Letter with your corrected address details as requested."
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white resize-none transition"
                        />
                    </div>

                    {/* Notice */}
                    <div className="flex items-start space-x-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200/60">
                        <CheckCircle size={15} className="text-green-600 shrink-0 mt-0.5" />
                        <span>
                            Dispatching will be recorded in the client's CRM timeline log for full accountability and audit trails.
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-purple-600/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Compiling & Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={15} />
                                    <span>Dispatch Email</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
