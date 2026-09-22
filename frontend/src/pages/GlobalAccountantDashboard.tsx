import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Globe, Building2, MapPin } from 'lucide-react';
import { AccountantDashboard } from './AccountantDashboard';
import { AccountantPayroll } from './AccountantPayroll';
import GlobalTreasuryDashboard from './GlobalTreasuryDashboard';

export const GlobalAccountantDashboard = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<any[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCompanies(res.data);
            } catch (err) {
                console.error("Failed to fetch companies", err);
            }
        };
        fetchCompanies();
    }, [token]);

    // Derived branches for the selected company
    const activeCompany = companies.find(c => c.id === selectedCompanyId);
    const branches = activeCompany?.branches || [];

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center">
                        <Globe className="mr-3 text-primary-600" size={32} />
                        Global Financial Command Center
                    </h1>
                    <p className="text-gray-500 mt-1">Enterprise-wide accounting, payroll, and disbursement oversight.</p>
                </div>
            </div>

            {/* Branch Selector Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                        <Building2 size={14} className="mr-1" /> Select Subsidiary
                    </label>
                    <select 
                        value={selectedCompanyId} 
                        onChange={(e) => {
                            setSelectedCompanyId(e.target.value);
                            setSelectedBranchId('');
                        }}
                        className="w-full border-gray-200 rounded-lg focus:ring-primary-500 bg-gray-50"
                    >
                        <option value="">-- View Global Aggregate --</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                        <MapPin size={14} className="mr-1" /> Select Branch
                    </label>
                    <select 
                        value={selectedBranchId} 
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        disabled={!selectedCompanyId}
                        className="w-full border-gray-200 rounded-lg focus:ring-primary-500 bg-gray-50 disabled:opacity-50"
                    >
                        <option value="">-- All Branches --</option>
                        {branches.map((b: any) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="mt-6">
                <Routes>
                    <Route path="/" element={<GlobalTreasuryDashboard />} />
                    
                    {/* Re-use existing dashboards by passing target branch down */}
                    <Route path="/disbursements" element={<AccountantDashboard targetBranchId={selectedBranchId} />} />
                    <Route path="/payroll" element={<AccountantPayroll targetBranchId={selectedBranchId} />} />
                    
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/dashboard/global-accountant" replace />} />
                </Routes>
            </div>
        </div>
    );
};
