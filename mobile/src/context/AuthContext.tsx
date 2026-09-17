import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import api from '../api/axios';

export interface RecentWorkspace {
  companyId: string;
  companyName: string;
  companyColor: string;
  branchId: string;
  branchName: string;
}

interface AuthContextType {
  token: string | null;
  user: any | null;
  recentWorkspace: RecentWorkspace | null;
  login: (token: string, user: any, workspace?: RecentWorkspace) => Promise<void>;
  logout: () => Promise<void>;
  clearRecentWorkspace: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  recentWorkspace: null,
  login: async () => {},
  logout: async () => {},
  clearRecentWorkspace: async () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [recentWorkspace, setRecentWorkspace] = useState<RecentWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('userData');
      const storedWorkspace = await AsyncStorage.getItem('recentWorkspace');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      if (storedWorkspace) {
        setRecentWorkspace(JSON.parse(storedWorkspace));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUser: any, workspace?: RecentWorkspace) => {
    try {
      await AsyncStorage.setItem('userToken', newToken);
      await AsyncStorage.setItem('userData', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      
      if (workspace) {
        await AsyncStorage.setItem('recentWorkspace', JSON.stringify(workspace));
        setRecentWorkspace(workspace);
      }
      
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      // We intentionally do NOT remove recentWorkspace so they can quickly log back in next time
      setToken(null);
      setUser(null);
      
      if (recentWorkspace) {
        router.replace('/(auth)/passcode');
      } else {
        router.replace('/(workspace)/companies');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearRecentWorkspace = async () => {
    try {
      await AsyncStorage.removeItem('recentWorkspace');
      setRecentWorkspace(null);
      router.replace('/(workspace)/companies');
    } catch (e) {
      console.error(e);
    }
  };

  // Route protection logic
  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inAuthGroup = segments[0] === '(auth)';
    const inWorkspaceGroup = segments[0] === '(workspace)';
    const isRoot = segments.length === 0;
    
    if (!token && inTabsGroup) {
      // Trying to access protected area without token
      if (recentWorkspace) {
        router.replace('/(auth)/passcode');
      } else {
        router.replace('/(workspace)/companies');
      }
    } else if (token && (isRoot || inAuthGroup || inWorkspaceGroup)) {
      // Redirect to tabs if signed in and at root/auth/workspace
      router.replace('/(tabs)');
    } else if (isRoot && !token) {
      // At root without token, decide where to send them
      if (recentWorkspace) {
        router.replace('/(auth)/passcode');
      } else {
        router.replace('/(workspace)/companies');
      }
    }
  }, [token, segments, isLoading, recentWorkspace]);

  return (
    <AuthContext.Provider value={{ token, user, recentWorkspace, login, logout, clearRecentWorkspace, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
