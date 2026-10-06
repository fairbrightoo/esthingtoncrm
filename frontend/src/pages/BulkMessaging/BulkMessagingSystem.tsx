import React, { useState } from 'react';
import { Lock, Mail, MessageSquare, Send, FileSpreadsheet, Sparkles, Image as ImageIcon, Users } from 'lucide-react';

const PASSCODE = "2026"; // Hardcoded for now, can be moved to env or DB

export const BulkMessagingSystem = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode === PASSCODE) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Invalid Passcode');
            setPasscode('');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-2xl">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900">Broadcast Engine</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Enter the secure passcode to access the bulk messaging system.
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                        <div>
                            <input
                                type="password"
                                required
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                className="appearance-none rounded-xl relative block w-full px-4 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="••••"
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition shadow-lg"
                        >
                            Unlock System
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                            <Send size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Esthington Broadcast Engine</h1>
                            <p className="text-xs text-gray-500 font-medium">Independent Bulk Messaging System</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsAuthenticated(false)}
                        className="text-sm text-gray-500 hover:text-gray-900 font-medium flex items-center space-x-1"
                    >
                        <Lock size={14} />
                        <span>Lock System</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Data & Setup */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Data Import */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <FileSpreadsheet size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">1. Import Audience</h2>
                            </div>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 hover:border-indigo-400 transition cursor-pointer">
                                <Users size={32} className="mx-auto text-gray-400 mb-3" />
                                <p className="text-sm font-medium text-gray-900">Upload CSV or Excel</p>
                                <p className="text-xs text-gray-500 mt-1">Include columns for Name, Phone, Email.</p>
                            </div>
                        </div>

                        {/* Media & Channels */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                    <ImageIcon size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">3. Media & Channels</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Send As (Sender ID)</label>
                                    <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                        <option value="">Select Brand...</option>
                                        <option value="DOUBLEKING">Double King Estate</option>
                                        <option value="ROYALTON">Royalton Links</option>
                                        <option value="ESTHINGTON">Esthington Group</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message Channel</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button className="flex items-center justify-center space-x-2 bg-blue-50 border border-blue-200 text-blue-700 py-2 rounded-lg text-sm font-bold">
                                            <MessageSquare size={16} />
                                            <span>SMS</span>
                                        </button>
                                        <button className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-bold hover:bg-gray-50">
                                            <Mail size={16} />
                                            <span>Email</span>
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Attach Media (Optional)</label>
                                    <div className="border border-gray-300 rounded-xl p-3 text-center hover:bg-gray-50 cursor-pointer">
                                        <p className="text-xs text-gray-600 font-medium flex items-center justify-center space-x-1">
                                            <ImageIcon size={14} />
                                            <span>Click to attach image</span>
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 italic">For SMS, images are uploaded and a short-link is added to the text.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: AI Composer */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                        <Sparkles size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">2. AI Message Composer</h2>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-100 mb-4">
                                <label className="block text-sm font-bold text-purple-900 mb-2">Draft with AI</label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="E.g., Tell Double King subscribers to come for allocation..."
                                    />
                                    <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 flex items-center space-x-1">
                                        <Sparkles size={16} />
                                        <span>Draft</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                                    <span>Message Content</span>
                                    <span className="text-xs text-gray-500">Variables: {'{{Name}}'}, {'{{Site}}'}, {'{{Title}}'}</span>
                                </label>
                                <textarea 
                                    className="flex-1 w-full border border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px]"
                                    placeholder="Type your message here or use AI to draft..."
                                ></textarea>
                                <div className="text-right text-xs text-gray-500 mt-2">
                                    ~ 0 SMS Pages (0 characters)
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                                <button className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition flex items-center space-x-2">
                                    <Send size={18} />
                                    <span>Launch Campaign</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
