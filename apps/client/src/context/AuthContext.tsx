import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  displayName: string;
  age?: number;
  xp: number;
  streak: number;
  level: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (displayName: string, email: string, password: string, age: number) => Promise<void>;
  logout: () => void;
  updateDisplayName: (name: string) => void;
}

const DEMO_USER: User = {
  id: 'usr_demo_123',
  email: 'alex@pikpok.app',
  displayName: 'Alex Rivers',
  age: 24,
  xp: 1450,
  streak: 12,
  level: 7,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(DEMO_USER);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, _password?: string) => {
    setIsLoading(true);
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    setUser({
      id: `usr_${Date.now()}`,
      email,
      displayName: email.split('@')[0] || 'Puzzle Solver',
      age: 22,
      xp: 1200,
      streak: 5,
      level: 4,
    });
    setIsLoading(false);
  };

  const signup = async (displayName: string, email: string, _password: string, age: number) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setUser({
      id: `usr_${Date.now()}`,
      email,
      displayName: displayName.trim() || 'New Solver',
      age: age || 20,
      xp: 100,
      streak: 1,
      level: 1,
    });
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
  };

  const updateDisplayName = (name: string) => {
    if (user) {
      setUser({ ...user, displayName: name });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateDisplayName,
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
