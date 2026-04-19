import React, { useState, useEffect } from 'react';
import { PhoneCall, Mail, MessageSquare, Search, Filter, History, CheckCircle, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export const CommunicationLogs = () => {
    const { token } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await axios.get('http://localhost:3000/api/communication/logs', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLogs(res.data);
            } catch (err) {
                console.error("Failed to fetch logs", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [token]);

    const filteredLogs = logs.filter(log => {
        const typeMatch = filterType === 'ALL' || log.type === filterType;
        const searchMatch = !searchTerm || log.lead?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        let dateMatch = true;
        const logDate = new Date(log.createdAt);
        if (startDate) dateMatch = dateMatch && logDate >= new Date(startDate);
        if (endDate) dateMatch = dateMatch && logDate <= new Date(endDate + 'T23:59:59');

        return typeMatch && searchMatch && dateMatch;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <History className="text-purple-600" />
                        Communication History
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Audit trail of all client interactions, SMS, Emails, and Call Logs.</p>
                </div>
                <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                    <button 
                        onClick={() => setFilterType('ALL')}
                        className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 ${filterType === 'ALL' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilterType('EMAIL')}
                        className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 ${filterType === 'EMAIL' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <Mail size={14}/> Emails
                    </button>
                    <button 
                        onClick={() => setFilterType('SMS')}
                        className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 ${filterType === 'SMS' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <MessageSquare size={14}/> SMS
                    </button>
                    <button 
                        onClick={() => setFilterType('WHATSAPP')}
                        className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 ${filterType === 'WHATSAPP' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <PhoneCall size={14}/> WhatsApp
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search logs by client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500 outline-none w-72 text-sm bg-white"
                        />
                    </div>
                    <div className="flex bg-white items-center gap-2 px-3 py-1 border border-gray-200 rounded shadow-sm">
                        <Filter size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">From:</span>
                        <input 
                            type="date" 
                            title="Start Date"
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className="text-xs text-gray-700 outline-none cursor-pointer bg-transparent" 
                        />
                        <span className="text-xs text-gray-500 font-medium ml-1">To:</span>
                        <input 
                            type="date" 
                            title="End Date"
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className="text-xs text-gray-700 outline-none cursor-pointer bg-transparent" 
                        />
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-red-400 hover:text-red-600 ml-1 p-0.5 rounded-full hover:bg-red-50 transition" title="Clear Dates">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            Loading logs...
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 text-center relative h-full">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative mb-4 z-10 w-16 h-16 flex items-center justify-center text-purple-500">
                                <History size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 z-10">No Logs Found</h3>
                            <p className="text-gray-500 mt-2 max-w-sm z-10">There are no communication activities matching your criteria.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Message Content</th>
                                    <th className="px-6 py-4">Log Stamp</th>
                                    <th className="px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{log.lead?.fullName || 'Unknown Client'}</div>
                                            <div className="text-xs text-gray-500">{log.lead?.phone} • {log.lead?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                                                log.type === 'EMAIL' ? 'bg-blue-50 text-blue-700' :
                                                log.type === 'SMS' ? 'bg-orange-50 text-orange-700' :
                                                'bg-green-50 text-green-700'
                                            }`}>
                                                {log.type === 'EMAIL' && <Mail size={12} className="mr-1" />}
                                                {log.type === 'SMS' && <MessageSquare size={12} className="mr-1" />}
                                                {log.type === 'WHATSAPP' && <PhoneCall size={12} className="mr-1" />}
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={log.content}>
                                            {log.content}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-700">{new Date(log.createdAt).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleTimeString()}</div>
                                            <div className="text-[10px] uppercase text-gray-400 font-bold mt-1 tracking-wider">By {log.user?.fullName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {log.status === 'SENT' ? (
                                                <span className="inline-flex items-center text-green-600 text-xs font-bold">
                                                    <CheckCircle size={14} className="mr-1" /> DELIVERED
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-red-600 text-xs font-bold" title={log.providerId}>
                                                    <AlertCircle size={14} className="mr-1" /> FAILED
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
