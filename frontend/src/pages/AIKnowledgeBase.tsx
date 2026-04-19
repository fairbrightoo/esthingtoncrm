import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, BrainCircuit, X, AlertCircle } from 'lucide-react';
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
            addToast("Knowledge Base successfully updated!", "success");
            setFiles([]);
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
                <div className="p-6 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-4">
                    <CheckCircle className="text-green-500 mt-1" size={24} />
                    <div>
                        <h4 className="font-bold text-green-800">Knowledge Base Successfully Updated!</h4>
                        <p className="text-green-700 text-sm mt-1">
                            The Elite Coach has successfully ingested the documents into its Vector Store and is ready to answer questions regarding them.
                        </p>
                        <div className="mt-3 flex space-x-4 text-xs font-semibold text-green-800 bg-white bg-opacity-50 px-3 py-2 rounded-md inline-flex">
                            <span>Completed: {uploadStats.completed}</span>
                            <span>Failed: {uploadStats.failed}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIKnowledgeBase;
