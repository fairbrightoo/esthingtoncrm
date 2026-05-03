
import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Mail, MessageSquare, Send, Paperclip } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface SendMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    leadId: string;
    leadName: string;
    leadEmail?: string;
    leadPhone?: string;
}

export const SendMessageModal = ({ isOpen, onClose, leadId, leadName, leadEmail, leadPhone }: SendMessageModalProps) => {
    const { toast } = useToast();
    const [type, setType] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [templates, setTemplates] = useState<any[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentType, setAttachmentType] = useState<'image' | 'document' | 'video' | ''>('');

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen, type]);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/templates?type=${type}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setTemplates(res.data);
        } catch (error) {
            console.error("Failed to fetch templates", error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);

        try {
            let mediaUrl = undefined;
            let mediaType = undefined;

            if (attachment && type === 'WHATSAPP') {
                const formData = new FormData();
                formData.append('media', attachment);
                const uploadRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/upload-media`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                mediaUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${uploadRes.data.url}`;
                mediaType = attachmentType;
            }

            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/communication/send`, {
                leadId,
                type,
                subject: type === 'EMAIL' ? subject : undefined,
                content,
                mediaUrl,
                mediaType
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success('Message Sent Successfully!');
            onClose();
            setContent('');
            setSubject('');
            setAttachment(null);
            setAttachmentType('');
        } catch (error: any) {
            console.error("Failed to send message", error);
            const errMsg = error.response?.data?.error || 'Failed to send message';
            toast.error(errMsg);
        } finally {
            setIsSending(false);
        }
    };

    const applyTemplate = (templateId: string) => {
        const tmpl = templates.find(t => t.id === templateId);
        if (tmpl) {
            setContent(tmpl.content);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Send className="mr-2 text-blue-600" size={24} />
                    Send Message to {leadName}
                </h2>

                {/* Type Selector */}
                <div className="flex space-x-2 mb-6">
                    <button
                        onClick={() => setType('EMAIL')}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center ${type === 'EMAIL' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        <Mail size={16} className="mr-2" /> Email
                    </button>
                    <button
                        onClick={() => setType('SMS')}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center ${type === 'SMS' ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        <MessageSquare size={16} className="mr-2" /> SMS
                    </button>
                    <button
                        onClick={() => setType('WHATSAPP')}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium flex items-center justify-center ${type === 'WHATSAPP' ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        <MessageSquare size={16} className="mr-2" /> WhatsApp
                    </button>
                </div>

                <form onSubmit={handleSend} className="space-y-4">
                    {/* Contact Info Display */}
                    <div className="text-sm text-gray-500 mb-2">
                        To: <span className="font-medium text-gray-800">
                            {type === 'EMAIL' ? (leadEmail || 'No Email') : (leadPhone || 'No Phone')}
                        </span>
                    </div>

                    {/* Template Selector */}
                    {templates.length > 0 && (
                        <div>
                            <select
                                onChange={(e) => applyTemplate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            >
                                <option value="">-- Select a Template --</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {type === 'EMAIL' && (
                        <div>
                            <input
                                type="text"
                                required
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Subject Line"
                            />
                        </div>
                    )}

                    <div>
                        <textarea
                            required
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={6}
                            placeholder="Type your message here..."
                        />
                    </div>

                    {type === 'WHATSAPP' && (
                        <div className="flex items-center space-x-2">
                            <label className="flex items-center justify-center px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-200 transition text-sm text-gray-700">
                                <Paperclip size={16} className="mr-2" />
                                <span className="truncate max-w-[150px]">{attachment ? attachment.name : 'Attach Media'}</span>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*,video/*,.pdf,.doc,.docx"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            setAttachment(file);
                                            if (file.type.startsWith('image/')) setAttachmentType('image');
                                            else if (file.type.startsWith('video/')) setAttachmentType('video');
                                            else setAttachmentType('document');
                                        }
                                    }}
                                />
                            </label>
                            {attachment && (
                                <button type="button" onClick={() => { setAttachment(null); setAttachmentType(''); }} className="text-red-500 hover:text-red-700 p-2">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSending || (type === 'EMAIL' && !leadEmail) || (type !== 'EMAIL' && !leadPhone)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                        >
                            {isSending ? 'Sending...' : 'Send Now'} <Send size={16} className="ml-2" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
