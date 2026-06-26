import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Camera, MapPin, CheckCircle, AlertTriangle, LogIn, LogOut } from 'lucide-react';

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const ClockInComponent = ({ onClockInSuccess }: { onClockInSuccess?: () => void }) => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    
    const webcamRef = useRef<Webcam>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [statusText, setStatusText] = useState('Initializing Models...');
    
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    
    const [branchData, setBranchData] = useState<any>(null);
    const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null);

    // Fetch Branch Location & Reference Photo Descriptor
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // 1. Get user profile for Reference Photo
                const profileRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile/${user?.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const profile = profileRes.data;
                setBranchData(profile.branch);

                if (!profile.referencePhotoUrl) {
                    setStatusText('No Reference Photo found. Please upload one in Profile Settings.');
                    return;
                }

                // 2. Load face-api models (using jsdelivr CDN for fast remote loading)
                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                setStatusText('Models Loaded. Preparing Reference Image...');

                // 3. Process Reference Image from URL
                const imgUrl = profile.referencePhotoUrl.startsWith('http') 
                    ? profile.referencePhotoUrl 
                    : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${profile.referencePhotoUrl}`;
                
                // Proxy image if cross-origin
                const proxyUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/proxy-image?url=${encodeURIComponent(imgUrl)}`;
                
                const img = await faceapi.fetchImage(proxyUrl);
                const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                
                if (detection) {
                    setReferenceDescriptor(detection.descriptor);
                    setStatusText('Ready for Verification');
                } else {
                    setStatusText('Could not detect a face in your Reference Photo. Please upload a clearer photo.');
                }
            } catch (err) {
                console.error(err);
                setStatusText('Failed to initialize verification system.');
            }
        };

        if (user) {
            fetchConfig();
        }
    }, [user, token]);

    // Request GPS Location
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => {
                    setLocationError(err.message);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setLocationError("Geolocation is not supported by this browser.");
        }
    }, []);

    const captureAndVerify = useCallback(async (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
        if (!modelsLoaded || !referenceDescriptor || !webcamRef.current) return;
        if (!location) {
            addToast("Location not acquired yet. Please ensure GPS is enabled.", "error");
            return;
        }

        // Branch Geofence Check
        if (branchData && branchData.latitude && branchData.longitude) {
            const dist = calculateDistance(location.lat, location.lng, branchData.latitude, branchData.longitude);
            const maxRadius = branchData.geofenceRadius || 20; // default 20m
            if (dist > maxRadius) {
                addToast(`You are too far from the office (${Math.round(dist)}m away). Must be within ${maxRadius}m.`, "error");
                return;
            }
        }

        setIsVerifying(true);
        setStatusText('Capturing and verifying face...');

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setIsVerifying(false);
            setStatusText('Failed to capture image');
            return;
        }

        try {
            // Load base64 image as HTMLImageElement
            const img = new Image();
            img.src = imageSrc;
            await new Promise((resolve) => { img.onload = resolve; });

            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

            if (!detection) {
                addToast("No face detected in webcam.", "error");
                setStatusText('Ready for Verification');
                setIsVerifying(false);
                return;
            }

            // Compare faces
            const distance = faceapi.euclideanDistance(referenceDescriptor, detection.descriptor);
            
            // 0.6 is typical threshold for Euclidean distance in face-api. Lower is stricter.
            if (distance > 0.55) {
                addToast(`Facial Verification Failed (confidence: ${distance.toFixed(2)}).`, "error");
                setStatusText('Face did not match reference photo.');
                setIsVerifying(false);
                return;
            }

            setStatusText('Verification Successful! Submitting...');
            
            // Send to Backend
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/attendance/${type === 'CLOCK_IN' ? 'clock-in' : 'clock-out'}`, {
                method: 'SOFTWARE',
                gpsLatitude: location.lat,
                gpsLongitude: location.lng,
                photoBase64: imageSrc
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            addToast(`Successfully ${type === 'CLOCK_IN' ? 'Clocked In' : 'Clocked Out'}`, "success");
            setStatusText('Ready for Verification');
            if (onClockInSuccess) onClockInSuccess();

        } catch (error: any) {
            console.error(error);
            addToast(error.response?.data?.error || "Failed to process attendance", "error");
            setStatusText('Ready for Verification');
        } finally {
            setIsVerifying(false);
        }
    }, [modelsLoaded, referenceDescriptor, location, branchData, token, addToast, onClockInSuccess]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Smart Attendance</h2>
            
            {/* Status Indicator */}
            <div className={`p-3 rounded-lg mb-4 text-center text-sm font-medium ${
                statusText === 'Ready for Verification' ? 'bg-green-50 text-green-700' : 
                statusText.includes('Failed') || statusText.includes('Could not') ? 'bg-red-50 text-red-700' :
                'bg-blue-50 text-blue-700'
            }`}>
                {statusText}
            </div>

            {/* GPS Status */}
            <div className="flex items-center justify-center space-x-2 text-sm mb-4">
                <MapPin size={16} className={location ? "text-green-500" : "text-gray-400"} />
                {location ? (
                    <span className="text-green-700 font-medium">Location Secured</span>
                ) : locationError ? (
                    <span className="text-red-500 font-medium">{locationError}</span>
                ) : (
                    <span className="text-gray-500">Acquiring GPS...</span>
                )}
            </div>

            {/* Webcam feed */}
            <div className="relative rounded-xl overflow-hidden bg-gray-100 mb-6 border-4 border-gray-200 aspect-square flex items-center justify-center">
                {modelsLoaded && referenceDescriptor ? (
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ width: 400, height: 400, facingMode: "user" }}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="text-gray-400 flex flex-col items-center">
                        <Camera size={48} className="mb-2 opacity-50" />
                        <span className="text-sm font-medium">Camera off</span>
                    </div>
                )}
                
                {/* Overlay for face guide */}
                <div className="absolute inset-0 border-2 border-dashed border-white/50 m-8 rounded-full pointer-events-none"></div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => captureAndVerify('CLOCK_IN')}
                    disabled={isVerifying || !modelsLoaded || !referenceDescriptor || !location}
                    className="flex items-center justify-center space-x-2 bg-green-600 text-white py-3 rounded-xl font-bold shadow-sm hover:bg-green-700 transition disabled:opacity-50"
                >
                    <LogIn size={18} />
                    <span>Clock In</span>
                </button>
                <button
                    onClick={() => captureAndVerify('CLOCK_OUT')}
                    disabled={isVerifying || !modelsLoaded || !referenceDescriptor || !location}
                    className="flex items-center justify-center space-x-2 bg-red-600 text-white py-3 rounded-xl font-bold shadow-sm hover:bg-red-700 transition disabled:opacity-50"
                >
                    <LogOut size={18} />
                    <span>Clock Out</span>
                </button>
            </div>
        </div>
    );
};
