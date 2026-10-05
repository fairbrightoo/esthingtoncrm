import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { X, Camera, CheckCircle, AlertTriangle } from 'lucide-react';

interface FaceRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FaceRegistrationModal: React.FC<FaceRegistrationModalProps> = ({ isOpen, onClose }) => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    const webcamRef = useRef<Webcam>(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [step, setStep] = useState(0); 
    const [isProcessing, setIsProcessing] = useState(false);
    const [descriptors, setDescriptors] = useState<number[][]>([]);
    const [errorMsg, setErrorMsg] = useState('');

    const steps = [
        { label: "Look straight at the camera", id: "straight" },
        { label: "Turn your head slightly to the left", id: "left" },
        { label: "Turn your head slightly to the right", id: "right" }
    ];

    useEffect(() => {
        if (!isOpen) return;

        const loadModels = async () => {
            try {
                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (error) {
                console.error("Failed to load models:", error);
                setErrorMsg("Failed to load AI models. Please check your internet connection.");
            }
        };

        loadModels();
    }, [isOpen]);

    const handleCapture = async () => {
        if (!webcamRef.current) return;
        setIsProcessing(true);
        setErrorMsg('');

        try {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) throw new Error("Could not capture image from webcam.");

            const img = new Image();
            img.src = imageSrc;
            await new Promise((resolve) => { img.onload = resolve; });

            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

            if (!detection) {
                throw new Error("No face detected! Please ensure your face is clearly visible.");
            }

            // Convert Float32Array to standard array for JSON serialization
            const descriptorArray = Array.from(detection.descriptor);
            
            const newDescriptors = [...descriptors, descriptorArray];
            setDescriptors(newDescriptors);

            if (step < steps.length - 1) {
                setStep(step + 1);
            } else {
                // Done! Send to backend
                await saveDescriptors(newDescriptors);
            }
        } catch (error: any) {
            setErrorMsg(error.message || "An error occurred during capture.");
        } finally {
            setIsProcessing(false);
        }
    };

    const saveDescriptors = async (finalDescriptors: number[][]) => {
        setIsProcessing(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile/${user?.id}/face-descriptors`, {
                faceDescriptors: finalDescriptors
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            addToast("Face ID Setup Complete!", "success");
            onClose();
        } catch (error) {
            console.error("Failed to save descriptors:", error);
            setErrorMsg("Failed to save facial data to the server. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500 hover:text-gray-800 transition z-10"
                >
                    <X size={20} />
                </button>

                <div className="p-6 text-center border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Face ID Setup</h2>
                    <p className="text-sm text-gray-500 mt-1">Register your face for instant attendance verification.</p>
                </div>

                <div className="p-6">
                    {!modelsLoaded ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium">Initializing AI Engine...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[4/3] flex items-center justify-center">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{ facingMode: "user" }}
                                    className="w-full h-full object-cover"
                                />
                                
                                {/* Overlay guides */}
                                <div className="absolute inset-0 pointer-events-none border-[6px] border-indigo-500/30 rounded-2xl"></div>
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-[40%]"></div>
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="inline-flex items-center justify-center space-x-2 mb-4">
                                    {steps.map((s, idx) => (
                                        <div key={s.id} className={`w-3 h-3 rounded-full ${idx === step ? 'bg-indigo-600 scale-125' : idx < step ? 'bg-green-500' : 'bg-gray-200'} transition-all`}></div>
                                    ))}
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">{steps[step].label}</h3>
                            </div>

                            {errorMsg && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-xl flex items-start gap-2 text-sm">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <button
                                onClick={handleCapture}
                                disabled={isProcessing}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 font-bold transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={20} />
                                        <span>{step === steps.length - 1 ? 'Complete Setup' : 'Capture Angle'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
