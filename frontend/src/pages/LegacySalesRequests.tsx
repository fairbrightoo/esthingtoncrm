import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FileText, Send, Inbox, CheckCircle, XCircle, Search, Edit2 } from 'lucide-react';

export const LegacySalesRequests = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'SENT' | 'RECEIVED'>('SENT');
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
    const [estates, setEstates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        estateId: '', clientName: '', clientPhone: '', clientEmail: '',
        prototype: '', size: '', agreedPrice: '', amountPaidSoFar: '',
        dateOfSale: '', requestedPlotNumber: '', marketerEmail: '', notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [availablePlots, setAvailablePlots] = useState<any[]>([]);
    const [assignedPlotId, setAssignedPlotId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const [branchStaff, setBranchStaff] = useState<any[]>([]);
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);

    const [estatePlots, setEstatePlots] = useState<any[]>([]);
    const [availablePrototypes, setAvailablePrototypes] = useState<string[]>([]);
    const [availableSizes, setAvailableSizes] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
        fetchEstates();
        if (user?.companyId && user?.branchId) {
            fetchBranchStaff(user.companyId, user.branchId);
        }
    }, [user]);

    useEffect(() => {
        if (createForm.estateId) {
            fetchEstatePlots(createForm.estateId);
        } else {
            setEstatePlots([]);
            setAvailablePrototypes([]);
            setAvailableSizes([]);
            setCreateForm(prev => ({ ...prev, prototype: '', size: '' }));
        }
    }, [createForm.estateId]);

    const fetchBranchStaff = async (companyId: string, branchId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranchStaff(res.data);
        } catch (error) {
            console.error("Failed to load branch staff", error);
        }
    };

    const fetchEstatePlots = async (estateId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${estateId}/plots`, { headers: { Authorization: `Bearer ${token}` } });
            const plots = res.data;
            setEstatePlots(plots);
            
            const protos = Array.from(new Set(plots.map((p: any) => p.prototype).filter(Boolean)));
            const sizes = Array.from(new Set(plots.map((p: any) => String(p.size)).filter(Boolean)));
            setAvailablePrototypes(protos as string[]);
            setAvailableSizes(sizes as string[]);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sentRes, receivedRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/legacy-sale-requests/sent`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/legacy-sale-requests/received`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setSentRequests(sentRes.data);
            setReceivedRequests(receivedRes.data);
        } catch (error) {
            addToast("Failed to fetch requests", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchEstates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates`, { headers: { Authorization: `Bearer ${token}` } });
            setEstates(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchAvailablePlots = async (estateId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/estates/${estateId}/plots`, { headers: { Authorization: `Bearer ${token}` } });
            setAvailablePlots(res.data.filter((p: any) => p.status === 'AVAILABLE'));
        } catch (error) {
            addToast("Failed to fetch plots", "error");
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/legacy-sale-requests`, createForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Legacy sale request submitted successfully", "success");
            setIsCreateModalOpen(false);
            setCreateForm({
                estateId: '', clientName: '', clientPhone: '', clientEmail: '',
                prototype: '', size: '', agreedPrice: '', amountPaidSoFar: '',
                dateOfSale: '', requestedPlotNumber: '', marketerEmail: '', notes: ''
            });
            fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to submit request", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (!assignedPlotId) {
            addToast("Please assign a plot first", "error");
            return;
        }
        setIsProcessing(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/legacy-sale-requests/${selectedRequest.id}/approve`, 
                { assignedPlotId }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast("Request approved and sale onboarded", "success");
            setIsApproveModalOpen(false);
            fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to approve request", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason) {
            addToast("Please provide a reason", "error");
            return;
        }
        setIsProcessing(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/legacy-sale-requests/${selectedRequest.id}/reject`, 
                { rejectionReason }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast("Request rejected", "success");
            setIsRejectModalOpen(false);
            fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.error || "Failed to reject request", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch(status) {
            case 'APPROVED': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">APPROVED</span>;
            case 'REJECTED': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">REJECTED</span>;
            default: return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">PENDING</span>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center">
                        <FileText className="mr-3 text-indigo-600" />
                        Legacy Sale Requests
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Submit cross-branch legacy sales or review requests sent to your managed estates.</p>
                </div>
                {['BRANCH_ADMIN', 'SUPER_ADMIN', 'GENERAL_MANAGER'].includes(user?.role || '') && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-4 md:mt-0 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-md flex items-center"
                    >
                        <Send size={18} className="mr-2" />
                        Submit New Request
                    </button>
                )}
            </header>

            <div className="flex space-x-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('SENT')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors flex items-center ${activeTab === 'SENT' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Send size={16} className="mr-2" />
                    Sent Requests
                </button>
                <button
                    onClick={() => setActiveTab('RECEIVED')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors flex items-center ${activeTab === 'RECEIVED' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Inbox size={16} className="mr-2" />
                    Received Requests
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400 font-medium animate-pulse">Loading Requests...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Client Info</th>
                                    <th className="px-6 py-4">Estate & Plot</th>
                                    <th className="px-6 py-4">Financials</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {(activeTab === 'SENT' ? sentRequests : receivedRequests).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                                            No requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    (activeTab === 'SENT' ? sentRequests : receivedRequests).map((req) => (
                                        <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-800">{req.clientName}</p>
                                                <p className="text-gray-500 text-xs mt-1">{req.clientPhone}</p>
                                                {activeTab === 'RECEIVED' && (
                                                    <p className="text-[10px] text-indigo-600 font-semibold mt-2 uppercase">
                                                        From: {req.requestingBranch?.company?.name ? `${req.requestingBranch.company.name} | ` : ''}{req.requestingBranch?.name || 'Unknown'}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-700">{req.estate?.name}</p>
                                                <p className="text-gray-500 text-xs mt-1">Requested: {req.requestedPlotNumber || 'N/A'}</p>
                                                <p className="text-gray-500 text-xs">{req.size}sqm - {req.prototype}</p>
                                                {req.notes && (
                                                    <div className="mt-2 text-[10px] text-gray-500 bg-gray-100/50 p-2 rounded-lg border border-gray-200">
                                                        <span className="font-bold text-gray-700">Notes: </span>{req.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-700">₦{req.agreedPrice.toLocaleString()}</p>
                                                <p className="text-green-600 text-xs font-semibold mt-1">Paid: ₦{req.amountPaidSoFar.toLocaleString()}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-6 py-4">
                                                {activeTab === 'RECEIVED' && req.status === 'PENDING' && ['BRANCH_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') && (
                                                    <div className="flex space-x-2">
                                                        <button 
                                                            onClick={() => { setSelectedRequest(req); fetchAvailablePlots(req.estateId); setIsApproveModalOpen(true); }}
                                                            className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition" title="Approve & Assign"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => { setSelectedRequest(req); setIsRejectModalOpen(true); }}
                                                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition" title="Reject"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                                {req.status === 'REJECTED' && req.rejectionReason && (
                                                    <p className="text-xs text-red-600 max-w-[150px] truncate" title={req.rejectionReason}>Reason: {req.rejectionReason}</p>
                                                )}
                                                {req.status === 'APPROVED' && req.assignedPlot && (
                                                    <p className="text-xs text-green-600 font-bold">Assigned: {req.assignedPlot.plotNumber}</p>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
                        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Submit Legacy Sale Request</h2>
                                <p className="text-sm text-gray-500 mt-1">Request onboarding for a sale on an estate managed by another branch.</p>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <form id="create-request-form" onSubmit={handleCreateSubmit} className="space-y-6">
                                {/* Estate Selection */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Estate</label>
                                    <select required className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                                        value={createForm.estateId} onChange={e => setCreateForm({ ...createForm, estateId: e.target.value })}>
                                        <option value="">-- Choose an Estate --</option>
                                        {estates.map(e => (
                                            <option key={e.id} value={e.id}>{e.name} (Managed by {e.managingCompany ? `${e.managingCompany} | ` : ''}{e.managingBranch})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Client Details */}
                                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h3 className="font-bold text-indigo-900 border-b border-indigo-100 pb-2">Client Details</h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Full Name</label>
                                            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={createForm.clientName} onChange={e => setCreateForm({ ...createForm, clientName: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Phone Number</label>
                                            <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={createForm.clientPhone} onChange={e => setCreateForm({ ...createForm, clientPhone: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Email (Optional)</label>
                                            <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={createForm.clientEmail} onChange={e => setCreateForm({ ...createForm, clientEmail: e.target.value })} />
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-1/2">
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Staff Name</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        placeholder="Search staff..."
                                                        value={staffSearchQuery}
                                                        onChange={e => {
                                                            setStaffSearchQuery(e.target.value);
                                                            setShowStaffDropdown(true);
                                                        }}
                                                        onFocus={() => setShowStaffDropdown(true)}
                                                        onBlur={() => setTimeout(() => setShowStaffDropdown(false), 200)}
                                                    />
                                                    {showStaffDropdown && staffSearchQuery && (
                                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                            {branchStaff.filter(s => s.fullName.toLowerCase().includes(staffSearchQuery.toLowerCase())).map(staff => (
                                                                <div 
                                                                    key={staff.id} 
                                                                    className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer"
                                                                    onMouseDown={() => {
                                                                        setStaffSearchQuery(staff.fullName);
                                                                        setCreateForm({ ...createForm, marketerEmail: staff.email });
                                                                        setShowStaffDropdown(false);
                                                                    }}
                                                                >
                                                                    <div className="font-bold text-gray-800">{staff.fullName}</div>
                                                                    <div className="text-xs text-gray-500">{staff.email}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-1/2">
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Marketer Email (Optional)</label>
                                                <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                    value={createForm.marketerEmail} onChange={e => setCreateForm({ ...createForm, marketerEmail: e.target.value })} placeholder="Credit to marketer" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sale Details */}
                                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h3 className="font-bold text-indigo-900 border-b border-indigo-100 pb-2">Sale Details</h3>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Prototype (e.g. 4 Bedroom Terrace)</label>
                                            <select required className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={createForm.prototype} 
                                                onChange={e => {
                                                    const proto = e.target.value;
                                                    const matchingPlot = estatePlots.find(p => p.prototype === proto);
                                                    setCreateForm({ 
                                                        ...createForm, 
                                                        prototype: proto,
                                                        size: matchingPlot ? String(matchingPlot.size) : createForm.size
                                                    });
                                                }}>
                                                <option value="">Select Prototype...</option>
                                                {availablePrototypes.map((p, i) => <option key={i} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Size (sqm)</label>
                                                <select required className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                    value={createForm.size} 
                                                    onChange={e => {
                                                        const sz = e.target.value;
                                                        const matchingPlot = estatePlots.find(p => String(p.size) === sz);
                                                        setCreateForm({ 
                                                            ...createForm, 
                                                            size: sz,
                                                            prototype: matchingPlot ? matchingPlot.prototype : createForm.prototype
                                                        });
                                                    }}>
                                                    <option value="">Select Size...</option>
                                                    {availableSizes.map((s, i) => <option key={i} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Requested Plot Number</label>
                                                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                    value={createForm.requestedPlotNumber} onChange={e => setCreateForm({ ...createForm, requestedPlotNumber: e.target.value })} placeholder="e.g. PLOT-04" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Agreed Price (₦)</label>
                                                <input required type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                    value={createForm.agreedPrice} onChange={e => setCreateForm({ ...createForm, agreedPrice: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Paid So Far (₦)</label>
                                                <input required type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                    value={createForm.amountPaidSoFar} onChange={e => setCreateForm({ ...createForm, amountPaidSoFar: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Date of Initial Sale</label>
                                            <input required type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={createForm.dateOfSale} onChange={e => setCreateForm({ ...createForm, dateOfSale: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Additional Notes</label>
                                    <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm h-20"
                                        value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Any extra information for the managing branch..." />
                                </div>
                            </form>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">Cancel</button>
                            <button type="submit" form="create-request-form" disabled={isSubmitting} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md transition disabled:opacity-50">
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* APPROVE MODAL */}
            {isApproveModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="p-6 bg-green-50 border-b border-green-100 flex items-center">
                            <CheckCircle className="text-green-600 mr-3" size={24} />
                            <div>
                                <h2 className="text-xl font-bold text-green-900">Approve Legacy Sale</h2>
                                <p className="text-sm text-green-700 mt-1">Assign an available plot to finalize onboarding.</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                                <p><span className="font-semibold text-gray-600">Client:</span> {selectedRequest.clientName}</p>
                                <p><span className="font-semibold text-gray-600">Requested Plot:</span> {selectedRequest.requestedPlotNumber || 'None specified'}</p>
                                <p><span className="font-semibold text-gray-600">Spec:</span> {selectedRequest.size}sqm, {selectedRequest.prototype}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Assign Plot from Inventory</label>
                                <select className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                                    value={assignedPlotId} onChange={e => setAssignedPlotId(e.target.value)}>
                                    <option value="">-- Select Available Plot --</option>
                                    {availablePlots.map(p => (
                                        <option key={p.id} value={p.id}>{p.plotNumber} ({p.size}sqm - ₦{p.price.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end space-x-3 border-t border-gray-100">
                            <button onClick={() => setIsApproveModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition">Cancel</button>
                            <button onClick={handleApprove} disabled={isProcessing} className="px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-md transition disabled:opacity-50">
                                {isProcessing ? 'Processing...' : 'Approve & Onboard'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECT MODAL */}
            {isRejectModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="p-6 bg-red-50 border-b border-red-100 flex items-center">
                            <XCircle className="text-red-600 mr-3" size={24} />
                            <div>
                                <h2 className="text-xl font-bold text-red-900">Reject Request</h2>
                            </div>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Rejection</label>
                            <textarea className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-500 h-24"
                                placeholder="e.g. Plot already sold, incorrect details..."
                                value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end space-x-3 border-t border-gray-100">
                            <button onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition">Cancel</button>
                            <button onClick={handleReject} disabled={isProcessing} className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-md transition disabled:opacity-50">
                                {isProcessing ? 'Processing...' : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
