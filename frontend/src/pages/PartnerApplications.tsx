import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { FileText, CheckCircle, XCircle, Search, UserCheck } from 'lucide-react';


export const PartnerApplications = () => {
    const { addToast } = useToast();
    const { user } = useAuth();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [commissionRate, setCommissionRate] = useState<number | string>('');
    const [staffList, setStaffList] = useState<any[]>([]);
    const [manualUplineId, setManualUplineId] = useState<string>('');

    const fetchApplications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/partners/applications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApplications(res.data);
        } catch (error) {
            console.error(error);
            addToast('Failed to fetch applications', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleVet = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/partners/applications/${id}/vet`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('Application vetted successfully', 'success');
            fetchApplications();
        } catch (error) {
            addToast('Failed to vet application', 'error');
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Are you sure you want to reject this partner application?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/partners/applications/${id}/reject`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('Application rejected', 'success');
            fetchApplications();
        } catch (error) {
            addToast('Failed to reject application', 'error');
        }
    };

    const openApproveModal = async (app: any) => {
        setSelectedApp(app);
        setManualUplineId('');
        if (app.referralCode) {
            setCommissionRate(app.referralCode.percentage);
        } else {
            setCommissionRate('');
            try {
                const token = localStorage.getItem('token');
                const companyIdToFetch = app.assignedCompanyId || user?.companyId;
                const branchIdToFetch = app.assignedBranchId || user?.branchId;
                if (companyIdToFetch && branchIdToFetch) {
                    const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyIdToFetch}/branches/${branchIdToFetch}/users`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setStaffList(res.data);
                }
            } catch (error) {
                console.error('Failed to fetch staff list', error);
            }
        }
        setIsApproveModalOpen(true);
    };

    const confirmApprove = async () => {
        if (!selectedApp) return;
        if (!commissionRate && commissionRate !== 0) {
            addToast('Please set a commission rate', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const payload: any = { commissionRate: Number(commissionRate) };
            if (manualUplineId) {
                payload.manualUplineId = manualUplineId;
            }

            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/partners/applications/${selectedApp.id}/approve`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('Application approved. Welcome email sent!', 'success');
            setIsApproveModalOpen(false);
            fetchApplications();
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to approve application', 'error');
        }
    };

    const isHR = user?.role === 'BRANCH_HR' || user?.role === 'GLOBAL_HR';
    const isMD = user?.role === 'MANAGING_DIRECTOR' || user?.role === 'GROUP_MANAGING_DIRECTOR' || user?.role === 'GENERAL_MANAGER';

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Partner Applications</h1>
                    <p className="text-gray-500">Review and manage incoming partner registrations.</p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="py-4 px-6">Applicant</th>
                                    <th className="py-4 px-6">Contact</th>
                                    <th className="py-4 px-6">Company / Type</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Docs</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-10">Loading...</td></tr>
                                ) : applications.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">No applications found.</td></tr>
                                ) : (
                                    applications.map(app => (
                                        <tr key={app.id} className="hover:bg-gray-50/50">
                                            <td className="py-4 px-6">
                                                <p className="font-semibold text-gray-900">{app.fullName}</p>
                                                <p className="text-xs text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</p>
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="text-gray-800">{app.email}</p>
                                                <p className="text-gray-500">{app.phone}</p>
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="font-medium">{app.companyName || 'Individual'}</p>
                                                {app.referralCode ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                                        Ref: {app.referralCode.creator?.fullName} ({app.referralCode.percentage}%)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                                                        Direct Branch Partner
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                                    app.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                    app.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    app.status === 'VETTED' ? 'bg-indigo-100 text-indigo-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {app.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {app.documentsUrl ? (
                                                    <a href={app.documentsUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                                        <FileText size={16} /> View Docs
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400">None</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right space-x-2">
                                                {app.status === 'PENDING' && isHR && (
                                                    <button onClick={() => handleVet(app.id)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors">
                                                        Mark Vetted
                                                    </button>
                                                )}

                                                {(app.status === 'PENDING' || app.status === 'VETTED') && isMD && (
                                                    <>
                                                        <button onClick={() => openApproveModal(app)} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors">
                                                            Approve
                                                        </button>
                                                        <button onClick={() => handleReject(app.id)} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors">
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Approval Modal */}
            {isApproveModalOpen && selectedApp && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Partner: {selectedApp.fullName}</h3>
                        
                        {!selectedApp.referralCode && (
                            <div className="mb-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Set Commission Rate (%) for this Direct Partner
                                    </label>
                                    <input
                                        type="number"
                                        value={commissionRate}
                                        onChange={(e) => setCommissionRate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 15"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        This percentage will be sent to them in their welcome email.
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Assign to Staff's Downline (Optional)
                                    </label>
                                    <select
                                        value={manualUplineId}
                                        onChange={(e) => setManualUplineId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                    >
                                        <option value="">-- Do Not Assign (Defaults to MD) --</option>
                                        {staffList.map(staff => (
                                            <option key={staff.id} value={staff.id}>
                                                {staff.fullName} ({staff.role})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Use this if a staff member recruited them but couldn't generate a code because the partner's commission is higher than theirs.
                                    </p>
                                </div>
                            </div>
                        )}

                        {selectedApp.referralCode && (
                            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <p className="text-sm text-blue-800">
                                    <strong>Pre-determined Commission:</strong> {selectedApp.referralCode.percentage}%
                                </p>
                                <p className="text-xs text-blue-600 mt-1">Referred by {selectedApp.referralCode.creator?.fullName}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsApproveModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmApprove}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Confirm Approval
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
