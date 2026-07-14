import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Phone, Mail, User, Calendar, Upload, Globe, MoreHorizontal, Edit2, Shield, Trash2, ArrowRightLeft, Activity, DollarSign, ChevronLeft, ChevronRight, BookUser } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LeadTimeline } from '../components/LeadTimeline';
import { BulkLeadUploadModal } from '../components/BulkLeadUploadModal';
import { useToast } from '../context/ToastContext';

interface Lead {
    id: string;
    fullName: string;
    status: string;
    phone: string;
    email: string;
    source?: string; // New field
    updatedAt: string;
    assignedToUser?: {
        id: string;
        fullName: string;
    };
    isVerified: boolean;
    whatsappOptIn: boolean;
    branch?: { name: string };
    company?: { abbreviation: string; name: string };
}

export const MyLeads = ({ scope }: { scope?: 'my' | 'all' | 'cross-sales' }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL'); // New Filter
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [limit, setLimit] = useState(20);

    // Assign Logic
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [branchUsers, setBranchUsers] = useState<any[]>([]);
    const [newAssigneeId, setNewAssigneeId] = useState('');
    const [timelineTab, setTimelineTab] = useState<'ACTIVITY' | 'TASKS' | 'SALES'>('ACTIVITY');

    // Edit Logic
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Delete Logic
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

    // Add Lead Logic
    const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
    const [addFormName, setAddFormName] = useState('');
    const [addFormPhone, setAddFormPhone] = useState('');
    const [addFormEmail, setAddFormEmail] = useState('');

    const openAddLeadModal = () => {
        setAddFormName('');
        setAddFormPhone('');
        setAddFormEmail('');
        setIsAddLeadModalOpen(true);
    };

    const handleImportContacts = async () => {
        try {
            const props = ['name', 'tel', 'email'];
            const contacts = await (navigator as any).contacts.select(props, { multiple: false });
            if (contacts && contacts.length > 0) {
                const contact = contacts[0];
                if (contact.name && contact.name.length > 0) setAddFormName(contact.name[0]);
                if (contact.tel && contact.tel.length > 0) {
                    let phone = contact.tel[0].replace(/[\s-]/g, '');
                    setAddFormPhone(phone);
                }
                if (contact.email && contact.email.length > 0) setAddFormEmail(contact.email[0]);
                addToast("Contact imported successfully. Please review the details.", "success");
            }
        } catch (err: any) {
            console.error("Contact picker error:", err);
            // Ignore cancellation errors
            if (err.name !== 'InvalidStateError' && err.name !== 'SecurityError' && err.name !== 'NotAllowedError') {
                addToast("Failed to open contacts.", "error");
            }
        }
    };
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    
    // Global Search Logic
    const [isGlobalSearchModalOpen, setIsGlobalSearchModalOpen] = useState(false);
    const [globalSearchPhone, setGlobalSearchPhone] = useState('');
    const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

    const isMarketer = ['MARKETER', 'TEAM_LEAD', 'BDM', 'HEAD_BDD', 'SITE_EXPERT'].includes(user?.role || '');

    useEffect(() => {
        fetchLeads();
    }, [statusFilter, sourceFilter, currentPage, limit]); // Re-fetch when filter, page, or limit changes

    // Search Debounce Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1); // Reset to page 1 on search
            } else {
                fetchLeads();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ... existing user fetch effect ...
    useEffect(() => {
        const effectiveCompanyId = user?.companyId || user?.company?.id;
        const effectiveBranchId = user?.branchId || user?.branch?.id;

        if (!isMarketer && effectiveCompanyId && effectiveBranchId) {
            // Fetch users for assignment dropdown
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${effectiveCompanyId}/branches/${effectiveBranchId}/users`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => setBranchUsers(res.data))
                .catch(err => console.error("Failed to load users", err));
        }
    }, [user, isMarketer]);

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const params: any = { page: currentPage, limit };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (sourceFilter !== 'ALL') params.source = sourceFilter;
            if (scope) params.scope = scope;
            if (searchTerm) params.search = searchTerm; // Server-side search!

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params
            });
            
            if (res.data.leads) {
                setLeads(res.data.leads);
                setTotalPages(res.data.totalPages);
                setTotalCount(res.data.totalCount);
                setCurrentPage(res.data.currentPage);
            } else {
                setLeads(res.data);
                setTotalPages(1);
                setTotalCount(res.data.length);
            }
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Verify Logic
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [leadToVerify, setLeadToVerify] = useState<Lead | null>(null);

    const openVerifyModal = (lead: Lead) => {
        setLeadToVerify(lead);
        setIsVerifyModalOpen(true);
    };

    const confirmVerification = async () => {
        if (!leadToVerify) return;
        try {
            await axios.patch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/${leadToVerify.id}/verify`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchLeads();
            addToast(`Lead ${leadToVerify.isVerified ? 'unverified' : 'verified'} successfully`, 'success');
            setIsVerifyModalOpen(false);
            setLeadToVerify(null);
        } catch (error) {
            console.error("Verification failed", error);
            addToast("Failed to change verification status", 'error');
        }
    };

    const handleGlobalSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (globalSearchPhone.length < 5) {
            addToast("Please enter at least 5 digits", 'error');
            return;
        }
        setIsSearchingGlobal(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/global-search`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { phone: globalSearchPhone }
            });
            setGlobalSearchResults(res.data);
            if (res.data.length === 0) {
                addToast("No clients found across branches", 'info');
            }
        } catch (error: any) {
            console.error("Global search failed", error);
            addToast(error.response?.data?.error || "Failed to search", 'error');
        } finally {
            setIsSearchingGlobal(false);
        }
    };

    const handleAssignClick = (lead: Lead) => {
        setSelectedLead(lead);
        setNewAssigneeId(lead.assignedToUser?.id || '');
        setIsAssignModalOpen(true);
    };

    const saveAssignment = async () => {
        if (!selectedLead || !newAssigneeId) return;

        try {
            await axios.patch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/${selectedLead.id}/assign`,
                { assignedToUserId: newAssigneeId },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );

            // Refresh
            fetchLeads();
            setIsAssignModalOpen(false);
            setSelectedLead(null);
            addToast("Lead re-assigned successfully", 'success');
        } catch (error) {
            console.error("Failed to re-assign", error);
            addToast("Failed to re-assign lead.", 'error');
        }
    };

    const handleAddLeadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads`, {
                fullName: formData.get('fullName'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                gender: formData.get('gender') || undefined,
                source: formData.get('source') || undefined,
                whatsappOptIn: formData.get('whatsappOptIn') === 'on'
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            setIsAddLeadModalOpen(false);
            fetchLeads();
            addToast("Lead created successfully!", 'success');
        } catch (error: any) {
            console.error("Failed to create lead", error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Unknown error";
            addToast(`Failed to create lead: ${errorMsg}`, 'error');
        }
    };

    const handleEditLeadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!leadToEdit) return;
        const formData = new FormData(e.currentTarget);

        const fullName = formData.get('fullName') !== null ? formData.get('fullName') : leadToEdit.fullName;
        const phone = formData.get('phone') !== null ? formData.get('phone') : leadToEdit.phone;
        const email = formData.get('email') !== null ? formData.get('email') : leadToEdit.email;

        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/${leadToEdit.id}`, {
                fullName,
                phone,
                email,
                gender: formData.get('gender') || undefined,
                source: formData.get('source') || undefined,
                whatsappOptIn: formData.get('whatsappOptIn') === 'on'
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            setIsEditModalOpen(false);
            setLeadToEdit(null);
            fetchLeads();
            addToast("Lead updated successfully!", 'success');
        } catch (error: any) {
            console.error("Failed to update lead", error);
            addToast(error.response?.data?.error || "Failed to update lead", 'error');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!leadToDelete) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/${leadToDelete.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setIsDeleteModalOpen(false);
            setLeadToDelete(null);
            fetchLeads();
            addToast("Lead deleted successfully", 'success');
        } catch (error: any) {
            console.error("Failed to delete lead", error);
            addToast(error.response?.data?.error || "Failed to delete lead", 'error');
        }
    };

    // Simple client-side search for now to avoid debounce complexity immediately
    const filteredLeads = leads.filter(lead =>
        lead.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            {/* Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                        <h2 className="text-lg font-bold mb-4">Re-assign Lead</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Assign <b>{selectedLead?.fullName}</b> to:
                        </p>

                        <select
                            className="w-full border border-gray-300 rounded p-2 mb-6"
                            value={newAssigneeId}
                            onChange={(e) => setNewAssigneeId(e.target.value)}
                        >
                            <option value="">Select Staff...</option>
                            {branchUsers.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.fullName} ({u.role})
                                </option>
                            ))}
                        </select>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveAssignment}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {scope === 'cross-sales' ? 'Cross-Branch Clients' : (scope === 'my' || isMarketer ? 'My Leads' : 'All Branch Leads')}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {totalCount || leads.length} active leads found
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setIsBulkUploadModalOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                    >
                        <Upload size={16} className="mr-2" />
                        Bulk Upload
                    </button>
                    <button
                        onClick={openAddLeadModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                    >
                        <User size={16} className="mr-2" />
                        Add Lead
                    </button>
                    {!isMarketer && (
                        <button
                            onClick={() => setIsGlobalSearchModalOpen(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                        >
                            <Globe size={16} className="mr-2" />
                            Global Search
                        </button>
                    )}
                    <div className="h-8 w-px bg-gray-300 mx-2"></div>

                    <div className="flex space-x-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search name, phone..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-64"
                            />
                        </div>
                        {/* Source Filter */}
                        <div className="relative">
                            <select
                                value={sourceFilter}
                                onChange={e => setSourceFilter(e.target.value)}
                                className="appearance-none bg-white border border-gray-300 px-4 py-2 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="ALL">All Sources</option>
                                <option value="Facebook">Facebook</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Referral">Referral</option>
                                <option value="Website">Website</option>
                                <option value="Walk-in">Walk-in</option>
                                <option value="Other">Other</option>
                            </select>
                            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                        {/* Status Filter */}
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="appearance-none bg-white border border-gray-300 px-4 py-2 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                                <option value="ALL">All Status</option>
                                <option value="PROSPECT">Prospect</option>
                                <option value="CLIENT">Client</option>
                                <option value="CLOSED_LOST">Lost</option>
                            </select>
                            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>
            </div>


            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading leads...</div>
                ) : leads.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <User size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No leads found matching your criteria.</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-500 font-medium text-sm">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    {!isMarketer && <th className="px-6 py-4">Assigned To</th>}
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Source</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Last Activity</th>
                                    <th className="px-6 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => { setSelectedLead(lead); setTimelineTab('ACTIVITY'); }}
                                                            className="font-semibold text-gray-700 hover:text-blue-600 hover:underline text-left"
                                                        >
                                                            {lead.fullName}
                                                        </button>
                                                        {lead.isVerified && (
                                                            <span className="text-green-600 bg-green-50 p-0.5 rounded-full" title="Verified Lead">
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {lead.branch && lead.company && (
                                                        <div className="text-[10px] font-medium text-gray-500 mt-1 flex items-center">
                                                            <Globe size={10} className="mr-1" />
                                                            Origin: {lead.company.abbreviation} - {lead.branch.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {!isMarketer && (
                                            <td className="px-6 py-4">
                                                {lead.assignedToUser ? (
                                                    <div className="text-sm font-medium text-gray-800 bg-gray-100 inline-block px-2 py-1 rounded">
                                                        {lead.assignedToUser.fullName}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs text-xs italic">Unassigned</span>
                                                )}
                                            </td>
                                        )}

                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${lead.status === 'CLIENT' ? 'bg-green-100 text-green-700' :
                                                lead.status === 'PROSPECT' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {lead.status}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded">
                                                {lead.source || 'Unknown'}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex flex-col space-y-1 text-sm text-gray-600">
                                                <div className="flex items-center space-x-2">
                                                    <Phone size={14} /> <span>{lead.phone}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Mail size={14} /> <span>{lead.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex items-center space-x-1">
                                                <Calendar size={14} />
                                                <span>{new Date(lead.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2 relative">
                                                <button onClick={() => { setSelectedLead(lead); setTimelineTab('ACTIVITY'); }} className="text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-blue-50 transition-colors" title="Timeline">
                                                    <Activity size={16} />
                                                </button>
                                                <button onClick={() => { setSelectedLead(lead); setTimelineTab('SALES'); }} className="text-green-600 hover:text-green-800 p-1.5 rounded-full hover:bg-green-50 transition-colors" title="Sales">
                                                    <DollarSign size={16} />
                                                </button>
                                                
                                                <button 
                                                    onClick={() => setOpenDropdownId(openDropdownId === lead.id ? null : lead.id)}
                                                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors ml-1"
                                                    title="More Actions"
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>
                                                
                                                {openDropdownId === lead.id && (
                                                    <div className="absolute right-0 top-10 w-40 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-10 overflow-hidden">
                                                        <button onClick={() => { setLeadToEdit(lead); setIsEditModalOpen(true); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                                                            <Edit2 size={14} className="mr-2 text-gray-400"/> Edit Lead
                                                        </button>
                                                        {!isMarketer && (
                                                            <>
                                                                <button onClick={() => { handleAssignClick(lead); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                                                                    <ArrowRightLeft size={14} className="mr-2 text-gray-400"/> Re-assign
                                                                </button>
                                                                <button onClick={() => { openVerifyModal(lead); setOpenDropdownId(null); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 flex items-center transition-colors ${lead.isVerified ? 'text-orange-600' : 'text-green-600'}`}>
                                                                    <Shield size={14} className={`mr-2 ${lead.isVerified ? 'text-orange-400' : 'text-green-500'}`}/> {lead.isVerified ? 'Unverify' : 'Verify'}
                                                                </button>
                                                                <div className="h-px bg-gray-100 my-1"></div>
                                                                <button onClick={() => { setLeadToDelete(lead); setIsDeleteModalOpen(true); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center transition-colors">
                                                                    <Trash2 size={14} className="mr-2"/> Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* Pagination Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 gap-4">
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-500">
                                    Showing <span className="font-medium text-gray-700">{totalCount === 0 ? 0 : (currentPage - 1) * limit + 1}</span> to <span className="font-medium text-gray-700">{Math.min(currentPage * limit, totalCount)}</span> of <span className="font-medium text-gray-700">{totalCount}</span> results
                                </span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">Rows per page:</span>
                                    <select
                                        value={limit}
                                        onChange={(e) => {
                                            setLimit(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="border border-gray-200 rounded p-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                            
                            {totalPages > 1 && (
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="text-sm font-medium text-gray-600 px-2">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add Lead Modal */}
            {
                isAddLeadModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">Add New Lead</h2>
                                {'contacts' in navigator && 'ContactsManager' in window && (
                                    <button 
                                        type="button" 
                                        onClick={handleImportContacts}
                                        className="flex items-center text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1.5 rounded hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100"
                                    >
                                        <BookUser size={14} className="mr-1.5" />
                                        From Contacts
                                    </button>
                                )}
                            </div>
                            <form onSubmit={handleAddLeadSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        name="fullName" required
                                        value={addFormName}
                                        onChange={e => setAddFormName(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        name="phone" required
                                        value={addFormPhone}
                                        onChange={e => setAddFormPhone(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Optional)</label>
                                    <input
                                        name="email" type="email"
                                        value={addFormEmail}
                                        onChange={e => setAddFormEmail(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Source (Optional)</label>
                                    <select
                                        name="source"
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Select Source...</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Website">Website</option>
                                        <option value="Walk-in">Walk-in</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender (Optional)</label>
                                    <select
                                        name="gender"
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Select...</option>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                    </select>
                                </div>
                                <div className="mb-4">
                                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            name="whatsappOptIn"
                                            defaultChecked={true}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Subscribed to WhatsApp Communications</span>
                                    </label>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddLeadModalOpen(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Create Lead
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Lead Modal */}
            {
                isEditModalOpen && leadToEdit && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                            <h2 className="text-lg font-bold mb-4">Edit Lead</h2>
                            <form onSubmit={handleEditLeadSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        name="fullName" required defaultValue={leadToEdit.fullName === 'null' ? '' : leadToEdit.fullName}
                                        disabled={isMarketer && !!leadToEdit.fullName && leadToEdit.fullName !== 'null'}
                                        className={`w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none ${isMarketer && !!leadToEdit.fullName && leadToEdit.fullName !== 'null' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        name="phone" required defaultValue={leadToEdit.phone === 'null' ? '' : leadToEdit.phone}
                                        disabled={isMarketer && !!leadToEdit.phone && leadToEdit.phone !== 'null'}
                                        className={`w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none ${isMarketer && !!leadToEdit.phone && leadToEdit.phone !== 'null' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Optional)</label>
                                    <input
                                        name="email" type="email" defaultValue={leadToEdit.email === 'null' ? '' : leadToEdit.email}
                                        disabled={isMarketer && !!leadToEdit.email && leadToEdit.email !== 'null'}
                                        className={`w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none ${isMarketer && !!leadToEdit.email && leadToEdit.email !== 'null' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Source (Optional)</label>
                                    <select
                                        name="source" defaultValue={leadToEdit.source || ''}
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Select Source...</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Website">Website</option>
                                        <option value="Walk-in">Walk-in</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            name="whatsappOptIn"
                                            defaultChecked={leadToEdit.whatsappOptIn}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Subscribed to WhatsApp Communications</span>
                                    </label>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsEditModalOpen(false); setLeadToEdit(null); }}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Verify Confirmation Modal */}
            {isVerifyModalOpen && leadToVerify && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                        <h2 className="text-lg font-bold mb-2">
                            {leadToVerify.isVerified ? 'Unverify Lead' : 'Verify Lead'}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to {leadToVerify.isVerified ? 'remove the verification status from' : 'mark this lead as verified?'} <span className="font-semibold">{leadToVerify.fullName}</span>?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setIsVerifyModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmVerification}
                                className={`px-4 py-2 text-white rounded ${leadToVerify.isVerified ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {leadToVerify.isVerified ? 'Unverify' : 'Verify'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && leadToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                        <h2 className="text-lg font-bold mb-2">Delete Lead</h2>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to permanently delete <span className="font-semibold">{leadToDelete.fullName}</span>? This action cannot be undone and will remove all associated activities.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="px-4 py-2 text-white rounded bg-red-600 hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline Drawer */}
            {
                selectedLead && !isAssignModalOpen && (
                    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 z-40 flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <div>
                                <h2 className="font-bold text-gray-800">{selectedLead.fullName}</h2>
                                <p className="text-xs text-gray-500">{selectedLead.phone}</p>
                            </div>
                            <button onClick={() => setSelectedLead(null)} className="text-gray-500 hover:text-gray-800">
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <LeadTimeline
                                leadId={selectedLead.id}
                                initialTab={timelineTab}
                                onLeadUpdate={fetchLeads}
                            />
                        </div>
                    </div>
                )
            }

            {/* Global Search Modal */}
            {
                isGlobalSearchModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-[500px] shadow-xl">
                            <h2 className="text-lg font-bold mb-2">Cross-Branch Client Search</h2>
                            <p className="text-sm text-gray-500 mb-4">Search for an existing client in the Esthington network to initiate a cross-sale.</p>
                            
                            <form onSubmit={handleGlobalSearch} className="flex space-x-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="Enter full or partial phone number..."
                                    value={globalSearchPhone}
                                    onChange={(e) => setGlobalSearchPhone(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded p-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={isSearchingGlobal}
                                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isSearchingGlobal ? 'Searching...' : 'Search'}
                                </button>
                            </form>

                            <div className="max-h-64 overflow-y-auto">
                                {globalSearchResults.length > 0 && (
                                    <div className="space-y-3">
                                        {globalSearchResults.map(client => (
                                            <div key={client.id} className="border border-gray-200 rounded p-3 flex justify-between items-center bg-gray-50">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{client.fullName}</p>
                                                    <p className="text-sm text-gray-500">{client.phone} • {client.email}</p>
                                                    <p className="text-xs text-gray-400 mt-1">Homed at: {client.company?.name} ({client.branch?.name})</p>
                                                    <p className="text-xs text-gray-400">Current Marketer: {client.assignedToUser?.fullName || 'None'}</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedLead(client);
                                                        setTimelineTab('SALES');
                                                        setIsGlobalSearchModalOpen(false);
                                                        setGlobalSearchResults([]);
                                                        setGlobalSearchPhone('');
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium"
                                                >
                                                    Start New Sale
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={() => { setIsGlobalSearchModalOpen(false); setGlobalSearchResults([]); setGlobalSearchPhone(''); }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bulk Lead Upload Modal */}
            {
                isBulkUploadModalOpen && (
                    <BulkLeadUploadModal 
                        onClose={() => setIsBulkUploadModalOpen(false)} 
                        onSuccess={() => {
                            setIsBulkUploadModalOpen(false);
                            fetchLeads();
                            addToast("Leads imported successfully!", 'success');
                        }} 
                    />
                )
            }
        </div >
    );
};
