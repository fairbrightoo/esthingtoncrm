import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { BookOpen, UploadCloud, FileText, Trash2, ShieldAlert, Download, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const CompanyPolicies = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [readingDoc, setReadingDoc] = useState<any>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Form
    const [title, setTitle] = useState('');
    const [type, setType] = useState('POLICY');
    const [isGlobal, setIsGlobal] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const canUpload = ['HR_MANAGER', 'SUPER_ADMIN', 'MANAGING_DIRECTOR'].includes(user?.role || '');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/documents`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(res.data);
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    };

    useEffect(() => {
        let currentBlob: string | null = null;
        if (readingDoc && readingDoc.fileUrl.toLowerCase().endsWith('.pdf')) {
            setPreviewLoading(true);
            const token = localStorage.getItem('token');
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${readingDoc.fileUrl}`, {
                responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` }
            }).then((res) => {
                const blob = new Blob([res.data], { type: 'application/pdf' });
                currentBlob = URL.createObjectURL(blob);
                setBlobUrl(currentBlob);
                setPreviewLoading(false);
            }).catch((err) => {
                console.error('Failed to load blob arraybuffer:', err);
                setPreviewLoading(false);
            });
        } else {
            setBlobUrl(null);
        }

        return () => {
            if (currentBlob) URL.revokeObjectURL(currentBlob);
        };
    }, [readingDoc]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return addToast('Please select a file', 'warning');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('isGlobal', String(isGlobal));
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/documents`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            addToast('Document successfully published.', 'success');
            setShowUpload(false);
            setTitle(''); setFile(null);
            fetchDocuments();
        } catch (error) {
            addToast('Failed to upload document', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this official document?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/hr-workflows/documents/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('Document removed.', 'success');
            fetchDocuments();
        } catch (error) {
            addToast('Failed to delete document', 'error');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
                        <BookOpen size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Company Policies Hub</h1>
                        <p className="text-gray-500 text-sm">Official company handbooks, memos, and policies</p>
                    </div>
                </div>
                {canUpload && (
                    <button
                        onClick={() => setShowUpload(true)}
                        className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <UploadCloud size={18} />
                        <span>Upload Policy</span>
                    </button>
                )}
            </div>

            {loading ? (
                <div className="p-10 text-center text-gray-500 bg-white rounded-xl">Loading library...</div>
            ) : documents.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100">
                    <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No Documents Uploaded</h3>
                    <p className="text-gray-500 mt-1">HR has not uploaded any official documents yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc) => (
                        <div key={doc.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative group hover:shadow-md transition-shadow">
                            {canUpload && (
                                <button onClick={() => handleDelete(doc.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            )}
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                                <FileText size={32} />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">{doc.title}</h3>
                            <div className="flex items-center text-xs text-gray-500 mb-4 space-x-2">
                                <span className={`px-2 py-0.5 rounded font-medium ${doc.type === 'HANDBOOK' ? 'bg-purple-100 text-purple-700' : doc.type === 'MEMO' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {doc.type}
                                </span>
                                {doc.branchId === null && <span className="flex items-center text-emerald-600 font-medium"><ShieldAlert size={12} className="mr-1"/> GLOBAL</span>}
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 w-full">
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setReadingDoc(doc)}
                                        className="flex items-center justify-center w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        <BookOpen size={14} className="mr-1.5" /> Read Online
                                    </button>
                                    <a 
                                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${doc.fileUrl}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex items-center justify-center w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-colors"
                                        download
                                    >
                                        <Download size={14} className="mr-1.5" /> Download
                                    </a>
                                </div>
                                <p className="text-xs text-center text-gray-400 mt-3">Added {new Date(doc.createdAt).toLocaleDateString()} by HR</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleUpload} className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            <UploadCloud size={24} className="mr-2 text-slate-600" />
                            Publish Official Document
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block p-2.5" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Type</label>
                                <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block p-2.5">
                                    <option value="POLICY">Standard Policy</option>
                                    <option value="HANDBOOK">Staff Handbook</option>
                                    <option value="MEMO">Official Memo</option>
                                    <option value="NDA">Non-Disclosure Agreement</option>
                                </select>
                            </div>
                            {['SUPER_ADMIN', 'MANAGING_DIRECTOR'].includes(user?.role || '') && (
                                <div className="flex items-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                    <input type="checkbox" id="isGlobal" checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2" />
                                    <label htmlFor="isGlobal" className="ml-2 text-sm font-medium text-emerald-900">
                                        Make this a GLOBAL document for all branches
                                    </label>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Attach PDF File</label>
                                <input required type="file" accept=".pdf,.doc,.docx" onChange={e => {
                                    if(e.target.files) setFile(e.target.files[0])
                                }} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block p-2" />
                            </div>
                        </div>
                        
                        <div className="mt-8 flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900">
                                Publish to Hub
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Reader Modal */}
            {readingDoc && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-[90vh]">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <BookOpen size={20} className="mr-2 text-indigo-600" />
                                {readingDoc.title}
                            </h3>
                            <button onClick={() => setReadingDoc(null)} className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-white rounded-full hover:bg-red-50">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="flex-1 w-full bg-gray-100 rounded-b-2xl overflow-hidden flex items-center justify-center p-4">
                            {previewLoading ? (
                                <div className="text-gray-500 font-medium animate-pulse flex flex-col items-center">
                                    <BookOpen size={48} className="text-gray-300 mb-4 animate-bounce" />
                                    Loading secure document viewer...
                                </div>
                            ) : readingDoc.fileUrl.toLowerCase().endsWith('.pdf') ? (
                                blobUrl ? (
                                    <iframe 
                                        src={`${blobUrl}#view=FitH`} 
                                        className="w-full h-full border-none rounded-b-lg shadow-sm"
                                        title="Secure PDF Viewer"
                                    />
                                ) : (
                                    <div className="text-red-500">Failed to securely load preview window.</div>
                                )
                            ) : (
                                <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                                    <FileText size={48} className="mx-auto text-indigo-200 mb-4" />
                                    <h4 className="text-lg font-bold text-gray-900 mb-2">Preview Unavailable</h4>
                                    <p className="text-gray-500 text-sm mb-6">This document is a Word file (.doc / .docx) or another format that cannot be previewed natively inside the browser.</p>
                                    <a 
                                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${readingDoc.fileUrl}`} 
                                        className="inline-flex items-center justify-center py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
                                        download
                                    >
                                        <Download size={16} className="mr-2" /> Download Document Now
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
