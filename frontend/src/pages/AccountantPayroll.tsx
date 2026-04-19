import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Banknote, Users, CheckCircle, Printer, Download, Wallet } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export const AccountantPayroll = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<any[]>([]);
    
    // Live Context Data
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [branchInfo, setBranchInfo] = useState<any>(null);
    
    // States
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Payslip Modal
    const [selectedSlip, setSelectedSlip] = useState<any>(null);
    const slipRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: slipRef,
        documentTitle: `Salary_Slip_${selectedSlip?.staffName?.replace(' ', '_')}_${month}_${year}`
    });

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:3000/api/payroll?month=${month}&year=${year}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecords(res.data);

            // Fetch live context context to ensure up-to-date logos and signatures
            if (user?.companyId) {
                const compRes = await axios.get(`http://localhost:3000/api/companies`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const myCompany = compRes.data.find((c: any) => c.id === user.companyId);
                setCompanyInfo(myCompany || null);

                if (user?.branchId) {
                    try {
                        const branchRes = await axios.get(`http://localhost:3000/api/companies/${user.companyId}/branches`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const myBranch = branchRes.data.find((b: any) => b.id === user.branchId);
                        setBranchInfo(myBranch || null);
                    } catch (e) { console.warn("Failed to fetch branch details"); }
                }
            }
        } catch (error) {
            console.error(error);
            addToast("Failed to fetch payroll records", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayroll();
    }, [month, year, token]);

    const handleDisburseSingle = async (id: string) => {
        try {
            await axios.post(`http://localhost:3000/api/payroll/disburse/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Salary marked as paid", "success");
            fetchPayroll();
        } catch (error) {
            addToast("Failed to disburse salary", "error");
        }
    };

    const handleMassDisburse = async () => {
        if (!confirm("Are you sure you want to mass-disburse all pending salaries for this month?")) return;
        try {
            await axios.post(`http://localhost:3000/api/payroll/disburse-mass`, { month, year }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Mass disbursement successful!", "success");
            fetchPayroll();
        } catch (error) {
            addToast("Failed to mass disburse salaries", "error");
        }
    };

    const totalBase = records.reduce((sum, r) => sum + r.baseSalary, 0);
    const totalNet = records.reduce((sum, r) => sum + r.netPay, 0);
    const pendingCount = records.filter(r => r.status === 'PENDING').length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Staff Payroll Manager</h1>
                    <p className="text-gray-500">Calculate net pay, track attendance deductions, and disburse salaries.</p>
                </div>
                <div className="mt-4 md:mt-0 flex space-x-2">
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="border border-gray-300 rounded-lg px-3 py-2 outline-none font-medium text-gray-700 bg-white shadow-sm"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select 
                        value={year} 
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="border border-gray-300 rounded-lg px-3 py-2 outline-none font-medium text-gray-700 bg-white shadow-sm"
                    >
                        {[year-1, year, year+1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </header>

            {loading ? (
                <div className="p-10 text-center text-gray-500 font-medium animate-pulse">Computing robust payroll data...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Staff</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{records.length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                <Banknote size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Base Salary Overhead</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">₦{totalBase.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                <Wallet size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Final Net Pay (w/ deductions)</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">₦{totalNet.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800">Monthly Payroll Ledger — {new Date(0, month - 1).toLocaleString('en', { month: 'long' })} {year}</h3>
                            {pendingCount > 0 && (
                                <button
                                    onClick={handleMassDisburse}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition flex items-center gap-2"
                                >
                                    <CheckCircle size={16} /> Disburse All Pending
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Staff Member</th>
                                        <th className="px-6 py-4 font-medium text-right">Base Pay</th>
                                        <th className="px-6 py-4 font-medium text-right text-red-500">Deductions</th>
                                        <th className="px-6 py-4 font-medium text-right text-green-600">Net Pay</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {records.map((r: any) => (
                                        <tr key={r.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{r.staffName}</div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{r.staffRole?.replace('_', ' ')}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">₦{r.baseSalary.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-medium text-red-500">- ₦{r.deductions.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-bold text-green-600 bg-green-50/30">₦{r.netPay.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                {r.status === 'PAID' ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold flex items-center w-max">
                                                        <CheckCircle size={12} className="mr-1" /> PAID
                                                    </span>
                                                ) : (
                                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">PENDING</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center flex-wrap gap-2">
                                                    <button 
                                                        onClick={() => setSelectedSlip(r)} 
                                                        className="text-blue-600 hover:bg-blue-50 border border-blue-200 px-3 py-1 rounded shadow-sm text-xs font-medium flex items-center transition"
                                                    >
                                                        <Printer size={14} className="mr-1" /> Slip
                                                    </button>
                                                    {r.status === 'PENDING' && (
                                                        <button 
                                                            onClick={() => handleDisburseSingle(r.id)}
                                                            className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded shadow-sm text-xs font-medium flex items-center transition"
                                                        >
                                                            Pay
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {records.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-400">No staff found in this branch.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Salary Slip Modal Overlay */}
            {selectedSlip && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0 z-10">
                            <h2 className="font-bold text-gray-800">Digital Salary Slip</h2>
                            <div className="flex space-x-3">
                                <button onClick={() => setSelectedSlip(null)} className="px-3 py-1.5 text-gray-600 bg-white border rounded hover:bg-gray-100 text-sm font-medium">Close</button>
                                <button onClick={() => handlePrint()} className="px-3 py-1.5 bg-blue-600 text-white rounded shadow text-sm font-medium hover:bg-blue-700 flex items-center">
                                    <Printer size={16} className="mr-2"/> Print to PDF
                                </button>
                            </div>
                        </div>

                        {/* Slip Content to Print */}
                        <div className="p-8 overflow-y-auto" ref={slipRef} style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                            <style>
                                {/* Hide border and shadow on print, enforce pure white bg */}
                                {`
                                @media print {
                                    body { background: white; margin: 0; padding: 0; }
                                    .print-container { box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; }
                                }
                                `}
                            </style>

                            <div className="print-container w-full mx-auto p-8 border border-gray-200 rounded-lg bg-white relative">
                                {/* Watermark Background optionally */}
                                
                                {/* Official Header */}
                                <div className="border-b-4 border-blue-900 pb-6 mb-8 flex justify-between items-start">
                                    <div className="flex flex-col">
                                        {(branchInfo?.logoUrl || companyInfo?.logoUrl || user?.company?.logoUrl) && (
                                            <img src={`http://localhost:3000${branchInfo?.logoUrl || companyInfo?.logoUrl || user?.company?.logoUrl}`} alt="Company Logo" className="h-12 object-contain mb-3 w-max" />
                                        )}
                                        <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">
                                            {companyInfo?.name || user?.company?.name || "Company Name"}
                                        </h1>
                                        <p className="text-gray-500 font-medium mt-1">{branchInfo?.address || user?.branch?.address || "Company Address"}</p>
                                        <p className="text-gray-500 text-sm">Official Salary Advice</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="bg-gray-100 px-4 py-2 rounded-lg inline-block border border-gray-200">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Payslip Period</p>
                                            <p className="text-lg font-bold text-gray-800">{new Date(year, month - 1).toLocaleString('en', { month: 'long', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Employee Details block */}
                                <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded border border-gray-100">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Employee Name</p>
                                        <p className="text-lg font-bold text-gray-900">{selectedSlip.staffName}</p>
                                        
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 mt-4">Designation / Role</p>
                                        <p className="text-sm font-semibold text-gray-700">{selectedSlip.staffRole?.replace('_', ' ')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Status</p>
                                        <p className={`text-sm font-bold uppercase tracking-widest ${selectedSlip.status === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {selectedSlip.status}
                                        </p>

                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 mt-4">Branch Location</p>
                                        <p className="text-sm font-semibold text-gray-700">{user?.branch?.name}</p>
                                    </div>
                                </div>

                                {/* Financial Ledger */}
                                <table className="w-full text-left mb-8">
                                    <thead className="border-b-2 border-gray-300">
                                        <tr>
                                            <th className="py-3 font-bold text-gray-800 uppercase text-sm tracking-wider">Earnings & Deductions</th>
                                            <th className="py-3 font-bold text-gray-800 uppercase text-sm tracking-wider text-right">Amount (₦)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <tr>
                                            <td className="py-4 text-gray-700 font-medium">Basic Salary</td>
                                            <td className="py-4 text-right font-semibold text-gray-900">{selectedSlip.baseSalary.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-4 text-red-500 font-medium">Late Attendance Deductions</td>
                                            <td className="py-4 text-right font-semibold text-red-500">- {selectedSlip.deductions.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-4 text-green-600 font-medium">Performance Bonus (Added manually)</td>
                                            <td className="py-4 text-right font-semibold text-green-600">+ {selectedSlip.bonuses.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot className="border-t-2 border-gray-900">
                                        <tr>
                                            <td className="py-4 text-xl font-black text-gray-900 uppercase">Net Pay Remitted</td>
                                            <td className="py-4 text-xl font-black text-gray-900 text-right underline decoration-double">₦{selectedSlip.netPay.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {/* Approval Stamp */}
                                <div className="mt-12 flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Disbursed on: {selectedSlip.paidAt ? new Date(selectedSlip.paidAt).toLocaleDateString() : 'N/A'}</p>
                                        <p className="text-xs text-gray-400 font-medium">System Reference ID: {selectedSlip.id}</p>
                                    </div>
                                    <div className="text-center">
                                        {/* Company/Branch Signature or Auth Mark */}
                                        {(branchInfo?.signatureUrl || companyInfo?.signatureUrl) ? (
                                            <img src={`http://localhost:3000${branchInfo?.signatureUrl || companyInfo?.signatureUrl}`} alt="MD Signature" className="h-16 mx-auto mb-2 opacity-80" />
                                        ) : (
                                            <div className="h-16 w-32 border-b-2 border-gray-400 mx-auto mb-2"></div>
                                        )}
                                        <p className="text-xs font-bold uppercase tracking-widest text-gray-600 border-t border-gray-300 pt-2 px-8">Authorized Signatory</p>
                                        <p className="text-sm font-bold text-gray-800 mt-1">{branchInfo?.managerName || companyInfo?.managingDirectorName || 'Managing Director'}</p>
                                        <p className="text-[10px] text-gray-500">{branchInfo?.name || companyInfo?.name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
