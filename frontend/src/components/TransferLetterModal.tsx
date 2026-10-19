import React from 'react';
import { FileText, Printer, X } from 'lucide-react';

interface TransferLetterModalProps {
    isOpen: boolean;
    transfer: any | null;
    onClose: () => void;
}

export const TransferLetterModal: React.FC<TransferLetterModalProps> = ({ isOpen, transfer, onClose }) => {
    if (!isOpen || !transfer) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <FileText className="text-blue-600" size={18} />
                        <h3 className="font-bold text-slate-800">Official Internal Redeployment Letter</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center transition"
                        >
                            <Printer size={14} className="mr-1" /> Print Letter
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Letter Content Styled as Corporate Letterhead */}
                <div className="p-8 overflow-y-auto space-y-6 text-slate-800 bg-white">
                    <div className="text-center border-b pb-6">
                        <h2 className="text-2xl font-black tracking-tight text-blue-900 uppercase">
                            {transfer.fromCompany?.name || 'ESTHINGTON PROPERTIES'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">HUMAN RESOURCES DEPARTMENT • INTERNAL CORRESPONDENCE</p>
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">REF: {transfer.referenceNumber}</p>
                    </div>

                    <div className="flex justify-between items-start text-xs">
                        <div>
                            <p className="font-bold text-gray-700">TO:</p>
                            <p className="font-extrabold text-base text-gray-900">{transfer.user?.fullName}</p>
                            <p className="text-gray-500">Employee ID: {transfer.user?.employeeId || 'N/A'}</p>
                            <p className="text-gray-500">Current Role: {transfer.previousRole?.replace(/_/g, ' ')}</p>
                            <p className="text-gray-500">Current Station: {transfer.fromBranch?.name}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-gray-700">DATE:</p>
                            <p className="font-semibold">{new Date(transfer.createdAt).toLocaleDateString()}</p>
                            <p className="mt-2 font-bold text-gray-700">EFFECTIVE DATE:</p>
                            <p className="font-semibold text-blue-700">{new Date(transfer.effectiveDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="border-t border-b py-3 text-center">
                        <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">
                            LETTER OF INTERNAL REDEPLOYMENT / TRANSFER
                        </h3>
                    </div>

                    <div className="text-xs leading-relaxed space-y-3 text-gray-700">
                        <p>Dear <strong>{transfer.user?.fullName}</strong>,</p>
                        <p>
                            Following corporate operational review and administrative alignment, management is pleased to officially redeploy you from <strong>{transfer.fromBranch?.name}</strong> to <strong>{transfer.toBranch?.name}</strong>.
                        </p>
                        <p>
                            Effective <strong>{new Date(transfer.effectiveDate).toLocaleDateString()}</strong>, your designated role will be <strong>{transfer.newRole?.replace(/_/g, ' ')}</strong>. You will report directly to the Branch Management at your new station.
                        </p>
                        <p>
                            <strong>Client & Active Accounts:</strong> All active client portfolios and business contacts currently assigned to your profile shall follow your station to the destination branch, enabling full cross-branch sales continuity.
                        </p>
                        <p>
                            Please ensure all outstanding handover documentation and physical branch clearances with the origin branch admin are fully executed. Management appreciates your dedicated service and looks forward to your continued contribution.
                        </p>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-8 pt-8 border-t text-xs">
                        <div>
                            <p className="font-bold text-gray-800">RELEASING BRANCH SIGN-OFF:</p>
                            <div className="h-12 flex items-center font-serif italic text-blue-800 font-bold">
                                {transfer.releasingMdApprovedByUser?.fullName || 'Managing Director'}
                            </div>
                            <p className="border-t border-gray-300 pt-1 text-[11px] text-gray-500">
                                Managing Director ({transfer.fromBranch?.name})
                            </p>
                        </div>

                        <div>
                            <p className="font-bold text-gray-800">RECEIVING BRANCH INTAKE:</p>
                            <div className="h-12 flex items-center font-serif italic text-blue-800 font-bold">
                                {transfer.receivingMdApprovedByUser?.fullName || (transfer.status === 'PENDING_RECEIVING_MD' ? 'Awaiting Acceptance' : 'Managing Director')}
                            </div>
                            <p className="border-t border-gray-300 pt-1 text-[11px] text-gray-500">
                                Managing Director ({transfer.toBranch?.name})
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
