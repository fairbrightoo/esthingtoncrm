import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    FileSpreadsheet,
    Plus,
    Download,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
    Building2,
    Calendar,
    DollarSign,
    Trash2,
    Edit3,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Landmark,
    Eye,
    X,
    Upload,
    Check,
    AlertCircle,
    ChevronDown,
    Save
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const EXPENSE_CLASSES = [
    'IMPREST',
    'GENERAL',
    'MAINTENANCE',
    'UTILITIES',
    'STATIONERY',
    'LOGISTICS',
    'TOP CARD',
    'ACCOUNT',
    'OTHER'
];

const UOM_OPTIONS = ['ACT', 'LTR', 'TRF', 'PCS', 'DAYS', 'TRIP', 'BAGS', 'SET', 'MONTH'];

export const ImprestManagement = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();

    const [imprests, setImprests] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Active Imprest being viewed in full spreadsheet modal
    const [viewingImprest, setViewingImprest] = useState<any | null>(null);

    // Editor / Creator Modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingImprestId, setEditingImprestId] = useState<string | null>(null);
    const [formData, setFormData] = useState<{
        title: string;
        period: string;
        startDate: string;
        endDate: string;
        branchId: string;
        openingBalance: number;
        notes: string;
        items: any[];
    }>({
        title: '',
        period: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        branchId: user?.branchId || '',
        openingBalance: 0,
        notes: '',
        items: []
    });

    const [saving, setSaving] = useState(false);

    // Approval & Disbursement modals
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'APPROVE' | 'REJECT' | 'DISBURSE';
        imprest: any | null;
        remarks: string;
        sourceBank: string;
        reference: string;
        proofUrl: string;
    }>({
        isOpen: false,
        type: 'APPROVE',
        imprest: null,
        remarks: '',
        sourceBank: '',
        reference: '',
        proofUrl: ''
    });

    const [submittingAction, setSubmittingAction] = useState(false);

    // Role checks
    const isGlobalAccountant = ['GLOBAL_ACCOUNTANT', 'SUPER_ADMIN', 'GROUP_MANAGING_DIRECTOR', 'GLOBAL_CHAIRMAN'].includes(user?.role || '');
    const isBranchMD = user?.role === 'MANAGING_DIRECTOR';
    const isBranchAccountant = user?.role === 'ACCOUNTANT';
    const canCreate = isBranchAccountant || isGlobalAccountant;
    const canApproveOrDisburse = isGlobalAccountant || isBranchMD;

    useEffect(() => {
        fetchImprests();
        if (isGlobalAccountant) {
            fetchBranchesAndCompanies();
        }
    }, [selectedBranchId, selectedStatus]);

    const fetchBranchesAndCompanies = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(res.data || []);
        } catch (error) {
            console.error('Failed to load branches', error);
        }
    };

    const fetchImprests = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (selectedBranchId !== 'ALL') params.branchId = selectedBranchId;
            if (selectedStatus !== 'ALL') params.status = selectedStatus;

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/imprest`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setImprests(res.data || []);
        } catch (error) {
            console.error('Failed to load imprests', error);
            addToast('Failed to load imprest records.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Open Creator Modal
    const handleOpenCreateModal = async () => {
        setEditingImprestId(null);
        
        // Fetch last month's closing balance for automatic rollover!
        let lastBal = 0;
        let lastPeriod = '';
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/imprest/last-closing-balance`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { branchId: user?.branchId }
            });
            if (res.data?.lastClosingBalance) {
                lastBal = res.data.lastClosingBalance;
                lastPeriod = res.data.lastPeriod;
            }
        } catch (e) {
            console.log('No previous closing balance found');
        }

        const now = new Date();
        const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const initialItems = [
            {
                itemNumber: 1,
                date: new Date().toISOString().split('T')[0],
                description: lastBal > 0 ? 'BAL BROUGHT FORWARD/RECEIVED' : 'OPENING IMPREST FLOAT',
                expenseClass: 'IMPREST',
                uom: 'ACT',
                qty: 1,
                unitPrice: 0,
                inflow: lastBal,
                outflow: 0,
                runningBalance: lastBal,
                receivedBy: user?.fullName || 'BRANCH ACCOUNTANT',
                paymentStatus: 'PAID',
                receiptUrl: ''
            }
        ];

        setFormData({
            title: `Imprest Expense Reimbursement - ${monthName}`,
            period: `FOR THE PERIOD ${monthName.toUpperCase()}`,
            startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
            branchId: user?.branchId || (branches[0]?.id || ''),
            openingBalance: lastBal,
            notes: lastPeriod ? `Rollover from ${lastPeriod}` : '',
            items: initialItems
        });

        setIsEditModalOpen(true);
    };

    // Open Edit Modal for Draft
    const handleOpenEditModal = (imprest: any) => {
        setEditingImprestId(imprest.id);
        setFormData({
            title: imprest.title,
            period: imprest.period,
            startDate: new Date(imprest.startDate).toISOString().split('T')[0],
            endDate: new Date(imprest.endDate).toISOString().split('T')[0],
            branchId: imprest.branchId,
            openingBalance: imprest.openingBalance,
            notes: imprest.notes || '',
            items: (imprest.items || []).map((it: any) => ({
                ...it,
                date: new Date(it.date).toISOString().split('T')[0]
            }))
        });
        setIsEditModalOpen(true);
    };

    // Dynamic row addition in editor
    const handleAddItemRow = () => {
        const lastItem = formData.items[formData.items.length - 1];
        const prevBal = lastItem ? lastItem.runningBalance : formData.openingBalance;

        const newItem = {
            itemNumber: formData.items.length + 1,
            date: new Date().toISOString().split('T')[0],
            description: '',
            expenseClass: 'GENERAL',
            uom: 'ACT',
            qty: 1,
            unitPrice: 0,
            inflow: 0,
            outflow: 0,
            runningBalance: prevBal,
            receivedBy: '',
            paymentStatus: 'PAID',
            receiptUrl: ''
        };

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
    };

    // Row change handler with dynamic balance calculation
    const handleItemChange = (index: number, field: string, value: any) => {
        const updated = [...formData.items];
        updated[index] = { ...updated[index], [field]: value };

        // Recalculate progressive running balances
        let running = parseFloat(formData.openingBalance as any) || 0;
        for (let i = 0; i < updated.length; i++) {
            const item = updated[i];
            const inflow = parseFloat(item.inflow) || 0;
            const qty = parseFloat(item.qty) || 1;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const outflow = item.outflow !== undefined && field === 'outflow' ? parseFloat(item.outflow) || 0 : (qty * unitPrice);

            item.outflow = outflow;
            running = running + inflow - outflow;
            item.runningBalance = running;
            item.itemNumber = i + 1;
        }

        setFormData(prev => ({
            ...prev,
            items: updated
        }));
    };

    // Remove row
    const handleRemoveItemRow = (index: number) => {
        if (formData.items.length <= 1) {
            addToast('At least one line item is required.', 'error');
            return;
        }
        const updated = formData.items.filter((_, i) => i !== index);

        // Recalculate running balance
        let running = parseFloat(formData.openingBalance as any) || 0;
        for (let i = 0; i < updated.length; i++) {
            const item = updated[i];
            const inflow = parseFloat(item.inflow) || 0;
            const outflow = parseFloat(item.outflow) || 0;
            running = running + inflow - outflow;
            item.runningBalance = running;
            item.itemNumber = i + 1;
        }

        setFormData(prev => ({
            ...prev,
            items: updated
        }));
    };

    // Save or Submit Imprest
    const handleSubmitForm = async (status: 'DRAFT' | 'PENDING_APPROVAL') => {
        if (!formData.title || !formData.period || !formData.startDate || !formData.endDate) {
            addToast('Please fill in the title, period, and date range.', 'error');
            return;
        }

        if (formData.items.length === 0) {
            addToast('Please enter at least one line item.', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                status
            };

            if (editingImprestId) {
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/imprest/${editingImprestId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                addToast('Imprest updated successfully.', 'success');
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/imprest`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                addToast(status === 'DRAFT' ? 'Imprest saved as draft.' : 'Imprest submitted for approval.', 'success');
            }

            setIsEditModalOpen(false);
            fetchImprests();
        } catch (error: any) {
            console.error('Failed to save imprest', error);
            addToast(error.response?.data?.error || 'Failed to save imprest record.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Execute Approval / Disbursement
    const handleExecuteAction = async () => {
        const { type, imprest, remarks, sourceBank, reference, proofUrl } = actionModal;
        if (!imprest) return;

        setSubmittingAction(true);
        try {
            let endpoint = '';
            let payload: any = {};

            if (type === 'APPROVE') {
                endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/imprest/${imprest.id}/approve`;
                payload = { remarks };
            } else if (type === 'DISBURSE') {
                endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/imprest/${imprest.id}/disburse`;
                payload = {
                    disbursementSourceBank: sourceBank,
                    disbursementReference: reference,
                    disbursementProofUrl: proofUrl,
                    notes: remarks
                };
            } else if (type === 'REJECT') {
                if (!remarks.trim()) {
                    addToast('Rejection reason is required.', 'error');
                    setSubmittingAction(false);
                    return;
                }
                endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/imprest/${imprest.id}/reject`;
                payload = { rejectionReason: remarks };
            }

            const res = await axios.put(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            addToast(res.data.message || 'Action executed successfully.', 'success');
            setActionModal({ isOpen: false, type: 'APPROVE', imprest: null, remarks: '', sourceBank: '', reference: '', proofUrl: '' });
            if (viewingImprest?.id === imprest.id) {
                setViewingImprest(res.data.imprest || null);
            }
            fetchImprests();
        } catch (error: any) {
            console.error('Action failed', error);
            addToast(error.response?.data?.error || 'Action failed.', 'error');
        } finally {
            setSubmittingAction(false);
        }
    };

    // EXPORT TO EXCEL (.xlsx) - Modeled faithfully on Image 2
    const handleExportExcel = (imprest: any) => {
        try {
            const rows: any[] = [];

            // Title block
            rows.push([`${imprest.company?.name || 'ESTHINGTON GROUP'} - ${imprest.branch?.name || 'BRANCH'} IMPREST EXPENSE REIMBURSEMENT`]);
            rows.push([imprest.period || `FOR THE PERIOD ${new Date(imprest.startDate).toLocaleDateString()} TO ${new Date(imprest.endDate).toLocaleDateString()}`]);
            rows.push([`REFERENCE: ${imprest.referenceNumber} | STATUS: ${imprest.status} | PREPARED BY: ${imprest.preparedByUser?.fullName || 'ACCOUNTANT'}`]);
            rows.push([]); // Empty spacing row

            // Columns Header
            rows.push([
                'S/N',
                'DATE',
                'DESCRIPTION',
                'XPENSE CLASS',
                'UOM',
                'QTY',
                'PRICE',
                'INFLOW (=N=)',
                'OUTFLOW (=N=)',
                'BALANCE (=N=)',
                'RECEIVED BY',
                'STATUS'
            ]);

            // Items Rows
            (imprest.items || []).forEach((item: any, idx: number) => {
                rows.push([
                    item.itemNumber || idx + 1,
                    new Date(item.date).toLocaleDateString(),
                    item.description,
                    item.expenseClass,
                    item.uom,
                    item.qty,
                    item.unitPrice,
                    item.inflow > 0 ? item.inflow : '',
                    item.outflow > 0 ? item.outflow : '',
                    item.runningBalance,
                    item.receivedBy,
                    item.paymentStatus
                ]);
            });

            // Summary Totals
            rows.push([]);
            rows.push([
                'TOTAL',
                '',
                '',
                '',
                '',
                '',
                '',
                imprest.totalInflow,
                imprest.totalOutflow,
                imprest.closingBalance,
                '',
                ''
            ]);
            rows.push([
                'NET REIMBURSEMENT REQUESTED:',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                imprest.reimbursementRequested,
                '',
                '',
                ''
            ]);

            const worksheet = XLSX.utils.aoa_to_sheet(rows);

            // Column width formatting
            worksheet['!cols'] = [
                { wch: 6 },  // S/N
                { wch: 12 }, // Date
                { wch: 38 }, // Description
                { wch: 16 }, // Class
                { wch: 8 },  // UOM
                { wch: 8 },  // Qty
                { wch: 14 }, // Price
                { wch: 16 }, // Inflow
                { wch: 16 }, // Outflow
                { wch: 16 }, // Balance
                { wch: 18 }, // Received By
                { wch: 10 }  // Status
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Imprest Reimbursement');
            XLSX.writeFile(workbook, `${imprest.referenceNumber}_Imprest_Ledger.xlsx`);
            addToast('Excel spreadsheet exported successfully.', 'success');
        } catch (error) {
            console.error('Failed to export Excel', error);
            addToast('Failed to export Excel spreadsheet.', 'error');
        }
    };

    // EXPORT TO CORPORATE PDF
    const handleExportPDF = (imprest: any) => {
        try {
            const doc = new jsPDF('landscape');

            // Header Banner
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`${imprest.company?.name || 'ESTHINGTON PROPERTIES'}`, 14, 15);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`${imprest.branch?.name || 'Branch'} • INTERNAL IMPREST EXPENSE REIMBURSEMENT`, 14, 22);
            doc.text(`Period: ${imprest.period || 'Monthly'} | Ref: ${imprest.referenceNumber} | Status: ${imprest.status}`, 14, 28);

            // Table Data
            const tableBody = (imprest.items || []).map((it: any, idx: number) => [
                it.itemNumber || idx + 1,
                new Date(it.date).toLocaleDateString(),
                it.description,
                it.expenseClass,
                it.uom,
                it.qty,
                it.unitPrice ? `₦${it.unitPrice.toLocaleString()}` : '-',
                it.inflow ? `₦${it.inflow.toLocaleString()}` : '-',
                it.outflow ? `₦${it.outflow.toLocaleString()}` : '-',
                `₦${it.runningBalance.toLocaleString()}`,
                it.receivedBy || '-',
                it.paymentStatus
            ]);

            autoTable(doc, {
                startY: 34,
                head: [[
                    'S/N', 'Date', 'Description', 'Class', 'UOM', 'Qty', 'Price', 'Inflow', 'Outflow', 'Balance', 'Received By', 'Status'
                ]],
                body: tableBody,
                foot: [[
                    'TOTAL', '', '', '', '', '', '',
                    `₦${imprest.totalInflow.toLocaleString()}`,
                    `₦${imprest.totalOutflow.toLocaleString()}`,
                    `₦${imprest.closingBalance.toLocaleString()}`,
                    '', ''
                ]],
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
                footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
            });

            // Signatures block at bottom of PDF
            const finalY = (doc as any).lastAutoTable?.finalY || 160;
            if (finalY < 165) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('Prepared By:', 14, finalY + 15);
                doc.setFont('helvetica', 'normal');
                doc.text(imprest.preparedByUser?.fullName || 'Branch Accountant', 14, finalY + 20);

                doc.setFont('helvetica', 'bold');
                doc.text('Approved By:', 110, finalY + 15);
                doc.setFont('helvetica', 'normal');
                doc.text(imprest.approvedByUser?.fullName ? `${imprest.approvedByUser.fullName} (${imprest.approvalRole || 'MD'})` : 'Pending Approval', 110, finalY + 20);

                doc.setFont('helvetica', 'bold');
                doc.text('Disbursed By:', 210, finalY + 15);
                doc.setFont('helvetica', 'normal');
                doc.text(imprest.disbursedByUser?.fullName ? `${imprest.disbursedByUser.fullName} (${imprest.disbursementSourceBank || 'Bank'})` : 'Pending Disbursement', 210, finalY + 20);
            }

            doc.save(`${imprest.referenceNumber}_Imprest_Report.pdf`);
            addToast('PDF document generated successfully.', 'success');
        } catch (error) {
            console.error('Failed to export PDF', error);
            addToast('Failed to generate PDF document.', 'error');
        }
    };

    // Calculate Summary Totals for top metrics
    const totalOutflows = imprests.reduce((sum, imp) => sum + (imp.totalOutflow || 0), 0);
    const totalInflows = imprests.reduce((sum, imp) => sum + (imp.totalInflow || 0), 0);
    const totalClosing = imprests.reduce((sum, imp) => sum + (imp.closingBalance || 0), 0);
    const pendingCount = imprests.filter(imp => imp.status === 'PENDING_APPROVAL').length;

    // Filtered list
    const filteredImprests = imprests.filter(imp => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            imp.referenceNumber?.toLowerCase().includes(q) ||
            imp.title?.toLowerCase().includes(q) ||
            imp.period?.toLowerCase().includes(q) ||
            imp.branch?.name?.toLowerCase().includes(q) ||
            imp.preparedByUser?.fullName?.toLowerCase().includes(q)
        );
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DISBURSED':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> Disbursed / Reimbursed</span>;
            case 'APPROVED':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> Approved</span>;
            case 'PENDING_APPROVAL':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit"><Clock size={12} /> Pending Approval</span>;
            case 'DRAFT':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1 w-fit"><Edit3 size={12} /> Draft</span>;
            case 'REJECTED':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 w-fit"><XCircle size={12} /> Rejected</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Imprest Inflow</p>
                        <p className="text-xl font-black text-gray-900 mt-1 font-mono">₦{totalInflows.toLocaleString()}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Opening floats & credits</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Wallet size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Outflows / Spent</p>
                        <p className="text-xl font-black text-rose-600 mt-1 font-mono">₦{totalOutflows.toLocaleString()}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Operational expenditures</p>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                        <ArrowDownRight size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cash-on-Hand (Float)</p>
                        <p className="text-xl font-black text-emerald-600 mt-1 font-mono">₦{totalClosing.toLocaleString()}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Current net branch cash</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <ArrowUpRight size={24} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Approvals</p>
                        <p className="text-xl font-black text-amber-600 mt-1 font-mono">{pendingCount}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Awaiting MD / Global sign-off</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                </div>
            </div>

            {/* Action Bar & Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search reference, branch, period..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        />
                    </div>

                    {/* Branch Filter for Global Accountant */}
                    {isGlobalAccountant && (
                        <div className="flex items-center gap-1.5">
                            <Building2 size={16} className="text-gray-400" />
                            <select
                                value={selectedBranchId}
                                onChange={e => setSelectedBranchId(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">All Company Branches</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Status Filter */}
                    <select
                        value={selectedStatus}
                        onChange={e => setSelectedStatus(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="APPROVED">Approved</option>
                        <option value="DISBURSED">Disbursed</option>
                        <option value="DRAFT">Draft</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                {/* Create Imprest Button */}
                {canCreate && (
                    <button
                        onClick={handleOpenCreateModal}
                        className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                    >
                        <Plus size={16} /> Raise Monthly Imprest
                    </button>
                )}
            </div>

            {/* Imprest Claims Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="text-emerald-600" size={18} />
                        <h3 className="font-bold text-sm text-gray-800">Monthly Branch Imprest Reimbursements</h3>
                        <span className="text-xs text-gray-400 font-mono">({filteredImprests.length})</span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
                ) : filteredImprests.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 space-y-2">
                        <FileSpreadsheet className="mx-auto text-gray-300" size={40} />
                        <p className="font-medium text-gray-600">No Imprest reimbursement records found.</p>
                        <p className="text-xs text-gray-400">Click "Raise Monthly Imprest" to create the first operating expense reimbursement ledger.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                                <tr>
                                    <th className="px-5 py-3.5">Reference & Period</th>
                                    <th className="px-5 py-3.5">Branch</th>
                                    <th className="px-5 py-3.5 text-right">Bal B/F</th>
                                    <th className="px-5 py-3.5 text-right">Outflows / Spent</th>
                                    <th className="px-5 py-3.5 text-right">Cash Float</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Prepared By</th>
                                    <th className="px-5 py-3.5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredImprests.map(imp => (
                                    <tr key={imp.id} className="hover:bg-gray-50/60 transition">
                                        <td className="px-5 py-3.5">
                                            <div className="font-bold text-gray-900 font-mono text-xs">{imp.referenceNumber}</div>
                                            <div className="text-gray-500 text-[11px] mt-0.5">{imp.period}</div>
                                        </td>
                                        <td className="px-5 py-3.5 font-medium text-gray-800">
                                            {imp.branch?.name || 'N/A'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono font-medium text-gray-600">
                                            ₦{imp.openingBalance?.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-600">
                                            ₦{imp.totalOutflow?.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600">
                                            ₦{imp.closingBalance?.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {getStatusBadge(imp.status)}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-600">
                                            <p className="font-medium text-gray-800">{imp.preparedByUser?.fullName}</p>
                                            <p className="text-[10px] text-gray-400">{new Date(imp.createdAt).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {/* View Spreadsheet Button */}
                                                <button
                                                    onClick={() => setViewingImprest(imp)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="View Full Spreadsheet Ledger"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                {/* Export Excel (.xlsx) */}
                                                <button
                                                    onClick={() => handleExportExcel(imp)}
                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                    title="Download Excel Spreadsheet (.xlsx)"
                                                >
                                                    <FileSpreadsheet size={16} />
                                                </button>

                                                {/* Export PDF */}
                                                <button
                                                    onClick={() => handleExportPDF(imp)}
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                    title="Download Official PDF Report"
                                                >
                                                    <FileText size={16} />
                                                </button>

                                                {/* Approval Button for MD / Global Accountant */}
                                                {canApproveOrDisburse && imp.status === 'PENDING_APPROVAL' && (
                                                    <button
                                                        onClick={() => setActionModal({ isOpen: true, type: 'APPROVE', imprest: imp, remarks: '', sourceBank: '', reference: '', proofUrl: '' })}
                                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                                                    >
                                                        <Check size={12} /> Approve
                                                    </button>
                                                )}

                                                {/* Disbursement Button */}
                                                {canApproveOrDisburse && imp.status === 'APPROVED' && (
                                                    <button
                                                        onClick={() => setActionModal({ isOpen: true, type: 'DISBURSE', imprest: imp, remarks: '', sourceBank: 'Zenith Operations Account', reference: '', proofUrl: '' })}
                                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                                                    >
                                                        <Landmark size={12} /> Disburse
                                                    </button>
                                                )}

                                                {/* Edit Draft */}
                                                {imp.status === 'DRAFT' && canCreate && (
                                                    <button
                                                        onClick={() => handleOpenEditModal(imp)}
                                                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                                        title="Edit Draft"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* FULL SPREADSHEET LEDGER VIEWER MODAL (Modeled on Google Sheets Image 2) */}
            {viewingImprest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[94vh] overflow-hidden flex flex-col">
                        {/* Modal Top Bar */}
                        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="text-emerald-400" size={20} />
                                <div>
                                    <h3 className="font-black text-sm tracking-wide uppercase">
                                        {viewingImprest.company?.name || 'ESTHINGTON PROPERTIES'} • {viewingImprest.branch?.name}
                                    </h3>
                                    <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                                        REF: {viewingImprest.referenceNumber} | {viewingImprest.period}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleExportExcel(viewingImprest)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold flex items-center gap-1.5 transition text-white shadow-sm"
                                >
                                    <Download size={13} /> Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => handleExportPDF(viewingImprest)}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold flex items-center gap-1.5 transition text-white shadow-sm"
                                >
                                    <FileText size={13} /> PDF
                                </button>
                                <button
                                    onClick={() => setViewingImprest(null)}
                                    className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Spreadsheet View */}
                        <div className="flex-1 overflow-auto p-4 bg-slate-50">
                            <div className="bg-white border border-gray-300 shadow-sm rounded-xl overflow-hidden">
                                {/* Title Banner matching Image 2 */}
                                <div className="text-center py-4 bg-gray-50 border-b border-gray-300">
                                    <h2 className="text-base font-black tracking-wide text-gray-900 uppercase">
                                        IMPREST EXPENSE REIMBURSEMENT {viewingImprest.period}
                                    </h2>
                                </div>

                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-gray-100 text-gray-800 font-bold uppercase tracking-wider border-b-2 border-gray-300 text-[11px]">
                                        <tr>
                                            <th className="border border-gray-300 px-3 py-2 text-center w-12">S/N</th>
                                            <th className="border border-gray-300 px-3 py-2 w-24">DATE</th>
                                            <th className="border border-gray-300 px-3 py-2 min-w-[240px]">DESCRIPTION</th>
                                            <th className="border border-gray-300 px-3 py-2 w-28">XPENSE CLASS</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center w-16">UOM</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center w-14">QTY</th>
                                            <th className="border border-gray-300 px-3 py-2 text-right w-24">PRICE</th>
                                            <th className="border border-gray-300 px-3 py-2 text-right w-28">INFLOW (=N=)</th>
                                            <th className="border border-gray-300 px-3 py-2 text-right w-28">OUTFLOW (=N=)</th>
                                            <th className="border border-gray-300 px-3 py-2 text-right w-28">BALANCE (=N=)</th>
                                            <th className="border border-gray-300 px-3 py-2 w-32">RECEIVED BY</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center w-16">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 font-sans">
                                        {(viewingImprest.items || []).map((item: any, idx: number) => (
                                            <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                <td className="border border-gray-200 px-3 py-2 text-center text-gray-500 font-mono font-medium">{item.itemNumber || idx + 1}</td>
                                                <td className="border border-gray-200 px-3 py-2 text-gray-700 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                                                <td className="border border-gray-200 px-3 py-2 font-medium text-gray-900">{item.description}</td>
                                                <td className="border border-gray-200 px-3 py-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                        {item.expenseClass}
                                                    </span>
                                                </td>
                                                <td className="border border-gray-200 px-3 py-2 text-center font-mono text-gray-600">{item.uom}</td>
                                                <td className="border border-gray-200 px-3 py-2 text-center font-mono text-gray-800">{item.qty}</td>
                                                <td className="border border-gray-200 px-3 py-2 text-right font-mono text-gray-800">
                                                    {item.unitPrice ? item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="border border-gray-200 px-3 py-2 text-right font-mono font-bold text-blue-700">
                                                    {item.inflow ? item.inflow.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="border border-gray-200 px-3 py-2 text-right font-mono font-bold text-rose-700">
                                                    {item.outflow ? item.outflow.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="border border-gray-200 px-3 py-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                                                    ₦{item.runningBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-800 uppercase">{item.receivedBy}</td>
                                                <td className="border border-gray-200 px-3 py-2 text-center">
                                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                        {item.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Row 50 TOTAL ROW Matching Image 2 */}
                                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                            <td colSpan={7} className="border border-gray-300 px-4 py-3 text-right uppercase tracking-wider text-gray-800 font-black">
                                                TOTAL OUTFLOW (EXPENSES):
                                            </td>
                                            <td className="border border-gray-300 px-3 py-3 text-right font-mono font-black text-blue-900">
                                                ₦{viewingImprest.totalInflow?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-3 text-right font-mono font-black text-rose-700 bg-rose-50/50">
                                                ₦{viewingImprest.totalOutflow?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-3 text-right font-mono font-black text-emerald-900 bg-emerald-50">
                                                ₦{viewingImprest.closingBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td colSpan={2} className="border border-gray-300 px-3 py-3 text-gray-500 text-[11px]">
                                                Closing Cash Balance
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Signatures & Approvals Dossier */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-xs">
                                    <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">Prepared By (Branch Accountant)</p>
                                    <p className="font-extrabold text-gray-900">{viewingImprest.preparedByUser?.fullName || 'N/A'}</p>
                                    <p className="text-gray-500 mt-0.5">{viewingImprest.preparedByUser?.email}</p>
                                    <p className="text-[11px] text-gray-400 mt-2 font-mono">Date: {new Date(viewingImprest.createdAt).toLocaleDateString()}</p>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-xs">
                                    <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">Approval Sign-off</p>
                                    {viewingImprest.approvedByUser ? (
                                        <div>
                                            <p className="font-extrabold text-blue-800">{viewingImprest.approvedByUser.fullName}</p>
                                            <p className="text-gray-500 mt-0.5">{viewingImprest.approvalRole?.replace('_', ' ')}</p>
                                            <p className="text-[11px] text-gray-400 mt-2 font-mono">Approved: {new Date(viewingImprest.approvedAt).toLocaleDateString()}</p>
                                            {viewingImprest.approvalRemarks && <p className="text-gray-600 mt-1 italic">"{viewingImprest.approvalRemarks}"</p>}
                                        </div>
                                    ) : (
                                        <div className="text-amber-600 flex items-center gap-1.5 mt-2">
                                            <Clock size={15} /> Awaiting MD or Global Accountant Approval
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-xs">
                                    <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1">Disbursement Status</p>
                                    {viewingImprest.disbursedByUser ? (
                                        <div>
                                            <p className="font-extrabold text-emerald-800">{viewingImprest.disbursedByUser.fullName}</p>
                                            <p className="text-gray-500 mt-0.5">Source: {viewingImprest.disbursementSourceBank || 'Bank Transfer'}</p>
                                            {viewingImprest.disbursementReference && <p className="text-[11px] font-mono text-gray-500">Ref: {viewingImprest.disbursementReference}</p>}
                                            <p className="text-[11px] text-gray-400 mt-1 font-mono">Disbursed: {new Date(viewingImprest.disbursedAt).toLocaleDateString()}</p>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 flex items-center gap-1.5 mt-2">
                                            <Clock size={15} /> Pending Fund Reimbursement
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer with Actions */}
                        <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                                Net Reimbursement Requested: <strong className="text-rose-600 font-mono text-sm">₦{viewingImprest.reimbursementRequested?.toLocaleString()}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                                {canApproveOrDisburse && viewingImprest.status === 'PENDING_APPROVAL' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setActionModal({ isOpen: true, type: 'REJECT', imprest: viewingImprest, remarks: '', sourceBank: '', reference: '', proofUrl: '' });
                                            }}
                                            className="px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            onClick={() => {
                                                setActionModal({ isOpen: true, type: 'APPROVE', imprest: viewingImprest, remarks: '', sourceBank: '', reference: '', proofUrl: '' });
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Check size={14} /> Approve Imprest
                                        </button>
                                    </>
                                )}

                                {canApproveOrDisburse && viewingImprest.status === 'APPROVED' && (
                                    <button
                                        onClick={() => {
                                            setActionModal({ isOpen: true, type: 'DISBURSE', imprest: viewingImprest, remarks: '', sourceBank: 'Zenith Operations Account', reference: '', proofUrl: '' });
                                        }}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Landmark size={14} /> Disburse Funds
                                    </button>
                                )}

                                <button
                                    onClick={() => setViewingImprest(null)}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT SPREADSHEET MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[96vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="text-emerald-600" size={20} />
                                <h3 className="font-bold text-gray-900 text-base">
                                    {editingImprestId ? 'Edit Imprest Reimbursement Sheet' : 'Create Monthly Imprest Reimbursement Sheet'}
                                </h3>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Header Info */}
                        <div className="p-5 border-b bg-white space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                                        placeholder="e.g. October 2026 Imprest Reimbursement"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Period Header</label>
                                    <input
                                        type="text"
                                        value={formData.period}
                                        onChange={e => setFormData({ ...formData, period: e.target.value })}
                                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium uppercase"
                                        placeholder="FOR THE PERIOD 01 OCT TO 31 OCT 2026"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Opening Cash Balance / Bal B/F (₦)</label>
                                    <input
                                        type="number"
                                        value={formData.openingBalance}
                                        onChange={e => {
                                            const bal = parseFloat(e.target.value) || 0;
                                            setFormData(prev => ({ ...prev, openingBalance: bal }));
                                            // Trigger progressive balance recalculation
                                            handleItemChange(0, 'inflow', bal);
                                        }}
                                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                                        placeholder="0.00"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-0.5">Rolled over automatically or set to initial float</p>
                                </div>

                                {isGlobalAccountant && (
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Branch</label>
                                        <select
                                            value={formData.branchId}
                                            onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                                        >
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Line Items Table Editor */}
                        <div className="flex-1 overflow-auto p-4 bg-slate-50">
                            <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-gray-100 text-gray-800 font-bold uppercase text-[10px] border-b border-gray-300">
                                        <tr>
                                            <th className="border border-gray-200 px-2 py-2 text-center w-8">#</th>
                                            <th className="border border-gray-200 px-2 py-2 w-28">Date</th>
                                            <th className="border border-gray-200 px-2 py-2 min-w-[200px]">Description</th>
                                            <th className="border border-gray-200 px-2 py-2 w-32">Expense Class</th>
                                            <th className="border border-gray-200 px-2 py-2 w-16">UOM</th>
                                            <th className="border border-gray-200 px-2 py-2 w-14">Qty</th>
                                            <th className="border border-gray-200 px-2 py-2 w-24">Price (₦)</th>
                                            <th className="border border-gray-200 px-2 py-2 w-24">Inflow (₦)</th>
                                            <th className="border border-gray-200 px-2 py-2 w-24">Outflow (₦)</th>
                                            <th className="border border-gray-200 px-2 py-2 w-24">Balance (₦)</th>
                                            <th className="border border-gray-200 px-2 py-2 w-28">Received By</th>
                                            <th className="border border-gray-200 px-2 py-2 text-center w-8">Act</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 font-sans">
                                        {formData.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/30">
                                                <td className="border border-gray-200 px-2 py-1.5 text-center font-mono text-gray-500">{idx + 1}</td>
                                                <td className="border border-gray-200 px-1 py-1">
                                                    <input
                                                        type="date"
                                                        value={item.date}
                                                        onChange={e => handleItemChange(idx, 'date', e.target.value)}
                                                        className="w-full p-1 text-xs border border-gray-200 rounded focus:bg-white"
                                                    />
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                                        placeholder="Expense details..."
                                                        className="w-full p-1 text-xs border border-gray-200 rounded focus:bg-white font-medium"
                                                    />
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1">
                                                    <select
                                                        value={item.expenseClass}
                                                        onChange={e => handleItemChange(idx, 'expenseClass', e.target.value)}
                                                        className="w-full p-1 text-xs border border-gray-200 rounded focus:bg-white font-bold text-gray-700"
                                                    >
                                                        {EXPENSE_CLASSES.map(cls => (
                                                            <option key={cls} value={cls}>{cls}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1">
                                                    <select
                                                        value={item.uom}
                                                        onChange={e => handleItemChange(idx, 'uom', e.target.value)}
                                                        className="w-full p-1 text-xs border border-gray-200 rounded focus:bg-white font-mono"
                                                    >
                                                        {UOM_OPTIONS.map(u => (
                                                            <option key={u} value={u}>{u}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1">
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                                                        className="w-full p-1 text-xs text-center border border-gray-200 rounded focus:bg-white font-mono"
                                                    />
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1">
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                                                        className="w-full p-1 text-xs text-right border border-gray-200 rounded focus:bg-white font-mono"
                                                    />
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1">
                                                    <input
                                                        type="number"
                                                        value={item.inflow || ''}
                                                        onChange={e => handleItemChange(idx, 'inflow', e.target.value)}
                                                        placeholder="0"
                                                        className="w-full p-1 text-xs text-right border border-gray-200 rounded focus:bg-white font-mono text-blue-700"
                                                    />
                                                </td>
                                                <td className="border border-gray-200 px-2 py-1 text-right font-mono font-bold text-rose-600">
                                                    ₦{item.outflow?.toLocaleString()}
                                                </td>
                                                <td className="border border-gray-200 px-2 py-1 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                                                    ₦{item.runningBalance?.toLocaleString()}
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1">
                                                    <input
                                                        type="text"
                                                        value={item.receivedBy}
                                                        onChange={e => handleItemChange(idx, 'receivedBy', e.target.value)}
                                                        placeholder="Beneficiary / Staff..."
                                                        className="w-full p-1 text-xs border border-gray-200 rounded focus:bg-white uppercase font-semibold"
                                                    />
                                                </td>
                                                <td className="border border-gray-200 px-1 py-1 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItemRow(idx)}
                                                        className="p-1 text-gray-400 hover:text-red-600 transition"
                                                        title="Delete Row"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddItemRow}
                                className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                            >
                                <Plus size={14} /> Add Line Item Row
                            </button>
                        </div>

                        {/* Modal Action Footer */}
                        <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div className="text-xs text-gray-600 flex items-center gap-4">
                                <span>Total Inflow: <strong className="text-blue-700 font-mono">₦{formData.items.reduce((s, it) => s + (parseFloat(it.inflow) || 0), parseFloat(formData.openingBalance as any) || 0).toLocaleString()}</strong></span>
                                <span>Total Outflow: <strong className="text-rose-600 font-mono">₦{formData.items.reduce((s, it) => s + (parseFloat(it.outflow) || 0), 0).toLocaleString()}</strong></span>
                                <span>Closing Cash: <strong className="text-emerald-700 font-mono">₦{(formData.items[formData.items.length - 1]?.runningBalance || 0).toLocaleString()}</strong></span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handleSubmitForm('DRAFT')}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                                >
                                    <Save size={14} /> Save as Draft
                                </button>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handleSubmitForm('PENDING_APPROVAL')}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                >
                                    <CheckCircle2 size={14} /> Submit for Approval
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ACTION MODAL (APPROVE / DISBURSE / REJECT) */}
            {actionModal.isOpen && actionModal.imprest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
                        <div className={`p-4 border-b flex justify-between items-center ${
                            actionModal.type === 'APPROVE' ? 'bg-blue-50 text-blue-900' :
                            actionModal.type === 'DISBURSE' ? 'bg-emerald-50 text-emerald-900' :
                            'bg-red-50 text-red-900'
                        }`}>
                            <h3 className="font-bold text-sm">
                                {actionModal.type === 'APPROVE' && 'Approve Imprest Reimbursement'}
                                {actionModal.type === 'DISBURSE' && 'Disburse Reimbursement Funds'}
                                {actionModal.type === 'REJECT' && 'Decline Imprest Request'}
                            </h3>
                            <button onClick={() => setActionModal({ ...actionModal, isOpen: false })} className="text-gray-400 hover:text-gray-600 p-1">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <p className="font-bold text-gray-800">{actionModal.imprest.title}</p>
                                <p className="text-gray-500 font-mono mt-0.5">{actionModal.imprest.referenceNumber} • {actionModal.imprest.branch?.name}</p>
                                <div className="mt-2 pt-2 border-t flex justify-between">
                                    <span className="text-gray-500">Reimbursement Amount:</span>
                                    <span className="font-bold font-mono text-rose-600">₦{actionModal.imprest.reimbursementRequested?.toLocaleString()}</span>
                                </div>
                            </div>

                            {actionModal.type === 'DISBURSE' && (
                                <>
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Paying Bank / Account</label>
                                        <input
                                            type="text"
                                            value={actionModal.sourceBank}
                                            onChange={e => setActionModal({ ...actionModal, sourceBank: e.target.value })}
                                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                            placeholder="e.g. Zenith Bank Operations Account"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Payment Reference / Cheque No</label>
                                        <input
                                            type="text"
                                            value={actionModal.reference}
                                            onChange={e => setActionModal({ ...actionModal, reference: e.target.value })}
                                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                                            placeholder="e.g. TRF/ZEN/20261022/990"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    {actionModal.type === 'REJECT' ? 'Decline Reason (Required)' : 'Executive Remarks / Notes (Optional)'}
                                </label>
                                <textarea
                                    rows={3}
                                    value={actionModal.remarks}
                                    onChange={e => setActionModal({ ...actionModal, remarks: e.target.value })}
                                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder={actionModal.type === 'REJECT' ? 'Please provide specific reason for declining...' : 'Enter any notes or remarks...'}
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={submittingAction}
                                onClick={handleExecuteAction}
                                className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                                    actionModal.type === 'APPROVE' ? 'bg-blue-600 hover:bg-blue-700' :
                                    actionModal.type === 'DISBURSE' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                    'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {submittingAction ? 'Processing...' : (
                                    actionModal.type === 'APPROVE' ? 'Confirm Approval' :
                                    actionModal.type === 'DISBURSE' ? 'Confirm Disbursement' :
                                    'Confirm Decline'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
