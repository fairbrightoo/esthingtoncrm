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
        const now = Date.now();
        if (now - lastActivityTime.current >= TIMEOUT_MS) {
            logout();
            addToast("You have been logged out due to inactivity.", "warning");
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        lastActivityTime.current = Date.now();

        // Check every 10 seconds to see if they've exceeded the idle timeout
        intervalRef.current = setInterval(checkIdleStatus, 10000);

        // Throttle activity updates to avoid excessive state changes
        let throttleTimer: NodeJS.Timeout | null = null;

        const handleActivity = () => {
            if (throttleTimer) return;
            
            // If they are ALREADY timed out when they perform activity (e.g. waking up phone),
            // log them out IMMEDIATELY before updating the timer.
            const now = Date.now();
            if (now - lastActivityTime.current >= TIMEOUT_MS) {
                checkIdleStatus();
                return;
            }

            lastActivityTime.current = now;
            throttleTimer = setTimeout(() => {
                throttleTimer = null;
            }, 1000); // only update max once per second
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkIdleStatus();
            }
        };

        const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (throttleTimer) clearTimeout(throttleTimer);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isAuthenticated, logout, addToast]);

    return null;
};
