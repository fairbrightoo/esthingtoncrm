import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, FileText, FileSpreadsheet, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { useToast } from '../context/ToastContext';

interface ReportData {
    month: number;
    year: number;
    branchId: string;
}

interface ReportsDashboardProps {
    embedded?: boolean;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ embedded }) => {
    const [activeTab, setActiveTab] = useState<'SALES' | 'PAYROLL'>('SALES');
    const [loading, setLoading] = useState(false);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [payrollData, setPayrollData] = useState<any[]>([]);
    
    const [filterMode, setFilterMode] = useState<'MONTHLY' | 'CUSTOM'>('MONTHLY');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [exactDateRange, setExactDateRange] = useState<{start: string, end: string} | null>(null);
    
    const [filters, setFilters] = useState<ReportData>({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        branchId: ''
    });

    const { addToast } = useToast();
    const token = localStorage.getItem('token');
    // Assuming branchId is stored in localStorage or decoded from token
    const userBranchId = JSON.parse(atob(token?.split('.')[1] || '{}'))?.branchId || '';

    useEffect(() => {
        if (!filters.branchId) {
            setFilters(prev => ({ ...prev, branchId: userBranchId }));
        }
    }, [userBranchId]);

    useEffect(() => {
        if (filters.branchId) {
            if (activeTab === 'SALES') {
                fetchSalesReport();
            } else {
                fetchPayrollReport();
            }
        }
    }, [activeTab, filters.month, filters.year, filters.branchId, filterMode, startDate, endDate]);

    const fetchSalesReport = async () => {
        if (filterMode === 'CUSTOM' && (!startDate || !endDate)) return;
        setLoading(true);
        try {
            const params: any = { branchId: filters.branchId };
            if (filterMode === 'MONTHLY') {
                params.month = filters.month;
                params.year = filters.year;
            } else {
                params.startDate = startDate;
                params.endDate = endDate;
            }
            
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/reports/sales`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setSalesData(res.data.data || res.data);
            if (res.data.exactStartDate && res.data.exactEndDate) {
                setExactDateRange({ start: res.data.exactStartDate, end: res.data.exactEndDate });
            } else {
                setExactDateRange(null);
            }
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to fetch sales report', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchPayrollReport = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payroll`, {
                params: { month: filters.month, year: filters.year, branchId: filters.branchId },
                headers: { Authorization: `Bearer ${token}` }
            });
            setPayrollData(res.data);
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to fetch payroll report', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    const formatCurrencyForExport = (amount: number) => {
        return `NGN ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    // Export Sales PDF
    const exportSalesPDF = () => {
        const doc = new jsPDF('landscape');
        doc.text(`Sales Report - ${filters.month}/${filters.year}`, 14, 15);
        
        const tableColumn = ["S/N", "Trans Date", "Clients", "Desc", "Sqm", "Corner", "Amount Paid", "Virtual Loan", "Comm Paid", "Referrer", "Ref Comm", "Estate", "Marketer", "Acct Paid To", "Sale Type", "Managing Branch"];
        const tableRows: any[] = [];

        let totalAmount = 0;
        let totalVirtualLoan = 0;
        let totalComm = 0;

        salesData.forEach(sale => {
            totalAmount += sale.amountPaid;
            totalVirtualLoan += sale.virtualLoanAmount || 0;
            totalComm += sale.commissionAccrued + (sale.referralCommissionAccrued || 0);
            const rowData = [
                sale.sn,
                formatDate(sale.date),
                sale.clientName,
                sale.description,
                sale.plotSize,
                sale.isCornerPiece,
                formatCurrencyForExport(sale.amountPaid),
                formatCurrencyForExport(sale.virtualLoanAmount || 0),
                formatCurrencyForExport(sale.commissionAccrued),
                sale.referrerName && sale.referrerName !== 'N/A' ? sale.referrerName : 'N/A',
                formatCurrencyForExport(sale.referralCommissionAccrued || 0),
                sale.estateName,
                sale.marketerName,
                sale.accountPaidTo,
                sale.saleType || 'Direct Sale',
                sale.managingBranchName || 'Head Office'
            ];
            tableRows.push(rowData);
        });

        tableRows.push(["", "", "", "", "", "GRAND TOTAL", formatCurrencyForExport(totalAmount), formatCurrencyForExport(totalVirtualLoan), formatCurrencyForExport(totalComm), "", "", "", "", "", "", ""]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [37, 99, 235] }
        });

        doc.save(`sales_report_${filters.month}_${filters.year}.pdf`);
    };

    // Export Sales CSV
    const exportSalesCSV = () => {
        const csvData = salesData.map(sale => ({
            "S/N": sale.sn,
            "Trans Date": formatDate(sale.date),
            "Clients": sale.clientName,
            "Description": sale.description,
            "Plot In Sqm": sale.plotSize,
            "Corner Piece": sale.isCornerPiece,
            "Amount Paid (N)": sale.amountPaid,
            "Virtual Loan (N)": sale.virtualLoanAmount || 0,
            "Comm Paid (N)": sale.commissionAccrued,
            "Referrer": sale.referrerName && sale.referrerName !== 'N/A' ? sale.referrerName : 'N/A',
            "Ref Comm (N)": sale.referralCommissionAccrued || 0,
            "Estate": sale.estateName,
            "Marketer": sale.marketerName,
            "Acct Paid To": sale.accountPaidTo,
            "Sale Type": sale.saleType || 'Direct Sale',
            "Managing Branch": sale.managingBranchName || 'Head Office'
        }));
        
        const totalAmount = salesData.reduce((sum, s) => sum + s.amountPaid, 0);
        const totalVirtualLoan = salesData.reduce((sum, s) => sum + (s.virtualLoanAmount || 0), 0);
        const totalComm = salesData.reduce((sum, s) => sum + s.commissionAccrued + (s.referralCommissionAccrued || 0), 0);
        
        csvData.push({
            "S/N": "" as any, "Trans Date": "", "Clients": "", "Description": "", "Plot In Sqm": "", 
            "Corner Piece": "GRAND TOTAL", 
            "Amount Paid (N)": totalAmount as any, 
            "Virtual Loan (N)": totalVirtualLoan as any,
            "Comm Paid (N)": totalComm as any, 
            "Referrer": "",
            "Ref Comm (N)": "",
            "Estate": "", "Marketer": "", "Acct Paid To": "", "Sale Type": "", "Managing Branch": ""
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `sales_report_${filters.month}_${filters.year}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export Payroll PDF
    const exportPayrollPDF = () => {
        const doc = new jsPDF();
        doc.text(`Staff Payroll - ${filters.month}/${filters.year}`, 14, 15);
        
        const tableColumn = ["S/N", "Beneficiary Name", "Designation", "Bank Name", "Account No.", "Gross", "Deductions", "Net Salary"];
        const tableRows: any[] = [];

        let totalNet = 0;

        payrollData.forEach((pay, index) => {
            totalNet += pay.netPay;
            const rowData = [
                index + 1,
                pay.staffName,
                pay.staffRole,
                pay.staff?.bankName || 'N/A',
                pay.staff?.accountNumber || 'N/A',
                formatCurrencyForExport(pay.baseSalary),
                formatCurrencyForExport(pay.deductions),
                formatCurrencyForExport(pay.netPay)
            ];
            tableRows.push(rowData);
        });

        tableRows.push(["", "", "", "", "", "", "GRAND TOTAL", formatCurrencyForExport(totalNet)]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [37, 99, 235] }
        });

        doc.save(`payroll_report_${filters.month}_${filters.year}.pdf`);
    };

    // Export Payroll CSV
    const exportPayrollCSV = () => {
        const csvData = payrollData.map((pay, index) => ({
            "S/N": index + 1,
            "Beneficiary Name": pay.staffName,
            "Designation": pay.staffRole,
            "Bank Name": pay.staff?.bankName || 'N/A',
            "Account No.": pay.staff?.accountNumber || 'N/A',
            "Gross": pay.baseSalary,
            "Deductions": pay.deductions,
            "Net Salary": pay.netPay
        }));
        
        const totalNet = payrollData.reduce((sum, p) => sum + p.netPay, 0);
        csvData.push({
            "S/N": "" as any,
            "Beneficiary Name": "",
            "Designation": "",
            "Bank Name": "",
            "Account No.": "",
            "Gross": "" as any,
            "Deductions": "GRAND TOTAL" as any,
            "Net Salary": totalNet
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `payroll_report_${filters.month}_${filters.year}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={embedded ? "space-y-6" : "p-6 max-w-7xl mx-auto space-y-6"}>
            <div className={`flex items-center ${embedded ? "justify-end mb-4" : "justify-between"}`}>
                {!embedded && <h1 className="text-2xl font-bold text-gray-800">Financial Reports</h1>}
                
                <div className="flex space-x-4 items-center">
                        {activeTab === 'SALES' && (
                            <select
                                value={filterMode}
                                onChange={(e) => setFilterMode(e.target.value as any)}
                                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                            >
                                <option value="MONTHLY">Monthly Cycle</option>
                                <option value="CUSTOM">Custom Date</option>
                            </select>
                        )}
                        {filterMode === 'MONTHLY' || activeTab === 'PAYROLL' ? (
                            <>
                                <select 
                                    value={filters.month} 
                                    onChange={(e) => setFilters(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                    ))}
                                </select>
                                
                                <select 
                                    value={filters.year} 
                                    onChange={(e) => setFilters(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                                <span className="text-gray-500 text-sm">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </>
                        )}
                </div>
            </div>

            <div className="flex space-x-1 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('SALES')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${
                        activeTab === 'SALES' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Monthly Sales Report
                </button>
                <button
                    onClick={() => setActiveTab('PAYROLL')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${
                        activeTab === 'PAYROLL' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Staff Payroll
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader className="animate-spin text-blue-600" size={40} />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Header Actions */}
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <div className="flex flex-col">
                            <h3 className="font-semibold text-gray-700 flex items-center">
                                {activeTab === 'SALES' ? 'Sales Report Data' : 'Payroll Report Data'}
                            </h3>
                            {activeTab === 'SALES' && exactDateRange && (
                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-max mt-1">
                                    ({new Date(exactDateRange.start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(exactDateRange.end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
                                </span>
                            )}
                        </div>
                        <div className="flex space-x-4 items-center">
                            {activeTab === 'SALES' && (
                                <div className="flex gap-4">
                                    <div className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm flex items-center">
                                        Total Sales: <span className="ml-2">{formatCurrency(salesData.reduce((sum, sale) => sum + sale.amountPaid, 0))}</span>
                                    </div>
                                    <div className="text-sm font-bold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm flex items-center">
                                        Total Virtual Loans: <span className="ml-2">{formatCurrency(salesData.reduce((sum, sale) => sum + (sale.virtualLoanAmount || 0), 0))}</span>
                                    </div>
                                    <div className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm flex items-center">
                                        Total Comm: <span className="ml-2">{formatCurrency(salesData.reduce((sum, sale) => sum + (sale.commissionAccrued || 0) + (sale.referralCommissionAccrued || 0), 0))}</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex space-x-3">
                                <button 
                                    onClick={activeTab === 'SALES' ? exportSalesCSV : exportPayrollCSV}
                                    className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 transition border border-green-200"
                                >
                                    <FileSpreadsheet size={16} />
                                    <span className="text-sm font-medium">Export CSV</span>
                                </button>
                                <button 
                                    onClick={activeTab === 'SALES' ? exportSalesPDF : exportPayrollPDF}
                                    className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition border border-red-200"
                                >
                                    <FileText size={16} />
                                    <span className="text-sm font-medium">Export PDF</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tables */}
                    <div className="overflow-x-auto">
                        {activeTab === 'SALES' ? (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-100 text-gray-600">
                                    <tr>
                                        <th className="p-3">S/N</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Client</th>
                                        <th className="p-3">Desc.</th>
                                        <th className="p-3">Sqm</th>
                                        <th className="p-3 text-center">Corner</th>
                                        <th className="p-3">Amount Paid</th>
                                        <th className="p-3 text-orange-600 bg-orange-50/50">Virtual Loan</th>
                                        <th className="p-3">Comm. Accrued</th>
                                        <th className="p-3 text-indigo-600 bg-indigo-50/50">Referrer</th>
                                        <th className="p-3 text-indigo-600 bg-indigo-50/50">Ref. Comm.</th>
                                        <th className="p-3">Estate</th>
                                        <th className="p-3">Marketer</th>
                                        <th className="p-3">Acct Paid To</th>
                                        <th className="p-3">Sale Type</th>
                                        <th className="p-3">Managing Branch</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {salesData.length === 0 ? (
                                        <tr><td colSpan={15} className="p-6 text-center text-gray-500">No sales records found for this period.</td></tr>
                                    ) : (
                                        salesData.map((sale, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-3 text-gray-500">{sale.sn}</td>
                                                <td className="p-3">{formatDate(sale.date)}</td>
                                                <td className="p-3 font-medium text-gray-800">{sale.clientName}</td>
                                                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${sale.description === 'NP' ? 'bg-blue-100 text-blue-700' : sale.description === 'FP' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{sale.description}</span></td>
                                                <td className="p-3">{sale.plotSize}</td>
                                                <td className="p-3 text-center">{sale.isCornerPiece}</td>
                                                <td className="p-3 font-semibold text-emerald-600">{formatCurrency(sale.amountPaid)}</td>
                                                <td className="p-3 font-medium text-orange-600 bg-orange-50/10">{sale.virtualLoanAmount > 0 ? formatCurrency(sale.virtualLoanAmount) : <span className="text-gray-400 font-normal">₦0</span>}</td>
                                                <td className="p-3 text-gray-600">{formatCurrency(sale.commissionAccrued)}</td>
                                                <td className="p-3 text-indigo-600 bg-indigo-50/10 font-medium">{sale.referrerName && sale.referrerName !== 'N/A' ? sale.referrerName : <span className="text-gray-400 font-normal">N/A</span>}</td>
                                                <td className="p-3 text-indigo-600 bg-indigo-50/10 font-bold">{sale.referralCommissionAccrued > 0 ? formatCurrency(sale.referralCommissionAccrued) : <span className="text-gray-400 font-normal">₦0</span>}</td>
                                                <td className="p-3">{sale.estateName}</td>
                                                <td className="p-3 text-gray-600">{sale.marketerName}</td>
                                                <td className="p-3 text-indigo-600 font-medium">{sale.accountPaidTo}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                                                        sale.saleType === 'Inbound Cross-Sale' ? 'bg-purple-100 text-purple-700' : 
                                                        sale.saleType === 'Outbound Cross-Sale' ? 'bg-orange-100 text-orange-700' : 
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>{sale.saleType || 'Direct Sale'}</span>
                                                </td>
                                                <td className="p-3 font-semibold text-gray-700">{sale.managingBranchName || 'Head Office'}</td>
                                            </tr>
                                        ))
                                    )}
                                    {salesData.length > 0 && (
                                        <tr className="bg-gray-50 border-t-2">
                                            <td colSpan={6} className="p-3 text-right font-bold text-gray-800">GRAND TOTAL:</td>
                                            <td className="p-3 font-bold text-emerald-700">{formatCurrency(salesData.reduce((sum, s) => sum + s.amountPaid, 0))}</td>
                                            <td className="p-3 font-bold text-orange-700">{formatCurrency(salesData.reduce((sum, s) => sum + (s.virtualLoanAmount || 0), 0))}</td>
                                            <td className="p-3 font-bold text-gray-600">{formatCurrency(salesData.reduce((sum, s) => sum + s.commissionAccrued, 0))}</td>
                                            <td></td>
                                            <td className="p-3 font-bold text-indigo-600">{formatCurrency(salesData.reduce((sum, s) => sum + (s.referralCommissionAccrued || 0), 0))}</td>
                                            <td colSpan={5} className="text-right p-3">
                                                <span className="font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-lg">
                                                    Total All Commissions: {formatCurrency(salesData.reduce((sum, s) => sum + (s.commissionAccrued || 0) + (s.referralCommissionAccrued || 0), 0))}
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-100 text-gray-600">
                                    <tr>
                                        <th className="p-3">S/N</th>
                                        <th className="p-3">Beneficiary Name</th>
                                        <th className="p-3">Designation</th>
                                        <th className="p-3">Bank Name</th>
                                        <th className="p-3">Account No.</th>
                                        <th className="p-3">Gross</th>
                                        <th className="p-3">Deductions</th>
                                        <th className="p-3">Net Salary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payrollData.length === 0 ? (
                                        <tr><td colSpan={8} className="p-6 text-center text-gray-500">No payroll records found for this period.</td></tr>
                                    ) : (
                                        <>
                                            {payrollData.map((pay, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="p-3 text-gray-500">{i + 1}</td>
                                                    <td className="p-3 font-medium text-gray-800">{pay.staffName}</td>
                                                    <td className="p-3 text-gray-600">{pay.staffRole}</td>
                                                    <td className="p-3">{pay.staff?.bankName || 'N/A'}</td>
                                                    <td className="p-3">{pay.staff?.accountNumber || 'N/A'}</td>
                                                    <td className="p-3 text-gray-600">{formatCurrency(pay.baseSalary)}</td>
                                                    <td className="p-3 text-red-500">{formatCurrency(pay.deductions)}</td>
                                                    <td className="p-3 font-bold text-emerald-600">{formatCurrency(pay.netPay)}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-gray-50 border-t-2">
                                                <td colSpan={7} className="p-3 text-right font-bold text-gray-800">GRAND TOTAL:</td>
                                                <td className="p-3 font-bold text-emerald-700">{formatCurrency(payrollData.reduce((sum, p) => sum + p.netPay, 0))}</td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
