import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Calendar, User, FileText } from 'lucide-react';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: () => void;
    preselectedLeadId?: string;
}

export const CreateTaskModal = ({ isOpen, onClose, onTaskCreated, preselectedLeadId }: CreateTaskModalProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [leadId, setLeadId] = useState(preselectedLeadId || '');
    const [leads, setLeads] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && !leads.length) {
            fetchLeads();
        }
    }, [isOpen]);

    const fetchLeads = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/leads', { // Using lead listing endpoint
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLeads(res.data);
        } catch (error) {
            console.error("Failed to fetch leads", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await axios.post('http://localhost:3000/api/tasks', {
                title,
                description,
                dueDate,
                leadId: leadId || undefined
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            onTaskCreated();
            onClose();
            // Reset form
            setTitle('');
            setDescription('');
            setDueDate('');
            setLeadId('');
        } catch (error) {
            console.error("Failed to create task", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-gray-800 mb-6">Create New Task</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Call client about proposal"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            <FileText size={14} className="mr-1" /> Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Add details..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Calendar size={14} className="mr-1" /> Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <User size={14} className="mr-1" /> Related Lead
                            </label>
                            <select
                                value={leadId}
                                onChange={(e) => setLeadId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">None</option>
                                {leads.map(lead => (
                                    <option key={lead.id} value={lead.id}>
                                        {lead.fullName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? 'Creating...' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
