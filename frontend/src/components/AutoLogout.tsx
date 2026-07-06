import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AutoLogout = () => {
    const { isAuthenticated, logout } = useAuth();
    const { addToast } = useToast();
    const lastActivityTime = useRef<number>(Date.now());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

    const checkIdleStatus = () => {
        if (!isAuthenticated) return;
        
        const lastSaved = localStorage.getItem('lastActivityTime');
        const lastActivity = lastSaved ? parseInt(lastSaved, 10) : Date.now();
        const now = Date.now();
        
        if (now - lastActivity >= TIMEOUT_MS) {
            localStorage.removeItem('lastActivityTime');
            logout();
            addToast("You have been logged out due to inactivity.", "warning");
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        localStorage.setItem('lastActivityTime', Date.now().toString());

        // Check every 10 seconds to see if they've exceeded the idle timeout
        intervalRef.current = setInterval(checkIdleStatus, 10000);

        // Throttle activity updates to avoid excessive state changes
        let throttleTimer: NodeJS.Timeout | null = null;

        const handleActivity = () => {
            if (throttleTimer) return;
            
            // If they are ALREADY timed out when they perform activity (e.g. waking up phone),
            // log them out IMMEDIATELY before updating the timer.
            const lastSaved = localStorage.getItem('lastActivityTime');
            const lastActivity = lastSaved ? parseInt(lastSaved, 10) : Date.now();
            const now = Date.now();
            
            if (now - lastActivity >= TIMEOUT_MS) {
                checkIdleStatus();
                return;
            }

            localStorage.setItem('lastActivityTime', now.toString());
            throttleTimer = setTimeout(() => {
                throttleTimer = null;
            }, 1000); // only update max once per second
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkIdleStatus();
            }
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'lastActivityTime') {
                checkIdleStatus();
            }
        };

        const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (throttleTimer) clearTimeout(throttleTimer);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [isAuthenticated, logout, addToast]);

    return null;
};
