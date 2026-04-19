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

    useEffect(() => {
        // Load from local storage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedCompany = localStorage.getItem('selectedCompanyId');

        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedCompany) setSelectedCompanyIdState(storedCompany);

        setIsLoading(false);
    }, []);

    // Derived state for quick checks
    // const isAuthenticated = !!token; // Removed to avoid shadowing if already in return value logic or used from state directly
    // Wait, I see I defined `isAuthenticated: boolean` in interface but didn't actually return it properly from the hook?
    // Let's actually include it in the Provider value.
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedCompanyId');
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
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, isLoading, selectedCompanyId, setSelectedCompanyId }}>
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
