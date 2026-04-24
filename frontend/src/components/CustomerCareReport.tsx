import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import { MessageCircle, CheckCircle, Clock, AlertTriangle, PhoneCall, Mail, MessageSquare } from 'lucide-react';

export const CustomerCareReport = () => {
    const { token } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCareData = async () => {
            try {
                const [ticketsRes, logsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/logs`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setTickets(ticketsRes.data);
                setLogs(logsRes.data);
            } catch (error) {
                console.error("Failed to fetch customer care reports", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCareData();
    }, [token]);

    if (loading) return <div className="p-10 text-center">Loading Operations Data...</div>;

    // --- KPIs ---
    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const highPriority = tickets.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length;

    const emailSent = logs.filter(l => l.type === 'EMAIL').length;
    const smsSent = logs.filter(l => l.type === 'SMS').length;
    const whatsappSent = logs.filter(l => l.type === 'WHATSAPP').length;

    // --- Recharts Data Formats ---
    const priorityData = [
        { name: 'Low', value: tickets.filter(t => t.priority === 'LOW').length, color: '#3b82f6' },
        { name: 'Medium', value: tickets.filter(t => t.priority === 'MEDIUM').length, color: '#f59e0b' },
        { name: 'High/Urgent', value: highPriority, color: '#ef4444' }
    ].filter(d => d.value > 0);

    const communicationData = [
        { name: 'Emails', volume: emailSent, fill: '#3b82f6' },
        { name: 'SMS', volume: smsSent, fill: '#f97316' },
        { name: 'WhatsApp', volume: whatsappSent, fill: '#22c55e' }
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Support & Operations Dashboard</h1>
                    <p className="text-gray-500">Live metrics covering Client Helpdesk and Branch Communications</p>
                </div>
            </header>

            {/* Support KPIs */}
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Helpdesk Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Tickets</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{openTickets}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">High Priority</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{highPriority}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resolved Tickets</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{resolvedTickets}</p>
                    </div>
                </div>
            </div>

            {/* Communication KPIs */}
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Communication Output</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                        <Mail size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Emails Dispatched</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{emailSent}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">SMS Sent</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{smsSent}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full">
                        <PhoneCall size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">WhatsApp Actions</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{whatsappSent}</p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Communication Channels */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Communication Volume Breakdown</h3>
                    {logs.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-400">No communication logs recorded.</div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={communicationData} margin={{ top: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="volume" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Ticket Priorities */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
                        <MessageCircle size={18} className="mr-2 text-gray-400" />
                        Ticket Priority Distribution
                    </h3>
                    
                    {tickets.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-400">No tickets generated yet.</div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={priorityData}
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {priorityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
