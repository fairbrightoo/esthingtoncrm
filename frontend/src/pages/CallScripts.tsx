import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Plus, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Script {
    id: string;
    title: string;
    content: string;
    category: string;
}

export const CallScripts = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [scripts, setScripts] = useState<Script[]>([]);
    const [selectedScript, setSelectedScript] = useState<Script | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formTitle, setFormTitle] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formCategory, setFormCategory] = useState('Introduction');

    const canManageScripts = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'CUSTOMER_CARE', 'MARKETER'].includes(user?.role || '');

    useEffect(() => {
        fetchScripts();
    }, []);

    const fetchScripts = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/scripts`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setScripts(res.data);
            if (res.data.length > 0 && !selectedScript) {
                setSelectedScript(res.data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch scripts", error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedScript && isEditing) {
                // Update
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/scripts/${selectedScript.id}`, {
                    title: formTitle,
                    content: formContent,
                    category: formCategory
                }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            } else {
                // Create
                await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/scripts`, {
                    title: formTitle,
                    content: formContent,
                    category: formCategory
                }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            }
            setIsEditing(false);
            setFormTitle('');
            setFormContent('');
            fetchScripts();
            addToast('Script saved successfully', 'success');
        } catch (error) {
            addToast('Failed to save script', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this script?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/scripts/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchScripts();
            if (selectedScript?.id === id) setSelectedScript(null);
        } catch (error) {
            console.error(error);
        }
    };

    const startEdit = (script: Script) => {
        setSelectedScript(script);
        setFormTitle(script.title);
        setFormContent(script.content);
        setFormCategory(script.category);
        setIsEditing(true);
    };

    const startNew = () => {
        setSelectedScript(null);
        setFormTitle('');
        setFormContent('');
        setFormCategory('Introduction');
        setIsEditing(true);
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-gray-700 flex items-center">
                        <BookOpen size={18} className="mr-2" /> Scripts
                    </h2>
                    {canManageScripts && (
                        <button onClick={startNew} className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700">
                            <Plus size={16} />
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {scripts.map(script => (
                        <div
                            key={script.id}
                            onClick={() => { setSelectedScript(script); setIsEditing(false); }}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedScript?.id === script.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                        >
                            <h4 className="font-semibold text-gray-800">{script.title}</h4>
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                                {script.category}
                            </span>
                        </div>
                    ))}
                    {scripts.length === 0 && <div className="p-4 text-gray-400 text-center text-sm">No scripts found.</div>}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 flex flex-col bg-gray-50">
                {isEditing ? (
                    <form onSubmit={handleSave} className="flex-1 flex flex-col bg-white p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-bold mb-4">{selectedScript ? 'Edit Script' : 'New Script'}</h3>
                        <input
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="Script Title (e.g. Cold Call Intro)"
                            className="border p-2 rounded mb-3 outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <select
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                            className="border p-2 rounded mb-3 outline-none"
                        >
                            <option>Introduction</option>
                            <option>Objection Handling</option>
                            <option>Closing</option>
                            <option>Follow-up</option>
                            <option>Voicemail</option>
                        </select>
                        <textarea
                            value={formContent}
                            onChange={(e) => setFormContent(e.target.value)}
                            placeholder="Write your script here..."
                            className="flex-1 border p-2 rounded mb-4 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                            required
                        />
                        <div className="flex justify-end space-x-3">
                            <button type="button" onClick={() => setIsEditing(false)} className="text-gray-600">Cancel</button>
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Script</button>
                        </div>
                    </form>
                ) : selectedScript ? (
                    <div className="flex-1 flex flex-col bg-white p-6 rounded-xl shadow-sm">
                        <div className="flex justify-between items-start mb-6 border-b pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{selectedScript.title}</h2>
                                <span className="text-sm text-gray-500">{selectedScript.category}</span>
                            </div>
                            {canManageScripts && (
                                <div className="flex space-x-2">
                                    <button onClick={() => startEdit(selectedScript)} className="text-gray-400 hover:text-blue-600"><Edit2 size={18} /></button>
                                    <button onClick={() => handleDelete(selectedScript.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                                </div>
                            )}
                        </div>
                        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {selectedScript.content}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Select a script to view
                    </div>
                )}
            </div>
        </div>
    );
};
