import React, { useState, useEffect, useRef } from 'react';
import { 
    Users, 
    Search, 
    Plus, 
    Upload, 
    Trash2, 
    Edit, 
    CheckCircle, 
    XCircle, 
    RefreshCw, 
    Tag, 
    MapPin, 
    Phone, 
    Mail, 
    X, 
    Filter,
    FileSpreadsheet,
    Sparkles
} from 'lucide-react';
import axios from 'axios';
import type { BroadcastContact } from './types';
import { normalizePhoneNumber, formatPhoneDisplay } from './phoneUtils';
import { parseSpreadsheetFile } from './spreadsheetParser';
import { useToast } from '../../context/ToastContext';

interface BroadcastPhonebookProps {
    token: string | null;
    onSelectAudienceForBroadcast?: (contacts: BroadcastContact[]) => void;
}

export const BroadcastPhonebook: React.FC<BroadcastPhonebookProps> = ({ token, onSelectAudienceForBroadcast }) => {
    const { addToast } = useToast();
    const [contacts, setContacts] = useState<BroadcastContact[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [selectedSite, setSelectedSite] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Meta filters
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [availableSites, setAvailableSites] = useState<string[]>([]);

    // Modals
    const [showContactModal, setShowContactModal] = useState(false);
    const [editingContact, setEditingContact] = useState<BroadcastContact | null>(null);
    const [contactForm, setContactForm] = useState({
        name: '',
        phone: '',
        email: '',
        site: '',
        gender: '',
        title: '',
        tags: '',
        notes: ''
    });
    const [isSavingContact, setIsSavingContact] = useState(false);

    // Import Modal
    const [showImportModal, setShowImportModal] = useState(false);
    const [importTag, setImportTag] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchFiltersMeta = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/bulk-messaging/contacts/filters`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailableTags(res.data.tags || []);
            setAvailableSites(res.data.sites || []);
        } catch (err) {
            console.error("Failed to load filter metadata:", err);
        }
    };

    const fetchContacts = async (currentPage = 1, currentSearch = search, currentTag = selectedTag, currentSite = selectedSite) => {
        setIsLoading(true);
        try {
            const params: any = { page: currentPage, limit: 25 };
            if (currentSearch.trim()) params.search = currentSearch.trim();
            if (currentTag) params.tag = currentTag;
            if (currentSite) params.site = currentSite;

            const res = await axios.get(`${API_URL}/api/bulk-messaging/contacts`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setContacts(res.data.contacts || []);
            setTotal(res.data.total || 0);
            setPage(res.data.page || 1);
            setTotalPages(res.data.totalPages || 1);
        } catch (err: any) {
            console.error("Failed to fetch contacts:", err);
            addToast("Failed to fetch phonebook contacts", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiltersMeta();
        fetchContacts(1, search, selectedTag, selectedSite);
    }, [selectedTag, selectedSite]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchContacts(1, search, selectedTag, selectedSite);
    };

    const openAddModal = () => {
        setEditingContact(null);
        setContactForm({
            name: '',
            phone: '',
            email: '',
            site: '',
            gender: '',
            title: '',
            tags: '',
            notes: ''
        });
        setShowContactModal(true);
    };

    const openEditModal = (c: BroadcastContact) => {
        setEditingContact(c);
        setContactForm({
            name: c.name,
            phone: c.phone,
            email: c.email || '',
            site: c.site || '',
            gender: c.gender || '',
            title: c.title || '',
            tags: (c.tags || []).join(', '),
            notes: c.notes || ''
        });
        setShowContactModal(true);
    };

    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactForm.name || !contactForm.phone) {
            return addToast("Full Name and Phone Number are required", "error");
        }

        setIsSavingContact(true);
        try {
            const parsedTags = contactForm.tags
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);

            const payload = {
                name: contactForm.name.trim(),
                phone: contactForm.phone.trim(),
                email: contactForm.email.trim() || null,
                site: contactForm.site.trim() || null,
                gender: contactForm.gender || null,
                title: contactForm.title.trim() || null,
                tags: parsedTags,
                notes: contactForm.notes.trim() || null
            };

            if (editingContact) {
                await axios.put(`${API_URL}/api/bulk-messaging/contacts/${editingContact.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                addToast("Contact updated successfully", "success");
            } else {
                await axios.post(`${API_URL}/api/bulk-messaging/contacts`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                addToast("Contact added to Phonebook", "success");
            }

            setShowContactModal(false);
            fetchContacts(page, search, selectedTag, selectedSite);
            fetchFiltersMeta();
        } catch (err: any) {
            addToast(err.response?.data?.error || "Failed to save contact", "error");
        } finally {
            setIsSavingContact(false);
        }
    };

    const handleDeleteContact = async (c: BroadcastContact) => {
        if (!window.confirm(`Are you sure you want to delete ${c.name} (${c.phone})?`)) return;
        try {
            await axios.delete(`${API_URL}/api/bulk-messaging/contacts/${c.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Contact deleted", "success");
            fetchContacts(page, search, selectedTag, selectedSite);
            fetchFiltersMeta();
        } catch (err: any) {
            addToast("Failed to delete contact", "error");
        }
    };

    const handleImportSpreadsheet = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const result = await parseSpreadsheetFile(file);
            
            const syncRes = await axios.post(`${API_URL}/api/bulk-messaging/contacts/sync`, {
                contacts: result.contacts,
                tag: importTag.trim() || result.detectedSite || undefined
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const summary = syncRes.data.summary;
            addToast(
                `Sync complete: +${summary.addedCount} new, ${summary.updatedCount} updated, ${summary.skippedCount} skipped`,
                "success"
            );

            setShowImportModal(false);
            setImportTag('');
            fetchContacts(1, search, selectedTag, selectedSite);
            fetchFiltersMeta();
        } catch (err: any) {
            addToast(err.message || "Failed to import spreadsheet", "error");
        } finally {
            setIsImporting(false);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
        }
    };

    const normalizedPhonePreview = normalizePhoneNumber(contactForm.phone);

    return (
        <div className="space-y-6">
            {/* Action & Filter Header */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search phonebook by name, phone, email, or site..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        />
                    </form>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 shrink-0">
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                        >
                            <Upload size={14} className="mr-1.5" />
                            Import Spreadsheet
                        </button>
                        <button
                            onClick={openAddModal}
                            className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition active:scale-95"
                        >
                            <Plus size={15} className="mr-1.5" />
                            New Contact
                        </button>
                    </div>
                </div>

                {/* Filter Pills (Tags & Sites) */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
                    <span className="font-bold text-gray-400 uppercase tracking-wider flex items-center">
                        <Filter size={12} className="mr-1" />
                        Filters:
                    </span>

                    {/* Tag Filter */}
                    <select
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Tags / Groups</option>
                        {availableTags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>

                    {/* Site Filter */}
                    <select
                        value={selectedSite}
                        onChange={(e) => setSelectedSite(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Sites / Properties</option>
                        {availableSites.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {(selectedTag || selectedSite || search) && (
                        <button
                            onClick={() => {
                                setSelectedTag('');
                                setSelectedSite('');
                                setSearch('');
                                fetchContacts(1, '', '', '');
                            }}
                            className="text-blue-600 hover:text-blue-800 font-bold ml-auto"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Contacts Table */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                        <thead className="bg-gray-50/75 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Client Name</th>
                                <th className="px-6 py-4">Phone Number</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Site / Estate</th>
                                <th className="px-6 py-4">Tags</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                        Loading contacts...
                                    </td>
                                </tr>
                            ) : contacts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="font-bold text-gray-700">No contacts found</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Import a CSV/Excel sheet or click "+ New Contact" above.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                contacts.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50/60 transition group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{c.name}</p>
                                                    {c.gender && (
                                                        <span className="text-[11px] text-gray-400">{c.gender}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-semibold text-gray-800">
                                            {formatPhoneDisplay(c.phone)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {c.email || <span className="text-gray-300 italic">None</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.site ? (
                                                <span className="inline-flex items-center text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                                                    <MapPin size={11} className="mr-1 text-gray-400" />
                                                    {c.site}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 italic text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {c.tags && c.tags.length > 0 ? (
                                                    c.tags.map(tag => (
                                                        <span key={tag} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-300 text-xs italic">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1 opacity-80 group-hover:opacity-100">
                                                <button
                                                    onClick={() => openEditModal(c)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Edit Contact"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteContact(c)}
                                                    className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                    title="Delete Contact"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer with Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">
                        Showing {contacts.length} of {total.toLocaleString()} saved contacts
                    </span>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                const newP = Math.max(1, page - 1);
                                setPage(newP);
                                fetchContacts(newP, search, selectedTag, selectedSite);
                            }}
                            disabled={page <= 1 || isLoading}
                            className="px-3 py-1.5 font-bold bg-gray-50 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition"
                        >
                            Previous
                        </button>
                        <span className="font-bold text-gray-700">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => {
                                const newP = Math.min(totalPages, page + 1);
                                setPage(newP);
                                fetchContacts(newP, search, selectedTag, selectedSite);
                            }}
                            disabled={page >= totalPages || isLoading}
                            className="px-3 py-1.5 font-bold bg-gray-50 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Add / Edit Contact Modal */}
            {showContactModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingContact ? "Edit Contact" : "Add New Contact"}
                            </h3>
                            <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveContact} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={contactForm.name}
                                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                    placeholder="e.g. Chief Emeka Obi"
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Phone Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={contactForm.phone}
                                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                    placeholder="e.g. 07045763306 or 2347045763306"
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                />
                                {normalizedPhonePreview && (
                                    <p className="text-[11px] text-blue-600 mt-1 font-medium">
                                        Canonical Storage: <span className="font-mono font-bold">{normalizedPhonePreview}</span> ({formatPhoneDisplay(normalizedPhonePreview)})
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        placeholder="client@gmail.com"
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Site / Property
                                    </label>
                                    <input
                                        type="text"
                                        value={contactForm.site}
                                        onChange={(e) => setContactForm({ ...contactForm, site: e.target.value })}
                                        placeholder="e.g. Double King Villa"
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Gender
                                    </label>
                                    <select
                                        value={contactForm.gender}
                                        onChange={(e) => setContactForm({ ...contactForm, gender: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Tags (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={contactForm.tags}
                                        onChange={(e) => setContactForm({ ...contactForm, tags: e.target.value })}
                                        placeholder="VIP, Subscriber, Lead"
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowContactModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingContact}
                                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                                >
                                    {isSavingContact ? "Saving..." : "Save Contact"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Spreadsheet Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                                <FileSpreadsheet className="text-emerald-600" size={20} />
                                <h3 className="text-lg font-bold text-gray-900">Import Contacts</h3>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            <p className="text-xs text-gray-500">
                                Upload a <strong>.csv</strong> or <strong>.xlsx / .xls</strong> spreadsheet. Contacts with existing phone numbers will automatically be updated with new details instead of duplicated.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Assign Tag / Group to this Batch (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={importTag}
                                    onChange={(e) => setImportTag(e.target.value)}
                                    placeholder="e.g. Double King Villa Oct 2026"
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                />
                            </div>

                            <input
                                type="file"
                                ref={importFileInputRef}
                                onChange={handleImportSpreadsheet}
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                            />

                            <button
                                type="button"
                                disabled={isImporting}
                                onClick={() => importFileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-8 text-center transition flex flex-col items-center justify-center group"
                            >
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white rounded-xl flex items-center justify-center mb-3 transition shadow-sm">
                                    {isImporting ? <RefreshCw size={24} className="animate-spin" /> : <Upload size={24} />}
                                </div>
                                <span className="text-sm font-bold text-gray-900">
                                    {isImporting ? "Processing & Syncing..." : "Choose Excel (.xlsx) or CSV"}
                                </span>
                                <span className="text-xs text-gray-400 mt-1">
                                    Supports Name, Phone, Email, Site, Gender
                                </span>
                            </button>

                            <div className="flex justify-end pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowImportModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
