import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Download, FileSpreadsheet, User as UserIcon } from 'lucide-react';

interface PayrollRecord {
    userId: string;
    fullName: string;
    role: string;
    baseSalary: number;
    daysPresent: number;
    daysAbsent: number;
    daysLate: number;
    daysLeave: number;
    totalDeductions: number;
    netSalary: number;
}

export const BranchPayroll = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const effectiveCompanyId = user?.companyId || user?.company?.id;
    const effectiveBranchId = user?.branchId || user?.branch?.id;

    useEffect(() => {
        if (effectiveCompanyId && effectiveBranchId && token) {
            fetchPayroll();
        }
    }, [effectiveCompanyId, effectiveBranchId, token, selectedMonth, selectedYear]);

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `http://localhost:3000/api/companies/${effectiveCompanyId}/branches/${effectiveBranchId}/payroll?month=${selectedMonth}&year=${selectedYear}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPayroll(res.data);
        } catch (error) {
            console.error('Failed to load payroll data:', error);
            addToast('Failed to load payroll data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (payroll.length === 0) return;

        const headers = ['Staff Name', 'Role', 'Base Salary (NGN)', 'Days Present', 'Days Absent', 'Days Late', 'Approved Leave', 'Total Deductions (NGN)', 'Net Salary (NGN)'];
        const csvContent = [
            headers.join(','),
            ...payroll.map(r => [
                `"${r.fullName}"`,
                `"${r.role.replace('_', ' ')}"`,
                r.baseSalary,
                r.daysPresent,
                r.daysAbsent,
                r.daysLate,
                r.daysLeave,
                r.totalDeductions,
                r.netSalary
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Payroll_${effectiveBranchId}_${selectedYear}_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <FileSpreadsheet className="mr-3 text-green-600" size={32} />
                        Payroll Report
                    </h1>
                    <p className="text-gray-500 mt-2">View monthly net salaries and attendance deductions.</p>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-transparent font-semibold text-gray-800 outline-none cursor-pointer"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                        <span className="text-gray-300">/</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-transparent font-semibold text-gray-800 outline-none cursor-pointer"
                        >
                            {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={exportToCSV}
                        disabled={payroll.length === 0}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
                    >
                        <Download size={20} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-5 font-semibold text-gray-600 text-sm">Staff Member</th>
                                <th className="p-5 font-semibold text-gray-600 text-sm">Role</th>
                                <th className="p-5 font-semibold text-gray-600 text-sm text-right">Base Salary</th>
                                <th className="p-5 font-semibold text-gray-600 text-sm text-center" colSpan={4}>Attendance Summary</th>
                                <th className="p-5 font-semibold text-gray-600 text-sm text-right text-red-600 bg-red-50/30">Deductions</th>
                                <th className="p-5 font-semibold text-gray-600 text-sm text-right bg-green-50/50 text-green-800">Net Salary</th>
                            </tr>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500">
                                <th colSpan={3}></th>
                                <th className="p-3 text-center border-l bg-green-50/30">Present</th>
                                <th className="p-3 text-center">Leave</th>
                                <th className="p-3 text-center bg-yellow-50/30">Late</th>
                                <th className="p-3 text-center border-r bg-red-50/30">Absent</th>
                                <th colSpan={2}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400">Loading payroll data...</td>
                                </tr>
                            ) : payroll.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-500">No staff found for this period.</td>
                                </tr>
                            ) : (
                                payroll.map(record => (
                                    <tr key={record.userId} className="hover:bg-gray-50/50 transition whitespace-nowrap">
                                        <td className="p-5 font-medium text-gray-900">
                                            {record.fullName}
                                        </td>
                                        <td className="p-5">
                                            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                                {record.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right font-medium text-gray-700">
                                            {formatCurrency(record.baseSalary)}
                                        </td>
                                        <td className="p-5 text-center font-bold text-green-600 border-l bg-green-50/10">
                                            {record.daysPresent}
                                        </td>
                                        <td className="p-5 text-center text-gray-500">
                                            {record.daysLeave}
                                        </td>
                                        <td className="p-5 text-center font-semibold text-yellow-600 bg-yellow-50/10">
                                            {record.daysLate}
                                        </td>
                                        <td className="p-5 text-center font-bold text-red-600 border-r bg-red-50/10">
                                            {record.daysAbsent}
                                        </td>
                                        <td className="p-5 text-right font-semibold text-red-600 bg-red-50/10">
                                            -{formatCurrency(record.totalDeductions)}
                                        </td>
                                        <td className="p-5 text-right font-bold text-green-700 text-lg bg-green-50/30">
                                            {formatCurrency(record.netSalary)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
