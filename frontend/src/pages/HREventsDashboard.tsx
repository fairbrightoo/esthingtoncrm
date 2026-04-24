import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Calendar, Gift, AlertTriangle, Plus, Trash2, Loader2, User } from 'lucide-react';

export const HREventsDashboard = () => {
    const { token } = useAuth();
    const { addToast } = useToast();
    
    const [birthdays, setBirthdays] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state for adding holiday
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDate, setNewHolidayDate] = useState('');

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/events`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBirthdays(res.data.upcomingBirthdays || []);
            setHolidays(res.data.holidays || []);
        } catch (error) {
            console.error('Failed to fetch events:', error);
            addToast('Failed to load events calendar', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/events/holidays`, {
                name: newHolidayName,
                date: newHolidayDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            addToast('Holiday added successfully', 'success');
            setShowHolidayModal(false);
            setNewHolidayName('');
            setNewHolidayDate('');
            fetchEvents();
        } catch (error) {
            addToast('Failed to create holiday', 'error');
        }
    };

    const handleDeleteHoliday = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/events/holidays/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('Holiday deleted', 'success');
            fetchEvents();
        } catch (error) {
            addToast('Failed to delete holiday', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-10">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-2xl text-white shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold flex items-center">
                        <Calendar className="mr-3" size={32} />
                        Company Events & Calendar
                    </h1>
                    <p className="mt-2 text-blue-100 max-w-xl">
                        Track upcoming staff birthdays and statutory holidays so that HR and ICT can prepare announcements and graphics in advance.
                    </p>
                </div>
                {/* Background Decor */}
                <div className="absolute right-0 top-0 opacity-10 transform scale-150 -translate-y-10 translate-x-10 pointer-events-none">
                    <Calendar size={250} />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* UPCOMING BIRTHDAYS COLUMN */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            <Gift className="mr-2 text-pink-500" size={24} />
                            Upcoming Birthdays
                        </h2>
                        <span className="text-xs font-semibold bg-pink-100 text-pink-700 px-3 py-1 rounded-full uppercase tracking-wide">
                            Next 30 Days
                        </span>
                    </div>

                    <div className="p-6 flex-1 bg-white">
                        {birthdays.length === 0 ? (
                            <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                                <div className="bg-gray-50 p-4 rounded-full mb-3">
                                    <Gift size={32} className="text-gray-300" />
                                </div>
                                <p className="text-gray-500">No birthdays coming up in the next 30 days.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {birthdays.map((b) => {
                                    const isUrgent = b.daysAway <= 5;
                                    return (
                                        <div 
                                            key={b.id} 
                                            className={`flex items-start p-4 rounded-xl border ${isUrgent ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'} transition-all hover:shadow-sm`}
                                        >
                                            <div className="hidden sm:flex bg-white w-12 h-12 rounded-full border border-gray-200 items-center justify-center text-gray-500 mr-4 shadow-sm flex-shrink-0">
                                                <User size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{b.fullName}</h3>
                                                    {isUrgent ? (
                                                        <span className="bg-red-500 text-white flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                                            <AlertTriangle size={10} className="mr-1" />
                                                            {b.daysAway === 0 ? 'Today!' : `${b.daysAway} Days Left`}
                                                        </span>
                                                    ) : (
                                                        <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-semibold">
                                                            {b.daysAway} days away
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 font-medium">
                                                    {b.role.replace('_', ' ')} • {b.branch?.name}
                                                </p>
                                                <div className="mt-3 flex items-center text-sm font-medium">
                                                    <span className={`${isUrgent ? 'text-orange-700' : 'text-blue-600'}`}>
                                                        Turns a year older on {new Date(b.nextBirthday).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* HOLIDAY CALENDAR COLUMN */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            <Calendar className="mr-2 text-indigo-500" size={24} />
                            Holiday Planner
                        </h2>
                        <button 
                            onClick={() => setShowHolidayModal(true)}
                            className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                        >
                            <Plus size={14} /> <span>Add Holiday</span>
                        </button>
                    </div>

                    <div className="p-6 flex-1 bg-white">
                        {holidays.length === 0 ? (
                            <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                                <div className="bg-gray-50 p-4 rounded-full mb-3">
                                    <Calendar size={32} className="text-gray-300" />
                                </div>
                                <p className="text-gray-500">No upcoming public holidays marked.</p>
                                <button
                                    onClick={() => setShowHolidayModal(true)}
                                    className="mt-4 text-indigo-600 font-medium hover:underline text-sm flex items-center"
                                >
                                    <Plus size={16} className="mr-1" /> Set up the first holiday
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                {holidays.map((h) => {
                                    const holidayDate = new Date(h.date);
                                    const isPast = holidayDate < new Date(new Date().setHours(0,0,0,0));
                                    
                                    return (
                                        <div key={h.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${isPast ? 'opacity-50' : ''}`}>
                                            {/* Timestamp timeline dot */}
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                                <Calendar size={16} />
                                            </div>
                                            
                                            {/* Card */}
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition">
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{h.name}</h3>
                                                    <p className="text-sm text-gray-500 mt-0.5">
                                                        {holidayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteHoliday(h.id, h.name)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Holiday Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold flex items-center text-gray-900">
                                <Plus size={20} className="mr-2 text-indigo-500" />
                                Add Public Holiday
                            </h2>
                        </div>
                        <form onSubmit={handleCreateHoliday} className="p-6 space-y-4 bg-gray-50/50">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Holiday Name</label>
                                <input 
                                    required 
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                                    placeholder="e.g. Eid al-Fitr, Easter Monday"
                                    value={newHolidayName} 
                                    onChange={e => setNewHolidayName(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
                                <input 
                                    required 
                                    type="date"
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm text-gray-800"
                                    value={newHolidayDate} 
                                    onChange={e => setNewHolidayDate(e.target.value)} 
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowHolidayModal(false)}
                                    className="px-5 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 font-medium rounded-xl transition shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition shadow-sm"
                                >
                                    Save Holiday
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
