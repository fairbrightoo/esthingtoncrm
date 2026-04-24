import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CalendarClock, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react';

interface User {
    id: string;
    fullName: string;
    email: string;
    role: string;
    passportUrl?: string;
}

interface AttendanceRecord {
    id: string;
    userId: string;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'APPROVED_LEAVE';
    checkIn?: string;
    checkOut?: string;
    notes?: string;
}

export const BranchAttendance = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    const [staff, setStaff] = useState<User[]>([]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const effectiveCompanyId = user?.companyId || user?.company?.id;
    const effectiveBranchId = user?.branchId || user?.branch?.id;

    useEffect(() => {
        if (effectiveCompanyId && effectiveBranchId && token) {
            fetchData();
        }
    }, [effectiveCompanyId, effectiveBranchId, token, selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch users
            const usersRes = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${effectiveCompanyId}/branches/${effectiveBranchId}/users`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Filter for only rank-and-file staff (Marketers and Customer Care)
            const staffList = usersRes.data.filter((u: User) => ['MARKETER', 'CUSTOMER_CARE'].includes(u.role));
            setStaff(staffList);

            // Fetch attendance for selected date
            const dateStr = selectedDate.toISOString().split('T')[0];
            const attRes = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${effectiveCompanyId}/branches/${effectiveBranchId}/attendance?date=${dateStr}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const attendanceMap: Record<string, AttendanceRecord> = {};
            attRes.data.forEach((record: AttendanceRecord) => {
                attendanceMap[record.userId] = record;
            });
            setAttendance(attendanceMap);

        } catch (error) {
            console.error('Failed to load attendance data:', error);
            addToast('Failed to load attendance data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = async (userId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'APPROVED_LEAVE') => {
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${effectiveCompanyId}/branches/${effectiveBranchId}/attendance`,
                {
                    userId,
                    date: dateStr,
                    status
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setAttendance(prev => ({
                ...prev,
                [userId]: res.data
            }));

            addToast('Attendance updated', 'success');
        } catch (error) {
            console.error('Failed to mark attendance:', error);
            addToast('Failed to mark attendance', 'error');
        }
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PRESENT': return 'bg-green-100 text-green-800 border-green-200';
            case 'ABSENT': return 'bg-red-100 text-red-800 border-red-200';
            case 'LATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'HALF_DAY': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'APPROVED_LEAVE': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-400 border-gray-200';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <CalendarClock className="mr-3 text-blue-600" size={32} />
                        Daily Attendance
                    </h1>
                    <p className="text-gray-500 mt-2">Track and manage branch staff presence.</p>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
                        <ChevronLeft size={20} />
                    </button>
                    <input
                        type="date"
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                            if (e.target.value) {
                                setSelectedDate(new Date(e.target.value));
                            }
                        }}
                        className="w-40 text-center font-semibold text-gray-800 outline-none bg-transparent cursor-pointer"
                        max={new Date().toISOString().split('T')[0]}
                    />
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600" disabled={selectedDate.toDateString() === new Date().toDateString()}>
                        <ChevronRight size={20} className={selectedDate.toDateString() === new Date().toDateString() ? 'opacity-30' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-5 font-semibold text-gray-600 text-sm w-1/3">Staff Member</th>
                                <th className="p-5 font-semibold text-gray-600 text-sm">Role</th>
                                <th className="p-5 font-semibold text-gray-600 text-sm">Current Status</th>
                                <th className="p-5 font-semibold text-gray-600 text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">Loading staff data...</td>
                                </tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">No staff members found for this branch.</td>
                                </tr>
                            ) : (
                                staff.map(member => {
                                    const record = attendance[member.id];
                                    const status = record?.status;

                                    return (
                                        <tr key={member.id} className="hover:bg-gray-50/50 transition">
                                            <td className="p-5">
                                                <div className="flex items-center space-x-3">
                                                    {member.passportUrl ? (
                                                        <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${member.passportUrl}`} alt={member.fullName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                            <UserIcon size={20} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{member.fullName}</div>
                                                        <div className="text-xs text-gray-500">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                                    {member.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(status || '')}`}>
                                                    {status || 'UNMARKED'}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right space-x-2">
                                                <button
                                                    onClick={() => handleMarkAttendance(member.id, 'PRESENT')}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${status === 'PRESENT' ? 'bg-green-600 text-white shadow-md shadow-green-200' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                                                >
                                                    Present
                                                </button>
                                                <button
                                                    onClick={() => handleMarkAttendance(member.id, 'ABSENT')}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${status === 'ABSENT' ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                                                >
                                                    Absent
                                                </button>
                                                <button
                                                    onClick={() => handleMarkAttendance(member.id, 'LATE')}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${status === 'LATE' ? 'bg-yellow-500 text-white shadow-md shadow-yellow-200' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}
                                                >
                                                    Late
                                                </button>
                                                <button
                                                    onClick={() => handleMarkAttendance(member.id, 'APPROVED_LEAVE')}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${status === 'APPROVED_LEAVE' ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
                                                >
                                                    Leave
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
