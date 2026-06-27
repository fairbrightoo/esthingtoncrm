import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Users, Search, Calendar, Briefcase, ChevronRight, X, UserCheck, TrendingUp, Target, Clock, AlertTriangle, Building2 } from 'lucide-react';

export const GMDStaffAnalytics = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [loadingBranches, setLoadingBranches] = useState(true);

    const [staffList, setStaffList] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal state
    const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
    const [performanceData, setPerformanceData] = useState<any | null>(null);
    const [loadingPerformance, setLoadingPerformance] = useState(false);
    
    // Date Filters
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // Start of current month
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (selectedBranchId) {
            fetchStaff(selectedBranchId);
        } else {
            setStaffList([]);
        }
    }, [selectedBranchId]);

    const fetchBranches = async () => {
        if (!user?.companyId) return;
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${user.companyId}/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(res.data);
            if (res.data.length > 0) {
                setSelectedBranchId(res.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch branches:', error);
            addToast('Failed to load branches', 'error');
        } finally {
            setLoadingBranches(false);
        }
    };

    const fetchStaff = async (branchId: string) => {
        if (!user?.companyId) return;
        setLoadingStaff(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${user.companyId}/branches/${branchId}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter out SUPER_ADMIN just in case
            setStaffList(res.data.filter((u: any) => u.role !== 'SUPER_ADMIN'));
        } catch (error) {
            console.error('Failed to fetch staff:', error);
            addToast('Failed to load branch staff', 'error');
        } finally {
            setLoadingStaff(false);
        }
    };

    const fetchPerformance = async (staffId: string) => {
        setLoadingPerformance(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/analytics/reports/md/staff/${staffId}`, {
                params: { startDate, endDate },
                headers: { Authorization: `Bearer ${token}` }
            });
            setPerformanceData(res.data);
        } catch (error) {
            console.error('Failed to fetch performance:', error);
            addToast('Failed to load performance metrics', 'error');
        } finally {
            setLoadingPerformance(false);
        }
    };

    // Effect to refetch if dates change while modal is open
    useEffect(() => {
        if (selectedStaff) {
            fetchPerformance(selectedStaff.id);
        }
    }, [startDate, endDate]);

    const handleSelectStaff = (staff: any) => {
        setSelectedStaff(staff);
        fetchPerformance(staff.id);
    };

    const closePanel = () => {
        setSelectedStaff(null);
        setPerformanceData(null);
    };

    const filteredStaff = staffList.filter(s => 
        s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-purple-900 to-indigo-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 w-full md:w-auto">
                    <h1 className="text-3xl font-bold mb-2">Global Staff Analytics</h1>
                    <p className="text-purple-100 max-w-xl mb-4">
                        Select any branch across the enterprise to monitor individual staff performance, track daily attendance, and review sales conversions.
                    </p>
                    
                    {/* Branch Selector */}
                    <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20 max-w-md">
                        <Building2 size={20} className="text-purple-200" />
                        <select 
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            className="bg-transparent text-white font-semibold outline-none flex-1 appearance-none cursor-pointer"
                        >
                            <option value="" disabled className="text-gray-900">Select a Branch...</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="relative z-10 mt-6 md:mt-0 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by name or role..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full md:w-80 pl-11 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-purple-200 rounded-xl outline-none focus:bg-white/20 focus:border-white/40 transition backdrop-blur-sm"
                        />
                    </div>
                </div>
                <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
                    <Users size={250} />
                </div>
            </header>

            {loadingBranches || loadingStaff ? (
                <div className="py-20 flex justify-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : !selectedBranchId ? (
                 <div className="py-20 text-center text-gray-500 bg-white rounded-2xl border border-dashed">
                    <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium">Please select a branch to view its staff.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStaff.map(staff => (
                        <div 
                            key={staff.id} 
                            onClick={() => handleSelectStaff(staff)}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-purple-200 hover:-translate-y-1 transition-all cursor-pointer group"
                        >
                            <div className="p-6">
                                <div className="flex items-center space-x-4 mb-4">
                                    {staff.passportUrl ? (
                                        <img src={staff.passportUrl} alt={staff.fullName} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl border-2 border-purple-100">
                                            {staff.fullName?.charAt(0) || '?'}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition">{staff.fullName}</h3>
                                        <div className="inline-flex items-center mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded tracking-wider">
                                            {staff.role?.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm text-gray-500 mt-4 pt-4 border-t border-gray-50">
                                    <span className="flex items-center"><Briefcase size={14} className="mr-1.5"/> View Analytics</span>
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredStaff.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500 bg-white rounded-2xl border border-dashed">
                            <Users size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-lg font-medium">No staff members found in this branch.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Performance Slide-Over Panel */}
            {selectedStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                    <div 
                        className="bg-gray-50 w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                    >
                        {/* Header */}
                        <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10 shrink-0">
                            <div className="flex items-center space-x-3">
                                {selectedStaff.passportUrl ? (
                                    <img src={selectedStaff.passportUrl} alt={selectedStaff.fullName} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                                        {selectedStaff.fullName?.charAt(0) || '?'}
                                    </div>
                                )}
                                <div>
                                    <h2 className="font-bold text-lg text-gray-900 leading-tight">{selectedStaff.fullName}</h2>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{selectedStaff.role?.replace('_', ' ')}</p>
                                </div>
                            </div>
                            <button onClick={closePanel} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="bg-white px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 shrink-0">
                            <div className="flex items-center text-sm font-semibold text-gray-700">
                                <Calendar size={16} className="mr-2 text-purple-500" /> Date Range:
                            </div>
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                                />
                                <span className="text-gray-400">to</span>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingPerformance ? (
                                <div className="flex items-center justify-center h-40">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                </div>
                            ) : performanceData ? (
                                <div className="space-y-6">
                                    {/* KPI Stats Row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Sales</p>
                                                    <h3 className="text-2xl font-black text-purple-700">₦{(performanceData.sales.volume || 0).toLocaleString()}</h3>
                                                </div>
                                                <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                                                    <TrendingUp size={20} />
                                                </div>
                                            </div>
                                            <div className="mt-4 text-xs font-semibold text-gray-500">
                                                Closed <span className="text-gray-900">{performanceData.sales.count}</span> deals
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Leads Gen</p>
                                                    <h3 className="text-2xl font-black text-emerald-600">{performanceData.leads.count}</h3>
                                                </div>
                                                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                                                    <Target size={20} />
                                                </div>
                                            </div>
                                            <div className="mt-4 text-xs font-semibold text-gray-500">
                                                New prospects acquired
                                            </div>
                                        </div>
                                    </div>

                                    {/* Attendance Summary */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="px-5 py-4 border-b border-gray-100 flex items-center bg-gray-50/50">
                                            <UserCheck size={18} className="text-indigo-500 mr-2" />
                                            <h3 className="font-bold text-gray-900">Attendance Overview</h3>
                                        </div>
                                        <div className="p-5 grid grid-cols-4 gap-4 text-center divide-x divide-gray-100">
                                            <div>
                                                <div className="text-2xl font-black text-green-600">{performanceData.attendance.daysPresent}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Present</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-black text-red-500">{performanceData.attendance.daysAbsent}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Absent</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-black text-orange-500">{performanceData.attendance.daysLate}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Late</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-black text-purple-500">{performanceData.attendance.daysLeave}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">On Leave</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Attendance Raw Logs */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                            <div className="flex items-center">
                                                <Clock size={18} className="text-gray-500 mr-2" />
                                                <h3 className="font-bold text-gray-900">Daily Clock-ins</h3>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {performanceData.attendance.rawLogs && performanceData.attendance.rawLogs.length > 0 ? (
                                                performanceData.attendance.rawLogs.map((log: any) => (
                                                    <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                                        <div>
                                                            <div className="font-medium text-gray-900 text-sm">
                                                                {new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </div>
                                                            {log.clockInTime && (
                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                    In: {new Date(log.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    {log.clockOutTime && ` • Out: ${new Date(log.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                                log.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                                                log.status === 'LATE' ? 'bg-orange-100 text-orange-700' :
                                                                log.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                                                'bg-purple-100 text-purple-700'
                                                            }`}>
                                                                {log.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center">
                                                    <AlertTriangle size={32} className="mb-2 text-gray-300" />
                                                    <p className="text-sm">No attendance records found for this period.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
