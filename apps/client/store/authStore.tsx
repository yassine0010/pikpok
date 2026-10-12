import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { router } from 'expo-router';
import { api } from '@/services/api';
import type { UserProfile } from '@common/types/user.types';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (displayName: string, email: string, password: string, audienceCategory: 'CHILDREN' | 'TEENS') => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const storedToken = await api.getStoredToken();
      if (storedToken) {
        setToken(storedToken);
        api.setAuthToken(storedToken);
        const profile = await api.getProfile();
        setUser(profile);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await api.clearStoredToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setToken(response.token);
    setUser(response.user);
    await api.setStoredToken(response.token);
    api.setAuthToken(response.token);
    router.replace('/(tabs)/feed');
  };

  const signup = async (displayName: string, email: string, password: string, audienceCategory: 'CHILDREN' | 'TEENS') => {
    const response = await api.signup(displayName, email, password, audienceCategory);
    setToken(response.token);
    setUser(response.user);
    await api.setStoredToken(response.token);
    api.setAuthToken(response.token);
    router.replace('/(tabs)/feed');
  };

  const logout = async () => {
    await api.clearStoredToken();
    setToken(null);
    setUser(null);
    api.setAuthToken(null);
    router.replace('/auth/login');
  };

  const updateProfile = async (displayName: string) => {
    const updated = await api.updateProfile(displayName);
    setUser(updated);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        signup,
        logout,
        checkAuth,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}