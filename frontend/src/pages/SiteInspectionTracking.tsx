import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, User } from 'lucide-react';

export const SiteInspectionTracking = () => {
    const { token, user } = useAuth();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const branchId = user?.branchId || user?.branch?.id;
    const companyId = user?.companyId || user?.company?.id;

    useEffect(() => {
        if (companyId && branchId) {
            fetchInspectionTasks();
        }
    }, [companyId, branchId]);

    const fetchInspectionTasks = async () => {
        try {
            // Fetch all tasks for the branch where type='INSPECTION'
            // We'll need a backend endpoint for this or we can filter client-side if we fetch all branch tasks
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches/${branchId}/tasks/inspections`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data);
        } catch (error) {
            console.error("Failed to fetch inspection tasks", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10">Loading tracking data...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Inspection Tracking Hub</h1>
                <p className="text-gray-500 mt-1">Live view of all marketer-scheduled inspections across your branch.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium text-sm">
                        <tr>
                            <th className="px-6 py-4">Lead / Client</th>
                            <th className="px-6 py-4">Scheduled By</th>
                            <th className="px-6 py-4">Scheduled Date</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tasks.map(task => (
                            <tr key={task.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-800">
                                    {task.lead?.fullName || 'Unknown Client'}
                                </td>
                                <td className="px-6 py-4 text-gray-600 flex items-center">
                                    <User size={14} className="mr-2" />
                                    {task.assignedToUser?.fullName || 'Unknown Marketer'}
                                </td>
                                <td className="px-6 py-4 text-gray-600 flex items-center">
                                    <Calendar size={14} className="mr-2" />
                                    {new Date(task.dueDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${task.isCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {task.isCompleted ? 'Completed' : 'Pending'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {tasks.length === 0 && <div className="p-8 text-center text-gray-500">No scheduled inspections found in your branch.</div>}
            </div>
        </div>
    );
};
