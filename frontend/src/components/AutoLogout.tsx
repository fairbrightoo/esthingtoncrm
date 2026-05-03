import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AutoLogout = () => {
    const { isAuthenticated, logout } = useAuth();
    const { addToast } = useToast();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (isAuthenticated) {
            timeoutRef.current = setTimeout(() => {
                logout();
                addToast("You have been logged out due to inactivity.", "warning");
            }, TIMEOUT_MS);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        resetTimeout();

        // Throttle the reset to avoid excessive clears and setTimeouts on mousemove
        let throttleTimer: NodeJS.Timeout | null = null;

        const handleActivity = () => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
                resetTimeout();
                throttleTimer = null;
            }, 1000); // only reset max once per second
        };

        const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (throttleTimer) clearTimeout(throttleTimer);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [isAuthenticated, logout, addToast]);

    return null;
};
