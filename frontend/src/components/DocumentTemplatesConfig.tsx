import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Save, Code, FileText, Settings2, Info } from 'lucide-react';

export const DocumentTemplatesConfig = () => {
    const { token, user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [companies, setCompanies] = useState<any[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedType, setSelectedType] = useState('OFFER');
    const [editorContent, setEditorContent] = useState('');

    const documentTypes = [
        { id: 'OFFER', label: 'Offer Letter' },
        { id: 'PROVISIONAL_ALLOCATION', label: 'Provisional Allocation Letter' },
        { id: 'FINAL_ALLOCATION', label: 'Final Allocation Letter' }
    ];

    const availableTags = [
        { tag: '{{CLIENT_NAME}}', desc: 'Full Name of the buyer' },
        { tag: '{{CLIENT_ADDRESS}}', desc: 'Buyer\'s Address' },
        { tag: '{{CLIENT_PHONE}}', desc: 'Buyer\'s Phone Number' },
        { tag: '{{ESTATE_NAME}}', desc: 'Name of the Estate' },
        { tag: '{{LOCATION}}', desc: 'Estate Location' },
        { tag: '{{PLOT_SIZE}}', desc: 'Area in sqm' },
        { tag: '{{PLOT_NUMBER}}', desc: 'Assigned Plot No.' },
        { tag: '{{PROTOTYPE}}', desc: 'Housing Prototype (e.g. 5 Bedroom)' },
        { tag: '{{AGREED_PRICE}}', desc: 'Total Price (Formatted)' },
        { tag: '{{AMOUNT_PAID}}', desc: 'Total Paid out so far' },
        { tag: '{{BALANCE_OUTSTANDING}}', desc: 'Remaining Balance' },
        { tag: '{{CURRENT_DATE}}', desc: 'Today\'s Date' },
        { tag: '{{CORNER_PIECE_TAG}}', desc: 'Renders a stylish CORNER PIECE badge if applicable' },
    ];

    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (selectedCompanyId || user?.role !== 'SUPER_ADMIN') {
            fetchTemplates();
        }
    }, [selectedCompanyId, user]);

    useEffect(() => {
        const found = templates.find(t => t.type === selectedType);
        if (found) {
            setEditorContent(found.content);
        } else {
            setEditorContent('<p>Start typing your terms and conditions here...</p>\n<p>Dear {{CLIENT_NAME}},</p>');
        }
    }, [selectedType, templates]);

    const fetchCompanies = async () => {
        if (user?.role !== 'SUPER_ADMIN') return;
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompanies(res.data);
            if (res.data.length > 0) {
                setSelectedCompanyId(res.data[0].id);
            }
        } catch (error) {
            console.error("Failed to load companies");
        }
    };

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const url = user?.role === 'SUPER_ADMIN' && selectedCompanyId 
                ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/documents/templates?companyId=${selectedCompanyId}` 
                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/documents/templates`;

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplates(res.data);
        } catch (error) {
            console.error("Failed to fetch templates", error);
            toast.error("Failed to load document templates");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editorContent.trim()) {
            toast.error("Template content cannot be empty");
            return;
        }

        setIsSaving(true);
        try {
            const url = user?.role === 'SUPER_ADMIN' && selectedCompanyId 
                ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/documents/templates?companyId=${selectedCompanyId}` 
                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/documents/templates`;

            await axios.post(url, {
                type: selectedType,
                content: editorContent
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`${selectedType.replace('_', ' ')} template saved!`);
            fetchTemplates(); // Refresh
        } catch (error) {
            console.error("Failed to save template", error);
            toast.error("Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading templates...</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">HTML Document Engine</h2>
                        <p className="text-sm text-gray-500">Configure formatting and legal terms for auto-generated letters.</p>
                    </div>
                </div>

                {user?.role === 'SUPER_ADMIN' && companies.length > 0 && (
                    <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Target Company:</label>
                        <select 
                            value={selectedCompanyId} 
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="bg-white border border-gray-300 text-sm rounded px-3 py-1.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[200px]"
                        >
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Editor Section */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex space-x-2 bg-gray-50 p-1 rounded-lg w-max">
                        {documentTypes.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                    selectedType === type.id
                                        ? 'bg-white text-indigo-600 shadow-sm border border-gray-200'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                                <Code size={14} className="mr-1.5" /> HTML Editor Mode
                            </span>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
                            >
                                {isSaving ? <span className="animate-spin mr-2">⚙️</span> : <Save size={14} className="mr-2" />}
                                Save Template
                            </button>
                        </div>
                        <textarea
                            value={editorContent}
                            onChange={(e) => setEditorContent(e.target.value)}
                            className="w-full h-[500px] p-4 text-sm font-mono text-gray-800 bg-gray-900/5 outline-none resize-y"
                            placeholder="<h1>OFFER LETTER...</h1>"
                        />
                    </div>
                </div>

                {/* Tags Guide Section */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-5">
                        <div className="flex items-center space-x-2 text-blue-800 mb-4">
                            <Info size={18} />
                            <h3 className="font-bold text-sm">Dynamic Injection Tags</h3>
                        </div>
                        <p className="text-xs text-blue-600/80 mb-4 leading-relaxed">
                            Copy and paste these exact tags into the HTML editor. When a letter is generated, the system will automatically swap them out with the actual client and payment data.
                        </p>
                        <div className="space-y-3 h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                            {availableTags.map((t, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <code className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded block mb-1 break-all cursor-pointer hover:bg-indigo-100 transition-colors tooltip tooltip-right" data-tip="Click to copy">
                                        {t.tag}
                                    </code>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
