import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, X, Send, UserRound, Sparkles, RefreshCcw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export const AICoachWidget: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Draggable Logic
    const [position, setPosition] = useState({ bottom: 24, right: 24 });
    const dragData = useRef({ isDragging: false, hasDragged: false, startX: 0, startY: 0, startB: 24, startR: 24 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragData.current.isDragging) return;
            const dx = e.clientX - dragData.current.startX;
            const dy = e.clientY - dragData.current.startY;
            
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                dragData.current.hasDragged = true;
            }

            if (dragData.current.hasDragged) {
                 const newRight = Math.min(Math.max(-20, dragData.current.startR - dx), window.innerWidth - 60);
                 const newBottom = Math.min(Math.max(-20, dragData.current.startB - dy), window.innerHeight - 60);
                 setPosition({ right: newRight, bottom: newBottom });
            }
        };

        const handleMouseUp = () => {
            dragData.current.isDragging = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.no-drag')) return;
        dragData.current = {
            isDragging: true,
            hasDragged: false,
            startX: e.clientX,
            startY: e.clientY,
            startB: position.bottom,
            startR: position.right
        };
    };

    const handleToggleClick = (e: React.MouseEvent) => {
        if (dragData.current.hasDragged) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        setIsOpen(!isOpen);
    };

    // Initial Welcome Message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                { id: '1', role: 'assistant', content: "Hello! I am your AI Sales Director. What objection are you facing right now?" }
            ]);
        }
    }, [messages.length]);

    useEffect(() => {
        if (isOpen) {
            endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Don't show the widget on marketing/landing pages, only inside the dashboard
    if (!user) return null;

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsThinking(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/chat/message`,
                { message: newUserMessage.content },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const newAssistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.response
            };

            setMessages(prev => [...prev, newAssistantMessage]);
        } catch (error) {
            console.error('AI Request Error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: "I'm having trouble connecting to the intelligence server. Please try again."
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleReset = async () => {
        setMessages([{ id: '1', role: 'assistant', content: "Conversation resetted. What's the new client objection?" }]);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/chat/reset`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch(e) {}
    };

    return (
        <div 
            className={`fixed z-50 flex flex-col items-end touch-none ${isOpen ? '' : 'cursor-pointer'}`}
            style={{ bottom: `${position.bottom}px`, right: `${position.right}px` }}
            onMouseDown={handleMouseDown}
        >
            
            {/* The Chat Window */}
            {isOpen && (
                <div className="bg-white w-96 max-w-[90vw] h-[500px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 mb-4 overflow-hidden animate-in slide-in-from-bottom-5 no-drag cursor-auto">
                    
                    {/* Header */}
                    <div className="bg-indigo-600 text-white p-4 flex items-center justify-between shadow-md z-10 cursor-grab active:cursor-grabbing">
                        <div className="flex items-center space-x-2">
                            <Sparkles size={20} className="text-yellow-300" />
                            <div>
                                <h3 className="font-bold text-sm tracking-wide">Elite Sales Coach</h3>
                                <p className="text-xs text-indigo-200">AI Knowledge Base</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={handleReset} className="p-1.5 hover:bg-indigo-500 rounded-full text-indigo-100 transition-colors" title="Reset Conversation">
                                <RefreshCcw size={16} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-indigo-500 rounded-full transition-colors fab-close">
                                <X size={20} className="pointer-events-none" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 bg-opacity-50">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 flex-shrink-0">
                                        <Sparkles size={14} className="text-indigo-600" />
                                    </div>
                                )}
                                
                                <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                                        : 'bg-white border border-gray-200 text-gray-800 shadow-sm rounded-tl-sm font-medium leading-relaxed'
                                }`}>
                                    {/* Simple markdown bolding support */}
                                    {msg.content.split('**').map((text, i) => i % 2 === 1 ? <strong key={i}>{text}</strong> : text)}
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ml-2 flex-shrink-0">
                                        <UserRound size={14} className="text-blue-600" />
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 flex-shrink-0">
                                    <Sparkles size={14} className="text-indigo-600 animate-pulse" />
                                </div>
                                <div className="bg-white border border-gray-200 p-3 rounded-2xl shadow-sm rounded-tl-sm flex items-center space-x-1.5">
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={endOfMessagesRef} />
                    </div>

                    {/* Input Box */}
                    <div className="p-3 bg-white border-t border-gray-200">
                        <form onSubmit={handleSendMessage} className="flex flex-col">
                            <div className="relative">
                                <textarea
                                    className="w-full bg-gray-100 text-sm border-none rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="Type client objection here..."
                                    rows={2}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!inputValue.trim() || isThinking}
                                    className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                            <span className="text-[10px] text-gray-400 text-center mt-2">
                                Powered by Esthington AI Intelligence
                            </span>
                        </form>
                    </div>

                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={handleToggleClick}
                className={`fab-toggle p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
                    isOpen ? 'bg-indigo-700 hover:bg-indigo-800 scale-90' : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105'
                }`}
                style={{ boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.5)' }}
            >
                {isOpen ? <X size={28} className="text-white" /> : <MessageSquareText size={28} className="text-white" />}
            </button>
        </div>
    );
};
