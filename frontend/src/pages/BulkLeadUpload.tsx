import React, { useState } from 'react';
import axios from 'axios';
import { Upload, AlertCircle, CheckCircle, FileUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BulkLeadUpload = () => {
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
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leads/bulk`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            setReport(res.data);
        } catch (error) {
            console.error('Upload failed', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Bulk Lead Upload (Legacy Import)</h1>

            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        accept=".csv"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                    />
                    <FileUp className="w-16 h-16 text-blue-500 mb-4" />
                    <p className="text-xl font-medium text-gray-700">{file ? file.name : "Drag & drop CSV file or click to browse"}</p>
                    <p className="text-sm text-gray-500 mt-2">Required: full_name. Optional: email, phone</p>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-white font-medium shadow-md transition-all ${!file || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                            }`}
                    >
                        {uploading ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <Upload size={20} />
                                <span>Upload & Process</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {report && (
                <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200 animate-fade-in">
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <CheckCircle className="text-green-500 mr-2" />
                        Processing Complete
                    </h2>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <StatCard label="Total Rows" value={report.total} color="bg-gray-100" />
                        <StatCard label="Success" value={report.success} color="bg-green-100 text-green-800" />
                        <StatCard label="Failed" value={report.failed} color="bg-red-100 text-red-800" />
                    </div>

                    {report.duplicates?.length > 0 && (
                        <div className="mt-4">
                            <h3 className="font-semibold text-red-600 flex items-center mb-2">
                                <AlertCircle size={18} className="mr-2" />
                                Duplicates / Errors
                            </h3>
                            <div className="bg-red-50 rounded-lg p-4 overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr>
                                            <th className="pb-2">Details</th>
                                            <th className="pb-2">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.duplicates.map((dup: any, idx: number) => (
                                            <tr key={idx} className="border-t border-red-200">
                                                <td className="py-2 pr-4 font-mono">{dup.row.email || dup.row.phone_number}</td>
                                                <td className="py-2 text-red-700">{dup.reason || dup.error}</td>
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
    );
};

const StatCard = ({ label, value, color }: any) => (
    <div className={`${color} p-4 rounded-lg text-center`}>
        <p className="text-sm font-medium opacity-70 uppercase">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
    </div>
);
