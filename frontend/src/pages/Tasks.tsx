import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, CheckCircle, Circle, Calendar, User, Search, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CreateTaskModal } from '../components/CreateTaskModal';

interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    isCompleted: boolean;
    lead?: {
        id: string;
        fullName: string;
    };
    assignedToUserId: string;
}

export const Tasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('http://localhost:3000/api/tasks', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setTasks(res.data);
        } catch (error) {
            console.error("Failed to load tasks", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTask = async (task: Task) => {
        // Optimistic update
        const updatedTasks = tasks.map(t =>
            t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t
        );
        setTasks(updatedTasks);

        try {
            await axios.put(`http://localhost:3000/api/tasks/${task.id}`,
                { isCompleted: !task.isCompleted },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            // Re-fetch to ensure sync/sorting
            fetchTasks();
        } catch (error) {
            console.error("Failed to update task", error);
            // Revert on error
            fetchTasks();
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'pending') return !task.isCompleted;
        if (filter === 'completed') return task.isCompleted;
        return true;
    });

    const pendingCount = tasks.filter(t => !t.isCompleted).length;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My Tasks</h1>
                    <p className="text-gray-500">You have {pendingCount} pending tasks</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} className="mr-2" />
                    New Task
                </button>
            </div>

            {/* Filters */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-1">
                <button
                    onClick={() => setFilter('pending')}
                    className={`pb-3 px-2 font-medium text-sm transition-colors relative ${filter === 'pending' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Pending
                    {filter === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setFilter('completed')}
                    className={`pb-3 px-2 font-medium text-sm transition-colors relative ${filter === 'completed' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Completed
                    {filter === 'completed' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`pb-3 px-2 font-medium text-sm transition-colors relative ${filter === 'all' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    All Tasks
                    {filter === 'all' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                </button>
            </div>

            {/* Task List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-12 text-gray-400">Loading tasks...</div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                        <CheckCircle size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-gray-500 font-medium">No {filter} tasks found</h3>
                        <p className="text-gray-400 text-sm mt-1">Create a new task to get started</p>
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all shadow-sm group">
                            <div className="flex items-start">
                                <button
                                    onClick={() => toggleTask(task)}
                                    className={`mt-1 min-w-[20px] h-[20px] rounded-full border flex items-center justify-center mr-4 transition-colors ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'}`}
                                >
                                    {task.isCompleted && <CheckCircle size={14} fill="white" />}
                                </button>
                                <div className="flex-1">
                                    <h3 className={`font-medium text-lg ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</h3>
                                    {task.description && <p className="text-gray-500 mt-1">{task.description}</p>}

                                    <div className="flex items-center space-x-4 mt-3">
                                        {task.dueDate && (
                                            <div className={`flex items-center text-sm ${new Date(task.dueDate) < new Date() && !task.isCompleted ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                                <Calendar size={14} className="mr-1.5" />
                                                {new Date(task.dueDate).toLocaleDateString()}
                                            </div>
                                        )}
                                        {task.lead && (
                                            <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                <User size={14} className="mr-1.5" />
                                                {task.lead.fullName}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTaskCreated={fetchTasks}
            />
        </div>
    );
};
