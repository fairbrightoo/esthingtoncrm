import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
    id: string;
    email: string;
    fullName: string;
    role: 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'CUSTOMER_CARE' | 'MARKETER' | 'BRANCH_HR' | 'MANAGING_DIRECTOR' | 'GROUP_MANAGING_DIRECTOR' | 'ACCOUNTANT';
    companyId?: string;
    branchId?: string;
    branch?: { id?: string; name: string; address: string; phone?: string; email?: string };
    company?: { id?: string; name: string; themeColor: string; logoUrl: string; address?: string; phone?: string; email?: string; website?: string };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    impersonate: (targetToken: string, targetUser: User) => void;
    returnToAdmin: () => void;
    isAdminImpersonating: boolean;
    isAuthenticated: boolean;
    isLoading: boolean;
    selectedCompanyId: string | null;
    setSelectedCompanyId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Impersonation state
    const [isAdminImpersonating, setIsAdminImpersonating] = useState(false);

    useEffect(() => {
        // Load from local storage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedCompany = localStorage.getItem('selectedCompanyId');
        
        // Check if admin is currently impersonating
        const storedAdminToken = localStorage.getItem('adminToken');
        if (storedAdminToken) {
            setIsAdminImpersonating(true);
        }

        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedCompany) setSelectedCompanyIdState(storedCompany);

        setIsLoading(false);
    }, []);

    const isAuthenticated = !!token;

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setSelectedCompanyIdState(null);
        setIsAdminImpersonating(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedCompanyId');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
    };
    
    const impersonate = (targetToken: string, targetUser: User) => {
        // Save current super admin session to safe backup storage
        const currentToken = token || localStorage.getItem('token');
        const currentUser = user || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null);
        const currentCompanyId = selectedCompanyId || localStorage.getItem('selectedCompanyId');

        if (currentToken && currentUser) {
            localStorage.setItem('adminToken', currentToken);
            localStorage.setItem('adminUser', JSON.stringify(currentUser));
            if (currentCompanyId) {
                localStorage.setItem('adminCompanyId', currentCompanyId);
            }
            setIsAdminImpersonating(true);
        }
        
        // Switch main session to target user
        login(targetToken, targetUser);
        if (targetUser.companyId) {
            setSelectedCompanyId(targetUser.companyId);
        }
    };

    const returnToAdmin = () => {
        const adminToken = localStorage.getItem('adminToken');
        const adminUser = localStorage.getItem('adminUser');
        const adminCompanyId = localStorage.getItem('adminCompanyId');
        
        if (adminToken && adminUser) {
            // Restore admin session
            login(adminToken, JSON.parse(adminUser));
            if (adminCompanyId) {
                setSelectedCompanyId(adminCompanyId);
            } else {
                setSelectedCompanyId(null);
            }
            
            // Clear backup
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminCompanyId');
            setIsAdminImpersonating(false);
        } else {
            // Fallback if data was corrupted
            logout();
        }
    };

    // Wrapper to sync with local storage
    const setSelectedCompanyId = (id: string | null) => {
        setSelectedCompanyIdState(id);
        if (id) {
            localStorage.setItem('selectedCompanyId', id);
        } else {
            localStorage.removeItem('selectedCompanyId');
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, token, login, logout, impersonate, returnToAdmin, isAdminImpersonating,
            isAuthenticated, isLoading, selectedCompanyId, setSelectedCompanyId 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
