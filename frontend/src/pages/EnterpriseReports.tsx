import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FileSpreadsheet, Briefcase, CalendarClock, CreditCard } from 'lucide-react';

export const EnterpriseReports = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'FINANCIAL' | 'MARKETER_KPI' | 'HR_PAYROLL'>('FINANCIAL');
    
    // Filters
    const [dateRange, setDateRange] = useState('THIS_MONTH');
    const [customDates, setCustomDates] = useState({ startDate: '', endDate: '' });
    const [selectedCompany, setSelectedCompany] = useState('ALL');
    const [selectedBranch, setSelectedBranch] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    
    // Data State
    const [financialData, setFinancialData] = useState<any[]>([]);
    const [kpiData, setKpiData] = useState<any[]>([]);
    const [hrData, setHrData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Metadata State (for dropdowns)
    const [companies, setCompanies] = useState<any[]>([]);

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchReportData();
    }, [activeTab, dateRange, customDates, selectedCompany, selectedBranch, statusFilter]);

    const fetchMetadata = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/companies', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompanies(res.data);
        } catch (error) {
            console.error("Failed to load companies", error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            let start = new Date();
            let end = new Date();
            let params = new URLSearchParams();

            if (dateRange === 'TODAY') {
                start.setHours(0, 0, 0, 0);
            } else if (dateRange === 'LAST_7_DAYS') {
                start.setDate(new Date().getDate() - 7);
            } else if (dateRange === 'THIS_MONTH') {
                start.setDate(1);
            } else if (dateRange === 'YEAR_TO_DATE') {
                start.setMonth(0, 1);
            } else if (dateRange === 'CUSTOM' && customDates.startDate && customDates.endDate) {
                start = new Date(customDates.startDate);
                end = new Date(customDates.endDate);
            }

            if (dateRange !== 'ALL_TIME') {
                params.append('startDate', start.toISOString());
                params.append('endDate', end.toISOString());
            }

            if (selectedCompany !== 'ALL') params.append('companyId', selectedCompany);
            if (selectedBranch !== 'ALL') params.append('branchId', selectedBranch);

            if (activeTab === 'FINANCIAL') {
                if (statusFilter !== 'ALL') params.append('status', statusFilter);
                const res = await axios.get(`http://localhost:3000/api/analytics/enterprise/financial?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFinancialData(res.data.data);
            } else if (activeTab === 'MARKETER_KPI') {
                const res = await axios.get(`http://localhost:3000/api/analytics/enterprise/marketer-kpi?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setKpiData(res.data.data);
            } else if (activeTab === 'HR_PAYROLL') {
                const res = await axios.get(`http://localhost:3000/api/analytics/enterprise/hr-payroll?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHrData(res.data.data);
            }
        } catch (error) {
            console.error(`Failed to fetch ${activeTab} report`, error);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        let headers = [];
        let rows = [];

        if (activeTab === 'FINANCIAL') {
            headers = ['Date', 'Receipt ID', 'Customer', 'Phone', 'Company', 'Branch', 'Estate', 'Plot', 'Amount (NGN)', 'Method', 'Status', 'Recorded By'];
            rows = financialData.map(p => [
                new Date(p.date).toLocaleDateString(),
                p.reference,
                p.customerName,
                p.customerPhone,
                p.companyName,
                p.branchName,
                p.estateName,
                p.plotNumber,
                p.amount,
                p.method,
                p.status,
                p.recordedBy
            ]);
        } else if (activeTab === 'MARKETER_KPI') {
            headers = ['Staff Name', 'Company', 'Branch', 'Total Leads', 'Converted Leads', 'Conversion Rate (%)', 'Total Revenue Generated (NGN)'];
            rows = kpiData.map(m => [
                m.name,
                m.company,
                m.branch,
                m.totalLeads,
                m.convertedLeads,
                m.conversionRate,
                m.totalRevenue
            ]);
        } else if (activeTab === 'HR_PAYROLL') {
            headers = ['Staff Name', 'Role', 'Company', 'Branch', 'Period Days Logged', 'Present/Approved Leave', 'Days Absent', 'Days Late', 'Base Salary (NGN)', 'Estimated Payable (NGN)'];
            rows = hrData.map(h => [
                h.name,
                h.role,
                h.company,
                h.branch,
                h.totalDaysLogged,
                h.presentDays,
                h.absentDays,
                h.lateDays,
                h.baseSalary,
                h.netPayable
            ]);
        } else {
            return;
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(x => `"${(x || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Esthington_${activeTab}_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
    };

    const activeCompanyData = companies.find(c => c.id === selectedCompany);

    return (
        <div className="space-y-6">
            {/* Header & Export Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Enterprise Reporting</h1>
                    <p className="text-gray-500 mt-1">Deep dataset extraction and auditing suite.</p>
                </div>
                <div className="flex space-x-3 mt-4 md:mt-0">
                    <button 
                        onClick={downloadCSV}
                        disabled={loading || (activeTab === 'FINANCIAL' && financialData.length === 0) || (activeTab === 'MARKETER_KPI' && kpiData.length === 0) || (activeTab === 'HR_PAYROLL' && hrData.length === 0)}
                        className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileSpreadsheet size={18} />
                        <span>Export CSV</span>
                    </button>
                    {/* Add PDF Export button later if needed */}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-fit space-x-2">
                <button 
                    onClick={() => setActiveTab('FINANCIAL')}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'FINANCIAL' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <CreditCard size={18} />
                    <span>Financial Audit</span>
                </button>
                <button 
                    onClick={() => setActiveTab('MARKETER_KPI')}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'MARKETER_KPI' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Briefcase size={18} />
                    <span>Marketer & CRM KPIs</span>
                </button>
                <button 
                    onClick={() => setActiveTab('HR_PAYROLL')}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'HR_PAYROLL' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <CalendarClock size={18} />
                    <span>HR & Payroll Tracking</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Period</label>
                    <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)}
                        className="w-full border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                    >
                        <option value="TODAY">Today</option>
                        <option value="LAST_7_DAYS">Last 7 Days</option>
                        <option value="THIS_MONTH">This Month</option>
                        <option value="YEAR_TO_DATE">Year to Date</option>
                        <option value="ALL_TIME">All Time</option>
                        <option value="CUSTOM">Custom Range</option>
                    </select>
                </div>

                {dateRange === 'CUSTOM' && (
                    <div className="flex space-x-2 items-end">
                        <div>
                            <input type="date" value={customDates.startDate} onChange={e => setCustomDates({...customDates, startDate: e.target.value})} className="border-gray-200 rounded-lg text-sm bg-gray-50" />
                        </div>
                        <span className="mb-2 text-gray-400">to</span>
                        <div>
                            <input type="date" value={customDates.endDate} onChange={e => setCustomDates({...customDates, endDate: e.target.value})} className="border-gray-200 rounded-lg text-sm bg-gray-50" />
                        </div>
                    </div>
                )}

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Subsidiary</label>
                    <select 
                        value={selectedCompany} 
                        onChange={(e) => { setSelectedCompany(e.target.value); setSelectedBranch('ALL'); }}
                        className="w-full border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                    >
                        <option value="ALL">All Companies</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {selectedCompany !== 'ALL' && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Branch Filter</label>
                        <select 
                            value={selectedBranch} 
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="w-full border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                        >
                            <option value="ALL">All Branches</option>
                            {(activeCompanyData?.branches || []).map((b: any) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {activeTab === 'FINANCIAL' && (
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Txn Status</label>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending Approval</option>
                            <option value="APPROVED">Approved Docs</option>
                            <option value="DECLINED">Declined</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
                        <p className="text-gray-500 font-medium animate-pulse">Running enterprise data extraction...</p>
                    </div>
                ) : activeTab === 'FINANCIAL' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100 uppercase text-xs font-semibold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Receipt Ref</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Subsidiary</th>
                                    <th className="px-6 py-4">Purchase Info</th>
                                    <th className="px-6 py-4">Processed By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {financialData.map((txn, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500">{new Date(txn.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-mono text-gray-600">{txn.reference}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(txn.amount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                txn.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                                                txn.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {txn.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{txn.customerName}</div>
                                            <div className="text-xs text-gray-400">{txn.customerPhone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{txn.companyName}</div>
                                            <div className="text-xs text-gray-400">{txn.branchName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{txn.estateName}</div>
                                            <div className="text-xs text-gray-400">Plot {txn.plotNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{txn.recordedBy}</td>
                                    </tr>
                                ))}
                                {financialData.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-10 text-center text-gray-400 italic">No financial records found for these filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === 'MARKETER_KPI' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100 uppercase text-xs font-semibold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4">Subsidiary</th>
                                    <th className="px-6 py-4">Active Leads</th>
                                    <th className="px-6 py-4">Clients Converted</th>
                                    <th className="px-6 py-4">Conversion Rate</th>
                                    <th className="px-6 py-4">Total Revenue Generated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {kpiData.map((kpi, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{kpi.name}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-600">{kpi.company}</div>
                                            <div className="text-xs text-gray-400">{kpi.branch}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-center">{kpi.totalLeads}</td>
                                        <td className="px-6 py-4 font-semibold text-primary-600 text-center">{kpi.convertedLeads}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                parseFloat(kpi.conversionRate) > 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {kpi.conversionRate}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-black tracking-tight text-gray-800">{formatCurrency(kpi.totalRevenue)}</td>
                                    </tr>
                                ))}
                                {kpiData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">No marketer statistics found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === 'HR_PAYROLL' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100 uppercase text-xs font-semibold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4">Company/Branch</th>
                                    <th className="px-6 py-4">Days Logged</th>
                                    <th className="px-6 py-4">Attendance Quality</th>
                                    <th className="px-6 py-4">Base Salary</th>
                                    <th className="px-6 py-4">Estimated Pay (Deducted)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {hrData.map((hr, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{hr.name}</div>
                                            <div className="text-xs text-gray-400 capitalize">{hr.role.replace('_', ' ').toLowerCase()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-600">{hr.company}</div>
                                            <div className="text-xs text-gray-400">{hr.branch}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">
                                            {hr.totalDaysLogged} Days
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs">
                                                <span className="text-green-600 font-medium mr-2">{hr.presentDays} Present</span>
                                                {hr.lateDays > 0 && <span className="text-amber-600 font-medium mr-2">{hr.lateDays} Late</span>}
                                                {hr.absentDays > 0 && <span className="text-red-600 font-bold">{hr.absentDays} Absent</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">{formatCurrency(hr.baseSalary)}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(hr.netPayable)}</td>
                                    </tr>
                                ))}
                                {hrData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">No HR/Attendance records found for these filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>
            
        </div>
    );
};
