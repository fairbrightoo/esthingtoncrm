import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Camera, Clock, KeyRound, LogIn, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';

export const Kiosk = () => {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    
    const [pin, setPin] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [time, setTime] = useState(new Date());
    const [status, setStatus] = useState<null | { type: 'success' | 'error', message: string }>(null);
    const webcamRef = useRef<Webcam>(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Load face-api models for optional face capture
        const loadModels = async () => {
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            setModelsLoaded(true);
        };
        loadModels();
    }, []);

    const handleNumpad = (num: string) => {
        if (pin.length < 4) setPin(prev => prev + num);
        setStatus(null);
    };

    const handleClear = () => setPin('');
    const handleBackspace = () => setPin(prev => prev.slice(0, -1));

    const handlePunch = async (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
        if (pin.length !== 4) {
            setStatus({ type: 'error', message: 'Please enter a 4-digit PIN' });
            return;
        }

        setIsVerifying(true);
        setStatus(null);

        let imageSrc = undefined;
        if (webcamRef.current) {
            imageSrc = webcamRef.current.getScreenshot() || undefined;
        }

        try {
            const endpoint = type === 'CLOCK_IN' ? 'kiosk/clock-in' : 'kiosk/clock-out';
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/attendance/${endpoint}`, {
                pin,
                photoBase64: imageSrc
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatus({ type: 'success', message: `Successfully ${type === 'CLOCK_IN' ? 'Clocked In' : 'Clocked Out'}!` });
            setPin('');
            
            // Clear success message after 3 seconds
            setTimeout(() => setStatus(null), 3000);
        } catch (error: any) {
            console.error(error);
            setStatus({ type: 'error', message: error.response?.data?.error || 'Verification Failed' });
            setPin('');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
                
                {/* Left Side - Time & Camera */}
                <div className="w-full lg:w-1/2 p-8 bg-gray-800 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-700">
                    <div className="text-center mb-8">
                        <Clock size={48} className="text-indigo-400 mx-auto mb-4" />
                        <h1 className="text-5xl font-black text-white tabular-nums tracking-tight">
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </h1>
                        <p className="text-gray-400 mt-2 font-medium">
                            {time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-gray-700 bg-gray-900 shadow-inner">
                        {modelsLoaded ? (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{ width: 400, height: 400, facingMode: "user" }}
                                className="w-full h-full object-cover transform -scale-x-100"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <Camera size={32} />
                            </div>
                        )}
                        <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full m-4 pointer-events-none"></div>
                    </div>
                    <p className="text-gray-500 text-sm mt-4 text-center">Look at the camera when punching in</p>
                </div>

                {/* Right Side - Numpad */}
                <div className="w-full lg:w-1/2 p-8 bg-gray-900 flex flex-col items-center justify-center relative">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <KeyRound size={24} className="mr-2 text-indigo-400" /> Enter PIN
                    </h2>

                    {/* PIN Display */}
                    <div className="flex space-x-4 mb-8">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-14 h-16 rounded-xl flex items-center justify-center text-2xl font-bold border-2 transition-all ${
                                i < pin.length 
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' 
                                    : 'bg-gray-800 border-gray-700 text-transparent'
                            }`}>
                                {i < pin.length ? '•' : ''}
                            </div>
                        ))}
                    </div>

                    {/* Status Message */}
                    {status && (
                        <div className={`absolute top-4 inset-x-8 p-3 rounded-lg flex items-center justify-center text-sm font-bold shadow-lg transform transition-all ${
                            status.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        }`}>
                            {status.type === 'success' ? <CheckCircle size={18} className="mr-2" /> : <AlertTriangle size={18} className="mr-2" />}
                            {status.message}
                        </div>
                    )}

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-[280px]">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button key={num} onClick={() => handleNumpad(num.toString())} className="h-16 rounded-2xl bg-gray-800 text-2xl font-semibold text-white hover:bg-gray-700 active:bg-gray-600 transition shadow-sm border border-gray-700">
                                {num}
                            </button>
                        ))}
                        <button onClick={handleClear} className="h-16 rounded-2xl bg-gray-800/50 text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 transition">
                            CLEAR
                        </button>
                        <button onClick={() => handleNumpad('0')} className="h-16 rounded-2xl bg-gray-800 text-2xl font-semibold text-white hover:bg-gray-700 active:bg-gray-600 transition shadow-sm border border-gray-700">
                            0
                        </button>
                        <button onClick={handleBackspace} className="h-16 rounded-2xl bg-gray-800/50 text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 transition">
                            DEL
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-4 w-full max-w-[280px]">
                        <button 
                            onClick={() => handlePunch('CLOCK_IN')}
                            disabled={isVerifying || pin.length !== 4}
                            className="h-14 rounded-xl bg-green-600 text-white font-bold flex items-center justify-center hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(22,163,74,0.39)]"
                        >
                            <LogIn size={20} className="mr-2" /> IN
                        </button>
                        <button 
                            onClick={() => handlePunch('CLOCK_OUT')}
                            disabled={isVerifying || pin.length !== 4}
                            className="h-14 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center hover:bg-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(220,38,38,0.39)]"
                        >
                            <LogOut size={20} className="mr-2" /> OUT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
