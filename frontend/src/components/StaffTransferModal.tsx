import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { X, ArrowRightLeft, Building2, UserCheck, Calendar, ShieldCheck, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface StaffTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    staff: any | null;
    onSuccess?: () => void;
}

export const StaffTransferModal: React.FC<StaffTransferModalProps> = ({
    isOpen,
    onClose,
    staff,
    onSuccess
}) => {
    const { token, user } = useAuth();
    const { addToast } = useToast();

    const [branches, setBranches] = useState<any[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [toBranchId, setToBranchId] = useState('');
    const [newRole, setNewRole] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('Operational Realignment');
    const [justification, setJustification] = useState('');
    const [leadStrategy, setLeadStrategy] = useState<'MIGRATE_WITH_STAFF' | 'REASSIGN_AT_SOURCE' | 'RETURN_TO_BRANCH_POOL'>('MIGRATE_WITH_STAFF');
    const [assetsClearance, setAssetsClearance] = useState(false);
    const [filesHandedOver, setFilesHandedOver] = useState(false);
    const [handoverNotes, setHandoverNotes] = useState('');

    useEffect(() => {
        if (isOpen && staff) {
            setNewRole(staff.role || 'MARKETER');
            setToBranchId('');
            setJustification('');
            setHandoverNotes('');
            setAssetsClearance(false);
            setFilesHandedOver(false);
            setLeadStrategy('MIGRATE_WITH_STAFF');
            setEffectiveDate(new Date().toISOString().split('T')[0]);
            fetchBranches();
        }
    }, [isOpen, staff]);

    const fetchBranches = async () => {
        if (!staff?.companyId) return;
        setLoadingBranches(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${staff.companyId}/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter out staff member's current branch
            const eligible = res.data.filter((b: any) => b.id !== staff.branchId);
            setBranches(eligible);
            if (eligible.length > 0) {
                setToBranchId(eligible[0].id);
            }
        } catch (error) {
            console.error('Failed to load branches', error);
            addToast('Failed to load branches for transfer.', 'error');
        } finally {
            setLoadingBranches(false);
        }
    };

    if (!isOpen || !staff) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!toBranchId) {
            addToast('Please select a destination branch.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                userId: staff.id,
                toBranchId,
                newRole: newRole || staff.role,
                effectiveDate,
                reason,
                justification,
                leadStrategy,
                assetsClearance,
                filesHandedOver,
                handoverNotes
            };

            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/transfers/initiate`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            addToast(res.data.message || 'Staff transfer request submitted for MD approval!', 'success');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Transfer submission error:', error);
            addToast(error.response?.data?.error || 'Failed to initiate transfer.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const targetBranchObj = branches.find(b => b.id === toBranchId);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-100">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <ArrowRightLeft size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-lg tracking-tight">Initiate Staff Redeployment</h3>
                            <p className="text-xs text-blue-100 font-medium">Transfer staff across branches with role & lead continuity</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
                    {/* Staff Overview Card */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Staff Member</span>
                            <span className="text-base font-bold text-slate-800 block">{staff.fullName}</span>
                            <span className="text-xs text-slate-500">{staff.email} • {staff.phone || 'No phone'}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Current Station</span>
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 block">
                                {staff.role?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    {/* Step 1: Destination Branch & Role Transition */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                                <Building2 size={14} className="mr-1 text-blue-600" /> Destination Branch *
                            </label>
                            {loadingBranches ? (
                                <div className="text-xs text-slate-400 py-2">Loading branches...</div>
                            ) : branches.length === 0 ? (
                                <div className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                                    No other branches available in this company.
                                </div>
                            ) : (
                                <select
                                    value={toBranchId}
                                    onChange={(e) => setToBranchId(e.target.value)}
                                    required
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                >
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.name} {b.address ? `(${b.address})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                                <UserCheck size={14} className="mr-1 text-blue-600" /> New Designation / Role *
                            </label>
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                required
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                                <option value={staff.role}>Retain Current: {staff.role?.replace('_', ' ')}</option>
                                <option value="MARKETER">Marketer</option>
                                <option value="TEAM_LEAD">Team Lead</option>
                                <option value="BDM">Business Development Manager (BDM)</option>
                                <option value="HEAD_BDD">Head of BDD</option>
                                <option value="BRANCH_ADMIN">Branch Admin</option>
                                <option value="SITE_EXPERT">Site Expert</option>
                                <option value="CUSTOMER_CARE">Customer Care</option>
                                <option value="ICT_ORACLE">ICT Oracle</option>
                            </select>
                        </div>
                    </div>

                    {/* Step 2: Date & Transfer Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                                <Calendar size={14} className="mr-1 text-blue-600" /> Effective Transfer Date *
                            </label>
                            <input
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                required
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                            <span className="text-[11px] text-slate-400 mt-0.5 block">Executes immediately upon MD sign-off if set to today or past.</span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                                <ShieldCheck size={14} className="mr-1 text-blue-600" /> Transfer Reason Category *
                            </label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                                <option value="Operational Realignment">Operational Realignment</option>
                                <option value="Promotion / Career Advancement">Promotion / Career Advancement</option>
                                <option value="Branch Expansion">Branch Expansion</option>
                                <option value="Relocation Request">Relocation Request (Staff Initiated)</option>
                                <option value="Mutual Agreement">Mutual Agreement</option>
                                <option value="Disciplinary Rotation">Disciplinary / Management Rotation</option>
                            </select>
                        </div>
                    </div>

                    {/* Step 3: Client & Lead Handling Strategy */}
                    <div className="bg-blue-50/50 border border-blue-200/70 rounded-xl p-4 space-y-2">
                        <label className="block text-xs font-black text-blue-900 uppercase tracking-wider">
                            Client & Active Leads Handling Strategy
                        </label>
                        <div className="space-y-2 pt-1">
                            <label className="flex items-start space-x-2.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="leadStrategy"
                                    value="MIGRATE_WITH_STAFF"
                                    checked={leadStrategy === 'MIGRATE_WITH_STAFF'}
                                    onChange={() => setLeadStrategy('MIGRATE_WITH_STAFF')}
                                    className="mt-1 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <span className="font-bold text-slate-800 block">Migrate Leads with Staff (Recommended)</span>
                                    <span className="text-xs text-slate-500">
                                        Staff retains access to all their personal clients from the new branch. Cross-branch property purchases automatically record as Cross-Sales!
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start space-x-2.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="leadStrategy"
                                    value="RETURN_TO_BRANCH_POOL"
                                    checked={leadStrategy === 'RETURN_TO_BRANCH_POOL'}
                                    onChange={() => setLeadStrategy('RETURN_TO_BRANCH_POOL')}
                                    className="mt-1 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <span className="font-bold text-slate-800 block">Retain at Origin Branch (Pool Reallocation)</span>
                                    <span className="text-xs text-slate-500">
                                        Active leads remain in the origin branch's unassigned pool for local marketers to inherit.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Step 4: Clearance & Handover Checklist */}
                    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Office Handover & Clearance Checklist</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <input
                                    type="checkbox"
                                    checked={assetsClearance}
                                    onChange={(e) => setAssetsClearance(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">Office keys & physical assets returned</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <input
                                    type="checkbox"
                                    checked={filesHandedOver}
                                    onChange={(e) => setFilesHandedOver(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">Physical files & pending work handed over</span>
                            </label>
                        </div>

                        <div>
                            <input
                                type="text"
                                value={handoverNotes}
                                onChange={(e) => setHandoverNotes(e.target.value)}
                                placeholder="Handover notes (e.g. Office keys surrendered to Branch Admin)..."
                                className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Step 5: Justification */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            HR Redeployment Justification / Notes
                        </label>
                        <textarea
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            rows={3}
                            placeholder="Provide operational context or management justification for the Managing Director's review..."
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || branches.length === 0}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Submitting Transfer...
                                </>
                            ) : (
                                <>
                                    <ArrowRightLeft size={14} className="mr-1.5" /> Submit for MD Approvals
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
