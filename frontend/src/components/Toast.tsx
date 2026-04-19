import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="text-green-500" size={20} />;
            case 'error': return <XCircle className="text-red-500" size={20} />;
            case 'warning': return <AlertTriangle className="text-yellow-500" size={20} />;
            case 'info': return <Info className="text-blue-500" size={20} />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success': return 'border-green-100 bg-green-50';
            case 'error': return 'border-red-100 bg-red-50';
            case 'warning': return 'border-yellow-100 bg-yellow-50';
            case 'info': return 'border-blue-100 bg-blue-50';
            default: return 'border-gray-100 bg-white';
        }
    };

    return (
        <div className={`flex items-center w-full max-w-sm p-4 mb-4 text-gray-800 bg-white rounded-lg shadow-lg border-l-4 transition-all duration-300 transform translate-x-0 ${getStyles()} border-l-${type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'blue'}-500`}>
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8">
                {getIcon()}
            </div>
            <div className="ml-3 text-sm font-normal mr-4">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8"
                onClick={() => onDismiss(id)}
            >
                <X size={16} />
            </button>
        </div>
    );
};
