import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Search, Download, FileText, FileSpreadsheet, Building, Network, Globe } from 'lucide-react';
import { Pagination, getPaginatedData } from '../components/Pagination';
import { SalesDrawer } from '../components/SalesDrawer';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const GlobalClientsDatabase = () => {
    const { token, user } = useAuth();
    
    // Data States
    const [leads, setLeads] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('ALL');
    const [selectedBranch, setSelectedBranch] = useState('ALL');

    // Pagination
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState(20);

    // Sales Drawer State
    const [isSalesDrawerOpen, setIsSalesDrawerOpen] = useState(false);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [selectedCompany, selectedBranch]);

    const fetchMetadata = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompanies(res.data);
        } catch (error) {
            console.error('Failed to load companies mapping');
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            let params = new URLSearchParams();
            if (selectedCompany !== 'ALL') params.append('companyId', selectedCompany);
            if (selectedBranch !== 'ALL') params.append('branchId', selectedBranch);

            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/global-clients?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeads(res.data);
            setPage(1); // Reset pagination on new fetch
        } catch (error) {
            console.error('Failed to load global leads', error);
        } finally {
            setLoading(false);
        }
    };

    // Derived properties
    const activeCompanyData = selectedCompany !== 'ALL' ? companies.find(c => c.id === selectedCompany) : null;
    
    const filteredLeads = leads.filter(l => 
        (l.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (l.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (l.phone || '').includes(searchTerm)
    );

    const exportCSV = () => {
        if (filteredLeads.length === 0) return alert('No data to export.');
        
        const headers = ['Full Name', 'Gender', 'Phone', 'Email', 'Status', 'Company', 'Branch', 'Assigned To'];
        const csvContent = [
            headers.join(','),
            ...filteredLeads.map(l => [
                `"${l.fullName || ''}"`,
                `"${l.gender || 'N/A'}"`,
                `"${l.phone || ''}"`,
                `"${l.email || ''}"`,
                `"${l.status || ''}"`,
                `"${l.company?.name || ''}"`,
                `"${l.branch?.name || ''}"`,
                `"${l.assignedToUser?.fullName || 'Unassigned'}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `global_clients_database_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportPDF = () => {
        if (filteredLeads.length === 0) return alert('No data to export.');
        
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text('Global Clients Database', 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        
        const tableColumn = ['Name', 'Gender', 'Phone', 'Email', 'Status', 'Company', 'Branch'];
        const tableRows = filteredLeads.map(l => [
            l.fullName || 'N/A',
            l.gender || 'N/A',
            l.phone || 'N/A',
            l.email || 'N/A',
            l.status || 'N/A',
            l.company?.name || 'N/A',
            l.branch?.name || 'N/A'
        ]);

        // @ts-ignore
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
        });

        doc.save(`global_clients_database_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center">
                        <Globe className="mr-3 text-blue-600" size={32} />
                        Global Client Database
                    </h1>
                    <p className="text-gray-500 mt-1">Super Admin comprehensive view of all network prospects and clients.</p>
                </div>
                <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                    <button 
                        onClick={exportCSV}
                        className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-semibold border border-green-200 flex items-center shadow-sm transition"
                    >
                        <FileSpreadsheet size={16} className="mr-2" /> Export CSV
                    </button>
                    <button 
                        onClick={exportPDF}
                        className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-semibold border border-red-200 flex items-center shadow-sm transition"
                    >
                        <FileText size={16} className="mr-2" /> Export PDF
                    </button>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[250px] relative">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search Records</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name, phone or email..." 
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-all placeholder-gray-400"
                        />
                    </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                        <Building size={14} className="mr-1" /> Subsidiary Filter
                    </label>
                    <select 
                        value={selectedCompany} 
                        onChange={(e) => { setSelectedCompany(e.target.value); setSelectedBranch('ALL'); }}
                        className="w-full border-gray-200 py-2.5 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                        <option value="ALL">Entire Conglomerate</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                        <Network size={14} className="mr-1" /> Branch Filter
                    </label>
                    <select 
                        value={selectedBranch} 
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        disabled={selectedCompany === 'ALL'}
                        className="w-full border-gray-200 py-2.5 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="ALL">All Branches</option>
                        {(activeCompanyData?.branches || []).map((b: any) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Syncing Global Database...</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                        <h3 className="font-bold text-gray-700">Records Database</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                            Total Found: {filteredLeads.length}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs font-semibold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Client Identity</th>
                                    <th className="px-6 py-4">Contact Detail</th>
                                    <th className="px-6 py-4">Company Hierarchy</th>
                                    <th className="px-6 py-4">Assignment</th>
                                    <th className="px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                            No records matched your search parameters.
                                        </td>
                                    </tr>
                                ) : (
                                    getPaginatedData(filteredLeads, page, rows).map((l) => (
                                        <tr 
                                            key={l.id} 
                                            onClick={() => {
                                                setSelectedLeadId(l.id);
                                                setIsSalesDrawerOpen(true);
                                            }}
                                            className="transition-colors hover:bg-blue-50/30 cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{l.fullName}</div>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-gray-600 mr-2">
                                                        {l.gender || 'U'}
                                                    </span>
                                                    ID: {l.id.substring(0, 8)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-700 font-mono">{l.phone || 'N/A'}</div>
                                                <div className="text-xs text-gray-500 mt-1">{l.email || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-blue-900 text-xs bg-blue-50 w-max px-2 py-1 rounded border border-blue-100 mb-1">
                                                    {l.company?.name || 'Unassigned'}
                                                </div>
                                                <div className="text-xs text-gray-500 font-medium">
                                                    {l.branch?.name || 'HQ / No Branch'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-800">{l.assignedToUser?.fullName || 'Unassigned'}</div>
                                                <div className="text-[10px] text-gray-400 uppercase mt-0.5">Account Manager</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                                                    l.status === 'CLIENT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                    l.status === 'PROSPECT' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                                    'bg-gray-100 text-gray-800 border border-gray-200'
                                                }`}>
                                                    {l.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredLeads.length > 0 && <Pagination dataLength={filteredLeads.length} currentPage={page} rowsPerPage={rows} setPage={setPage} setRowsPerPage={setRows} />}
                </div>
            )}

            {/* Slide-over Sales Drawer */}
            {isSalesDrawerOpen && selectedLeadId && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
                        onClick={() => {
                            setIsSalesDrawerOpen(false);
                            setSelectedLeadId(null);
                        }}
                    ></div>
                    
                    {/* Drawer Panel */}
                    <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col h-full animate-slide-in-right z-10 border-l border-slate-200">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-20">
                            <h2 className="text-xl font-bold text-slate-800">Sales & Payments</h2>
                            <button 
                                onClick={() => {
                                    setIsSalesDrawerOpen(false);
                                    setSelectedLeadId(null);
                                }}
                                className="p-2 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                            <SalesDrawer leadId={selectedLeadId} onLeadUpdate={fetchLeads} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
