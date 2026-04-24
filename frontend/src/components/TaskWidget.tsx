import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CreateTaskModal } from './CreateTaskModal';

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
}

export const TaskWidget = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tasks`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const sorted = res.data.sort((a: Task, b: Task) => {
                if (a.isCompleted === b.isCompleted) return 0;
                return a.isCompleted ? 1 : -1;
            });
            setTasks(sorted);
        } catch (error) {
            console.error("Failed to load tasks", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTask = async (task: Task) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tasks/${task.id}`,
                { isCompleted: !task.isCompleted },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            fetchTasks();
        } catch (error) {
            console.error("Failed to update task", error);
        }
    };

    if (isLoading) return <div className="h-48 flex items-center justify-center text-gray-400">Loading tasks...</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <CheckCircle className="mr-2 text-blue-600" size={20} />
                    My Tasks
                </h3>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"
                    title="Add Task"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {tasks.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        <CheckCircle size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No tasks pending. Great job!</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className={`p-3 rounded-lg border ${task.isCompleted ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-blue-300'} transition-all group`}>
                            <div className="flex items-start">
                                <button
                                    onClick={() => toggleTask(task)}
                                    className={`mt-0.5 min-w-[18px] h-[18px] rounded border flex items-center justify-center mr-3 transition-colors ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'}`}
                                >
                                    {task.isCompleted && <CheckCircle size={12} fill="white" />}
                                </button>
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                        {task.title}
                                    </p>
                                    {task.description && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        {task.lead && (
                                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                                                {task.lead.fullName}
                                            </span>
                                        )}
                                        {task.dueDate && (
                                            <div className={`flex items-center text-xs ${new Date(task.dueDate) < new Date() && !task.isCompleted ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                                <Clock size={10} className="mr-1" />
                                                {new Date(task.dueDate).toLocaleDateString()}
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
