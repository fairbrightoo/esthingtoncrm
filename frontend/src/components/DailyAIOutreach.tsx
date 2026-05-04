import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Bot, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
};

export const DailyAIOutreach = () => {
    const { token, user } = useAuth();
    const { toast } = useToast();
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/automations/daily-outreach/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (error) {
            console.error("Failed to fetch AI Outreach history", error);
            toast.error("Failed to load outreach history.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchHistory();
        }
    }, [token]);

    const handleTriggerTest = async () => {
        if (!confirm("This will manually trigger the daily cron job right now and actually send messages. Are you sure?")) return;
        setIsTriggering(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/automations/daily-outreach/trigger-test`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("AI Outreach triggered successfully!");
            setTimeout(fetchHistory, 3000); // Reload after a brief wait for execution
        } catch (error) {
            console.error("Failed to trigger test", error);
            toast.error("Failed to trigger execution.");
        } finally {
            setIsTriggering(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-purple-600" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
                        <Bot size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Daily AI Outreach</h2>
                        <p className="text-gray-500 text-sm">Automated personalized messaging for Birthdays and Payment Reminders.</p>
                    </div>
                </div>
                {user?.role === 'SUPER_ADMIN' && (
                    <button 
                        onClick={handleTriggerTest}
                        disabled={isTriggering}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-sm font-semibold transition-colors flex items-center shadow-sm disabled:opacity-50"
                    >
                        {isTriggering ? <Loader2 size={16} className="animate-spin mr-2" /> : <Clock size={16} className="mr-2" />}
                        Trigger Daily Job (Admin)
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Dispatch History</h3>
                    <span className="text-xs font-semibold bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full flex items-center">
                        <CheckCircle size={12} className="mr-1" /> Fully Automated
                    </span>
                </div>
                <div className="divide-y divide-gray-100">
                    {history.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            <Bot size={48} className="mx-auto mb-4 text-gray-200" />
                            No AI outreach logs found. The system will dispatch messages automatically at 9:00 AM daily.
                        </div>
                    ) : (
                        history.map((log) => (
                            <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                                            {log.lead?.fullName?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{log.lead?.fullName || 'Unknown Client'}</h4>
                                            <p className="text-xs text-gray-500">{log.lead?.company?.name} • Sent via {log.type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${log.providerId === 'AI_BIRTHDAY_CRON' ? 'bg-pink-50 text-pink-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {log.providerId === 'AI_BIRTHDAY_CRON' ? 'Birthday Greeting' : 'Payment Reminder'}
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">{formatDate(log.timestamp)}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-700 italic relative">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-xl"></div>
                                    "{log.content.replace('Auto AI: ', '').replace('Auto AI (GENTLE_REMINDER): ', '').replace('Auto AI (OVERDUE_WARNING): ', '')}"
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
