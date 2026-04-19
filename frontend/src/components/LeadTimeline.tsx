import { useState, useEffect } from 'react';
import axios from 'axios';
import { Phone, MessageSquare, MapPin, Mail, MessageCircle, ArrowDownLeft, ArrowUpRight, Send, Lock, Trash2, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Activity {
    id: string;
    type: 'CALL' | 'SMS' | 'SITE_VISIT' | 'WHATSAPP' | 'EMAIL';
    direction: 'INBOUND' | 'OUTBOUND';
    notes?: string;
    timestamp: string;
    createdByUser?: {
        id: string;
        fullName: string;
        role: string;
    };
}

interface LeadTimelineProps {
    leadId: string;
    onClose?: () => void;
    initialTab?: 'ACTIVITY' | 'TASKS' | 'SALES';
    onLeadUpdate?: () => void;
}

import { SalesDrawer } from './SalesDrawer';
import { BiodataTab } from './BiodataTab';

// ...

import { SendMessageModal } from './SendMessageModal';

// ...

export const LeadTimeline = ({ leadId, onClose, initialTab = 'ACTIVITY', onLeadUpdate }: LeadTimelineProps) => {
    const { user } = useAuth();
    const [lead, setLead] = useState<any>(null); // New lead state
    const [activities, setActivities] = useState<Activity[]>([]);
    const [newNote, setNewNote] = useState('');
    const [activityType, setActivityType] = useState('CALL');

    // Task State
    const [activeTab, setActiveTab] = useState<'ACTIVITY' | 'TASKS' | 'SALES' | 'BIODATA'>(initialTab as any);
    const [tasks, setTasks] = useState<any[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false); // Modal state
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<string | null>(null);

    const fetchLead = async () => { // New fetch lead
        try {
            const res = await axios.get(`http://localhost:3000/api/leads/${leadId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLead(res.data);
        } catch (error) {
            console.error("Failed to load lead", error);
        }
    };

    const fetchActivities = async () => {
        try {
            const res = await axios.get(`http://localhost:3000/api/leads/${leadId}/activities`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setActivities(res.data);
        } catch (error) {
            console.error("Failed to load activities", error);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/tasks', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            // Client-side filtering for now
            setTasks(res.data.filter((t: any) => t.leadId === leadId));
        } catch (error) {
            console.error("Failed to load tasks", error);
        }
    };

    useEffect(() => {
        fetchLead(); // Fetch lead on mount
        fetchActivities();
        fetchTasks();
    }, [leadId]);

    const handleTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3000/api/tasks', {
                title: newTaskTitle,
                dueDate: newTaskDate || undefined,
                leadId
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setNewTaskTitle('');
            setNewTaskDate('');
            fetchTasks(); // Refresh
        } catch (error) {
            console.error("Failed to create task", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`http://localhost:3000/api/leads/${leadId}/activities`, {
                type: activityType,
                direction: 'OUTBOUND', // Default for now, maybe add toggle
                notes: newNote
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setNewNote('');
            fetchActivities();
        } catch (error) {
            console.error("Failed to log activity", error);
        }
    };

    const handleDeleteActivity = async (activityId: string) => {
        setIsDeleting(activityId);
        setDeleteConfirmModal(null); // Close modal when deleting starts
        try {
            await axios.delete(`http://localhost:3000/api/leads/${leadId}/activities/${activityId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchActivities();
        } catch (error) {
            console.error("Failed to delete activity", error);
            alert("Failed to delete activity.");
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="h-full flex flex-col relative"> {/* Relative for modal */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="sticky top-0 bg-white z-10 border-b mb-4 pb-2 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex space-x-6">
                        <button
                            onClick={() => setActiveTab('ACTIVITY')}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ACTIVITY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Activity Log
                        </button>
                        <button
                            onClick={() => setActiveTab('TASKS')}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'TASKS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Tasks
                        </button>
                        <button
                            onClick={() => setActiveTab('SALES')}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'SALES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Sales & Payments
                        </button>
                        <button
                            onClick={() => setActiveTab('BIODATA')}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'BIODATA' ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Biodata
                        </button>
                    </div>

                    <div className="flex items-center space-x-3">
                        {lead?.equityWalletBalance > 0 && (
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-md border border-green-200" title="Available surplus equity from previous transactions">
                                <span className="text-[10px] font-bold uppercase tracking-wider">Equity Wallet:</span>
                                <span className="font-bold text-sm">₦{lead.equityWalletBalance.toLocaleString()}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setIsMessageModalOpen(true)}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                            <Send size={14} />
                            <span>Message</span>
                        </button>
                    </div>
                </div>

                {lead && (
                    <SendMessageModal
                        isOpen={isMessageModalOpen}
                        onClose={() => setIsMessageModalOpen(false)}
                        leadId={lead.id}
                        leadName={lead.fullName}
                        leadEmail={lead.email}
                        leadPhone={lead.phone}
                    />
                )}

                {activeTab === 'SALES' ? (
                    <SalesDrawer leadId={leadId} onLeadUpdate={onLeadUpdate} />
                ) : activeTab === 'BIODATA' ? (
                    <BiodataTab leadId={leadId} onUpdate={fetchLead} />
                ) : activeTab === 'ACTIVITY' ? (
                    <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">

                        {activities.length === 0 && <p className="text-gray-400 pl-8">No activities recorded yet.</p>}

                        {activities.map((activity) => (
                            <div key={activity.id} className="relative pl-8">
                                {/* Icon */}
                                <div className={`absolute -left-[17px] top-0 w-9 h-9 rounded-full border-4 border-white flex items-center justify-center ${getActivityColor(activity.type)
                                    }`}>
                                    {getActivityIcon(activity.type)}
                                </div>

                                {/* Content */}
                                <div className={`rounded-lg p-4 transition-colors ${activity.createdByUser?.role === 'CUSTOMER_CARE' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
                                    }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-gray-800">{activity.type.replace('_', ' ')}</span>
                                            {/* Badge for Creator */}
                                            <span className="text-xs font-medium text-gray-500">
                                                by {activity.createdByUser?.fullName} ({activity.createdByUser?.role})
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xs text-gray-500">
                                                {new Date(activity.timestamp).toLocaleString()}
                                            </span>
                                            {(activity.createdByUser?.id === user?.id || user?.role === 'SUPER_ADMIN' || user?.role === 'BRANCH_ADMIN') && (
                                                <button
                                                    onClick={() => setDeleteConfirmModal(activity.id)}
                                                    disabled={isDeleting === activity.id}
                                                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                    title="Delete Note"
                                                >
                                                    {isDeleting === activity.id ? <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 text-sm">{activity.notes}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tasks.length === 0 && <div className="text-gray-400 text-center py-8">No tasks scheduled for this lead.</div>}
                        {tasks.map(task => (
                            <div key={task.id} className="bg-white border rounded p-3 flex items-start">
                                <div className={`mt-1 mr-3 w-4 h-4 rounded-full border-2 ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}></div>
                                <div>
                                    <p className={`text-sm font-medium ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
                                    {task.dueDate && <p className="text-xs text-gray-500 mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-gray-50">
                {activeTab === 'ACTIVITY' ? (
                    <form onSubmit={handleSubmit}>
                        <div className="flex space-x-2 mb-3 overflow-x-auto pb-2">
                            {['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'SITE_VISIT'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setActivityType(type)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${activityType === type ? getActivityColor(type) + ' text-white' : 'bg-white border text-gray-600'
                                        }`}
                                >
                                    {type.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder={user?.role === 'MARKETER' ? "Add a private note..." : "Log activity notes..."}
                                className="w-full border border-gray-300 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                rows={2}
                            />
                            <button
                                type="submit"
                                disabled={!newNote.trim()}
                                className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        {user?.role === 'MARKETER' && (
                            <p className="text-xs text-gray-500 mt-2 flex items-center">
                                <Lock size={12} className="mr-1" /> Only you can see your notes. Customer Care logs are visible to both.
                            </p>
                        )}
                    </form>
                ) : (
                    <form onSubmit={handleTaskSubmit} className="space-y-3">
                        <input
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <div className="flex space-x-2">
                            <input
                                type="date"
                                value={newTaskDate}
                                onChange={(e) => setNewTaskDate(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex-1">
                                Add Task
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 rounded-xl">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto mb-4">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Delete Note?</h3>
                            <p className="text-center text-gray-500 text-sm mb-6">
                                Are you sure you want to permanently delete this activity log? This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setDeleteConfirmModal(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteActivity(deleteConfirmModal)}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors text-sm flex justify-center items-center"
                                >
                                    {isDeleting === deleteConfirmModal ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "Delete Note"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const getActivityIcon = (type: string) => {
    switch (type) {
        case 'CALL': return <Phone size={16} className="text-white" />;
        case 'SMS': return <MessageSquare size={16} className="text-white" />;
        case 'SITE_VISIT': return <MapPin size={16} className="text-white" />;
        case 'WHATSAPP': return <MessageCircle size={16} className="text-white" />;
        case 'EMAIL': return <Mail size={16} className="text-white" />;
        default: return <Phone size={16} className="text-white" />;
    }
};

const getActivityColor = (type: string) => {
    switch (type) {
        case 'CALL': return 'bg-indigo-500';
        case 'SMS': return 'bg-yellow-500';
        case 'SITE_VISIT': return 'bg-purple-500';
        case 'WHATSAPP': return 'bg-green-500';
        case 'EMAIL': return 'bg-gray-500';
        default: return 'bg-blue-500';
    }
};
