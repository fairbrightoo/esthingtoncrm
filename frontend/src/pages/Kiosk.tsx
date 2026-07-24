import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Camera, Clock, KeyRound, LogIn, LogOut, CheckCircle, AlertTriangle, Building2 } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { useNavigate } from 'react-router-dom';

export const Kiosk = () => {
    const { token, user, login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    
    // Login State
    const [companies, setCompanies] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Kiosk State
    const [pin, setPin] = useState(''); // Employee ID suffix (3 digits)
    const [isVerifying, setIsVerifying] = useState(false);
    const [time, setTime] = useState(new Date());
    const [status, setStatus] = useState<null | { type: 'success' | 'error' | 'info', message: string }>(null);
    const webcamRef = useRef<Webcam>(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    
    // Verification State
    const [matchedUsers, setMatchedUsers] = useState<any[]>([]);

    const isAuthorizedAdmin = user && ['BRANCH_ADMIN', 'BRANCH_HR', 'CUSTOMER_CARE'].includes(user.role);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            setModelsLoaded(true);
        };
        loadModels();
    }, []);

    useEffect(() => {
        if (!isAuthorizedAdmin) {
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`)
                .then(res => setCompanies(res.data))
                .catch(err => console.error(err));
        }
    }, [isAuthorizedAdmin]);

    useEffect(() => {
        if (selectedCompanyId) {
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${selectedCompanyId}/branches`)
                .then(res => setBranches(res.data))
                .catch(err => console.error(err));
        } else {
            setBranches([]);
        }
    }, [selectedCompanyId]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/login`, {
                email,
                password,
                companyId: selectedCompanyId,
                branchId: selectedBranchId
            });

            const loggedInUser = res.data.user;
            if (!['BRANCH_ADMIN', 'BRANCH_HR', 'CUSTOMER_CARE'].includes(loggedInUser.role)) {
                addToast("Only Branch Admin, HR, or Customer Care can activate Kiosk mode.", "error");
                return;
            }

            login(res.data.token, loggedInUser);
            addToast("Kiosk Activated Successfully", "success");
        } catch (err: any) {
            addToast(err.response?.data?.error || "Login failed", "error");
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleNumpad = (num: string) => {
        if (pin.length < 3) setPin(prev => prev + num);
        setStatus(null);
        setMatchedUsers([]);
    };

    const handleClear = () => {
        setPin('');
        setMatchedUsers([]);
    };
    
    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setMatchedUsers([]);
    };

    const handlePunch = async (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
        if (pin.length !== 3) {
            setStatus({ type: 'error', message: 'Please enter exactly 3 digits' });
            return;
        }

        setIsVerifying(true);
        setStatus({ type: 'info', message: 'Verifying Employee ID...' });

        try {
            const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/attendance/kiosk/verify-id`, {
                employeeIdSuffix: pin
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const users = verifyRes.data.users;
            
            if (users.length === 1) {
                await performFacialVerification(users[0], type);
            } else if (users.length > 1) {
                setMatchedUsers(users);
                setStatus({ type: 'info', message: 'Multiple users found. Please select your name.' });
            }
        } catch (error: any) {
            setStatus({ type: 'error', message: error.response?.data?.error || 'Verification Failed' });
            setPin('');
        } finally {
            if (matchedUsers.length === 0) setIsVerifying(false);
        }
    };

    const performFacialVerification = async (targetUser: any, type: 'CLOCK_IN' | 'CLOCK_OUT') => {
        setIsVerifying(true);
        setStatus({ type: 'info', message: `Verifying face for ${targetUser.fullName}...` });

        try {
            let imageSrc = webcamRef.current?.getScreenshot() || undefined;
            if (!imageSrc) throw new Error("Could not capture webcam image.");

            if (!targetUser.referencePhotoUrl) {
                throw new Error("No AI Facial Verification Photo set up in your profile.");
            }

            const refImg = new Image();
            refImg.crossOrigin = "anonymous";
            refImg.src = targetUser.referencePhotoUrl;
            await new Promise((resolve, reject) => {
                refImg.onload = resolve;
                refImg.onerror = () => reject(new Error("Failed to load reference photo"));
            });

            const refDetection = await faceapi.detectSingleFace(refImg).withFaceLandmarks().withFaceDescriptor();
            if (!refDetection) throw new Error("Could not detect face in your reference photo.");

            const liveImg = new Image();
            liveImg.src = imageSrc;
            await new Promise((resolve) => { liveImg.onload = resolve; });

            const liveDetection = await faceapi.detectSingleFace(liveImg).withFaceLandmarks().withFaceDescriptor();
            if (!liveDetection) throw new Error("Could not detect face in webcam.");

            const distance = faceapi.euclideanDistance(refDetection.descriptor, liveDetection.descriptor);
            
            if (distance > 0.55) {
                throw new Error(`Facial Verification Failed (confidence: ${distance.toFixed(2)})`);
            }

            setStatus({ type: 'info', message: 'Identity confirmed! Punching...' });

            const endpoint = type === 'CLOCK_IN' ? 'kiosk/clock-in' : 'kiosk/clock-out';
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/attendance/${endpoint}`, {
                userId: targetUser.id,
                photoBase64: imageSrc
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatus({ type: 'success', message: `Successfully ${type === 'CLOCK_IN' ? 'Clocked In' : 'Clocked Out'}!` });
            
            setTimeout(() => {
                setStatus(null);
                setPin('');
                setMatchedUsers([]);
            }, 3000);

        } catch (error: any) {
            console.error(error);
            setStatus({ type: 'error', message: error.message || error.response?.data?.error || 'Verification Failed' });
            setPin('');
            setMatchedUsers([]);
        } finally {
            setIsVerifying(false);
        }
    };

    if (!isAuthorizedAdmin) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-700">
                    <div className="text-center mb-8">
                        <div className="bg-indigo-500/20 p-4 rounded-2xl inline-block mb-4">
                            <Building2 size={40} className="text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-black text-white">Kiosk Setup</h1>
                        <p className="text-gray-400 text-sm mt-2">Login as Branch Admin, HR, or Customer Care to activate this device.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">Company</label>
                            <select
                                required
                                value={selectedCompanyId}
                                onChange={(e) => {
                                    setSelectedCompanyId(e.target.value);
                                    setSelectedBranchId('');
                                }}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500"
                            >
                                <option value="">Select Company...</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {branches.length > 0 && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1">Branch</label>
                                <select
                                    required
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Branch...</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn || !selectedBranchId}
                            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 mt-4"
                        >
                            {isLoggingIn ? 'Authenticating...' : 'Activate Kiosk'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const companyAbbr = user?.company?.abbreviation || 'COMP';
    const branchAbbr = user?.branch?.abbreviation || user?.branch?.name?.substring(0, 3).toUpperCase() || 'BRA';
    const idPrefix = `${companyAbbr}/${branchAbbr}/`;

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-gray-700">
                
                {/* Left Side - Time & Camera */}
                <div className="w-full lg:w-1/2 p-8 bg-gray-800 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-700 relative">
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="absolute top-6 left-6 text-gray-400 hover:text-white transition flex items-center text-sm font-semibold"
                    >
                        Exit Kiosk
                    </button>
                    <div className="text-center mb-8 mt-6">
                        <Clock size={48} className="text-indigo-400 mx-auto mb-4" />
                        <h1 className="text-5xl font-black text-white tabular-nums tracking-tight">
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </h1>
                        <p className="text-gray-400 mt-2 font-medium">
                            {time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-gray-700 bg-gray-900 shadow-inner">
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
                    <p className="text-gray-500 text-sm mt-6 text-center bg-gray-900 px-4 py-2 rounded-full font-medium">Look at the camera when punching in</p>
                </div>

                {/* Right Side - Numpad */}
                <div className="w-full lg:w-1/2 p-8 bg-gray-900 flex flex-col items-center justify-center relative">
                    {matchedUsers.length > 0 ? (
                        <div className="w-full max-w-md animate-fade-in">
                            <h2 className="text-2xl font-bold text-white mb-6 text-center">Select Your Identity</h2>
                            <div className="space-y-3">
                                {matchedUsers.map(u => (
                                    <button
                                        key={u.id}
                                        className="w-full bg-gray-800 border border-gray-700 p-4 rounded-xl flex items-center justify-between hover:border-indigo-500 transition group"
                                    >
                                        <div className="text-left">
                                            <div className="font-bold text-white text-lg group-hover:text-indigo-400 transition">{u.fullName}</div>
                                            <div className="text-gray-400 text-sm">{u.employeeId} • {u.role.replace(/_/g, ' ')}</div>
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <div 
                                                className="bg-green-600/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-600 hover:text-white transition text-center"
                                                onClick={(e) => { e.stopPropagation(); setMatchedUsers([]); performFacialVerification(u, 'CLOCK_IN'); }}
                                            >IN</div>
                                            <div 
                                                className="bg-red-600/20 text-red-400 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition text-center"
                                                onClick={(e) => { e.stopPropagation(); setMatchedUsers([]); performFacialVerification(u, 'CLOCK_OUT'); }}
                                            >OUT</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={handleClear} className="w-full mt-6 text-gray-400 hover:text-white text-sm font-semibold">Cancel</button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                                Employee ID
                            </h2>
                            <div className="text-indigo-400 font-mono font-bold text-lg mb-6">{idPrefix}</div>

                            {/* PIN Display */}
                            <div className="flex space-x-4 mb-8">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className={`w-16 h-20 rounded-xl flex items-center justify-center text-4xl font-black border-2 transition-all ${
                                        i < pin.length 
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' 
                                            : 'bg-gray-800 border-gray-700 text-transparent'
                                    }`}>
                                        {i < pin.length ? pin[i] : ''}
                                    </div>
                                ))}
                            </div>

                            {/* Status Message */}
                            {status && (
                                <div className={`absolute top-4 inset-x-8 p-3 rounded-lg flex items-center justify-center text-sm font-bold shadow-lg transform transition-all z-10 ${
                                    status.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 
                                    status.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                }`}>
                                    {status.type === 'success' ? <CheckCircle size={18} className="mr-2" /> : 
                                     status.type === 'error' ? <AlertTriangle size={18} className="mr-2" /> :
                                     <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin mr-2"></div>}
                                    {status.message}
                                </div>
                            )}

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-[320px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button key={num} onClick={() => handleNumpad(num.toString())} className="h-20 rounded-2xl bg-gray-800 text-3xl font-semibold text-white hover:bg-gray-700 active:bg-gray-600 transition shadow-sm border border-gray-700">
                                        {num}
                                    </button>
                                ))}
                                <button onClick={handleClear} className="h-20 rounded-2xl bg-gray-800/50 text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 transition">
                                    CLEAR
                                </button>
                                <button onClick={() => handleNumpad('0')} className="h-20 rounded-2xl bg-gray-800 text-3xl font-semibold text-white hover:bg-gray-700 active:bg-gray-600 transition shadow-sm border border-gray-700">
                                    0
                                </button>
                                <button onClick={handleBackspace} className="h-20 rounded-2xl bg-gray-800/50 text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 transition">
                                    DEL
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-4 w-full max-w-[320px]">
                                <button 
                                    onClick={() => handlePunch('CLOCK_IN')}
                                    disabled={isVerifying || pin.length !== 3}
                                    className="h-16 rounded-xl bg-green-600 text-white font-black text-lg flex items-center justify-center hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(22,163,74,0.39)]"
                                >
                                    <LogIn size={24} className="mr-2" /> IN
                                </button>
                                <button 
                                    onClick={() => handlePunch('CLOCK_OUT')}
                                    disabled={isVerifying || pin.length !== 3}
                                    className="h-16 rounded-xl bg-red-600 text-white font-black text-lg flex items-center justify-center hover:bg-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(220,38,38,0.39)]"
                                >
                                    <LogOut size={24} className="mr-2" /> OUT
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

