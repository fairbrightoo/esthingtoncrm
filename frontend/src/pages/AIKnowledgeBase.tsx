import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, BrainCircuit, X, AlertCircle, Trash2, Database, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const AIKnowledgeBase: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();
    const { user } = useAuth();

    if (user?.role !== 'MANAGING_DIRECTOR' && user?.role !== 'SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Access Restricted</h2>
                <p className="text-gray-600 mt-2">Only Managing Directors can update the AI's core logic and knowledge.</p>
            </div>
        );
    }

    const [activeFiles, setActiveFiles] = useState<any[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(true);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const fetchFiles = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3000/api/ai/knowledge/files', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveFiles(res.data.files || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingFiles(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'MANAGING_DIRECTOR' || user?.role === 'SUPER_ADMIN') {
            fetchFiles();
        }
    }, [user]);

    const handleDeleteFile = async (fileId: string) => {
        setIsDeleting(fileId);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:3000/api/ai/knowledge/files/${fileId}`, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            addToast("Document erased successfully", "success");
            fetchFiles();
        } catch (error) {
            console.error(error);
            addToast("Failed to delete document", "error");
        } finally {
            setIsDeleting(null);
            setDeleteConfirmModal(null);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        files.forEach(file => {
            formData.append('documents', file);
        });

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:3000/api/ai/knowledge/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            setUploadStats(response.data.filesProcessed);
            if (response.data.filesProcessed.failed > 0) {
                 addToast("Upload completed with some failures.", "error");
            } else {
                 addToast("Knowledge Base successfully updated!", "success");
            }
            setFiles([]);
            fetchFiles();
        } catch (error) {
            console.error(error);
            addToast("Failed to upload knowledge files.", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg">
                    <BrainCircuit size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI Knowledge Base</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Train the Esthington CRM AI directly. Upload Property Brochures, Internal Price Sheets, or Sales Rules.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div 
                    className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${files.length > 0 ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={48} className={`mb-4 ${files.length > 0 ? 'text-indigo-500' : 'text-gray-400'}`} />
                    <h3 className="text-lg font-semibold text-gray-800">
                        {files.length > 0 ? 'Add more documents' : 'Drag & Drop PDFs or Click to Browse'}
                    </h3>
                    <p className="text-gray-500 text-sm mt-2 text-center max-w-md">
                        Supports .pdf, .docx, .txt, .csv. The AI will instantly read, index, and use these documents when Marketers ask questions.
                    </p>
                    <input 
                        type="file" 
                        multiple 
                        accept=".pdf,.docx,.txt,.csv" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                </div>

                {files.length > 0 && (
                    <div className="mt-8 space-y-4">
                        <h4 className="font-semibold text-gray-800">Files Staged for Training</h4>
                        <ul className="space-y-2">
                            {files.map((f, i) => (
                                <li key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center space-x-3 text-sm font-medium text-gray-700">
                                        <FileText size={18} className="text-blue-500" />
                                        <span>{f.name}</span>
                                        <span className="text-xs text-gray-400">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                                    </div>
                                    <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                                        <X size={18} />
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <button 
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors flex justify-center items-center"
                        >
                            {isUploading ? (
                                <span className="animate-pulse">Processing & Vectorizing Documents...</span>
                            ) : (
                                <span>Train AI Agent Now ({files.length} files)</span>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {uploadStats && (
                <div className={`p-6 border rounded-xl flex items-start space-x-4 ${uploadStats.failed > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                    {uploadStats.failed > 0 ? (
                        <AlertCircle className="text-orange-500 mt-1" size={24} />
                    ) : (
                        <CheckCircle className="text-green-500 mt-1" size={24} />
                    )}
                    <div>
                        <h4 className={`font-bold ${uploadStats.failed > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                            {uploadStats.failed > 0 ? 'Upload Completed with Rejected Files' : 'Knowledge Base Successfully Updated!'}
                        </h4>
                        <p className={`text-sm mt-1 ${uploadStats.failed > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                            {uploadStats.failed > 0 
                                ? 'One or more of your documents were rejected immediately by OpenAI (likely an unsupported format, heavily encrypted, or lacks extractable text).' 
                                : 'The Elite Coach has successfully ingested the documents into its Vector Store and is ready to answer questions regarding them.'}
                        </p>
                        <div className={`mt-3 flex space-x-4 text-xs font-semibold bg-white bg-opacity-50 px-3 py-2 rounded-md inline-flex ${uploadStats.failed > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                            <span>Completed: {uploadStats.completed}</span>
                            <span>Failed: {uploadStats.failed}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                 <div className="flex items-center space-x-2 mb-6">
                     <Database className="text-indigo-600" size={24} />
                     <h3 className="text-xl font-bold text-gray-800">Currently Active Knowledge</h3>
                 </div>
                 {isLoadingFiles ? (
                     <div className="text-center text-gray-500 py-8 font-medium animate-pulse">Scanning Neuro-net Storage...</div>
                 ) : activeFiles.length === 0 ? (
                      <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-100 rounded-lg">
                          No documents are currently active in the Vector Store.
                      </div>
                 ) : (
                      <div className="space-y-3">
                          {activeFiles.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-200 transition-colors">
                                  <div className="flex items-center space-x-4">
                                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <FileText size={20} />
                                      </div>
                                      <div>
                                          <p className="font-semibold text-gray-800 text-sm">{file.filename}</p>
                                          <div className="flex space-x-3 text-xs text-gray-500 mt-1">
                                             <span>{(file.bytes / 1024 / 1024).toFixed(2)} MB</span>
                                             <span>•</span>
                                             <span>{new Date(file.createdAt * 1000).toLocaleDateString()}</span>
                                             <span>•</span>
                                             <span className={file.status === 'completed' ? 'text-green-600 font-medium uppercase' : 'text-orange-500 font-medium uppercase'}>{file.status}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <button onClick={() => setDeleteConfirmModal(file.id)} disabled={isDeleting === file.id} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Erase from AI">
                                      {isDeleting === file.id ? (
                                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                          <Trash2 size={18} />
                                      )}
                                  </button>
                              </div>
                          ))}
                      </div>
                 )}
            </div>
            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto mb-4">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Erase Document?</h3>
                            <p className="text-center text-gray-500 text-sm mb-6">
                                Are you sure you want to completely erase this document from the AI's brain? This cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setDeleteConfirmModal(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteFile(deleteConfirmModal)}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors text-sm flex justify-center items-center"
                                >
                                    {isDeleting === deleteConfirmModal ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "Erase Document"
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

export default AIKnowledgeBase;
