import React, { useState } from 'react';
import axios from 'axios';
import { Upload, AlertCircle, CheckCircle, FileUp, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BulkLeadUploadModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const BulkLeadUploadModal: React.FC<BulkLeadUploadModalProps> = ({ onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [report, setReport] = useState<any>(null);
    const { token } = useAuth();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setReport(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !token) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await axios.post('http://localhost:3000/api/leads/bulk', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            setReport(res.data);
            if (res.data.success > 0) {
                onSuccess();
            }
        } catch (error) {
            console.error('Upload failed', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Upload size={20} className="text-blue-600" />
                        Bulk Lead Upload (CSV)
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative group">
                        <input
                            type="file"
                            accept=".csv"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={handleFileChange}
                        />
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                            <FileUp className="w-8 h-8 text-blue-500" />
                        </div>
                        <p className="text-lg font-bold text-gray-800">{file ? file.name : "Click or drag CSV file to upload"}</p>
                        <p className="text-sm text-gray-500 mt-2">Required columns: <span className="font-mono bg-gray-200 px-1 rounded text-gray-700">full_name</span>. Optional: email, phone</p>
                    </div>

                    {report && (
                        <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-5 animate-fade-in">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                                <CheckCircle size={16} className="text-green-500" /> Processing Report
                            </h3>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-white p-3 rounded border shadow-sm text-center">
                                    <div className="text-xs font-bold text-gray-500 uppercase">Total Rows</div>
                                    <div className="text-xl font-black text-gray-800">{report.total}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded border border-green-100 text-center">
                                    <div className="text-xs font-bold text-green-700 uppercase">Imported</div>
                                    <div className="text-xl font-black text-green-700">{report.success}</div>
                                </div>
                                <div className="bg-red-50 p-3 rounded border border-red-100 text-center">
                                    <div className="text-xs font-bold text-red-700 uppercase">Failed</div>
                                    <div className="text-xl font-black text-red-700">{report.failed}</div>
                                </div>
                            </div>
                            {report.duplicates?.length > 0 && (
                                <div className="bg-white rounded border overflow-hidden">
                                    <div className="bg-red-50 px-3 py-2 text-xs font-bold text-red-600 flex items-center gap-2 border-b border-red-100">
                                        <AlertCircle size={14} /> Errors / Duplicates
                                    </div>
                                    <div className="max-h-32 overflow-y-auto">
                                        <table className="w-full text-xs text-left">
                                            <tbody className="divide-y divide-gray-100">
                                                {report.duplicates.map((dup: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="py-2 px-3 font-mono text-gray-700">{dup.row.email || dup.row.phone_number || dup.row.full_name}</td>
                                                        <td className="py-2 px-3 text-red-600">{dup.reason || dup.error}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition">
                        {report ? 'Close' : 'Cancel'}
                    </button>
                    {!report && (
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-white font-bold transition-all shadow-md ${
                                !file || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {uploading ? (
                                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processing...</span>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    <span>Upload Leads</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
