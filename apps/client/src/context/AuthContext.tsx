import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ApiError,
  getProfile,
  login as apiLogin,
  signup as apiSignup,
  updateProfile as apiUpdateProfile,
  type ApiUser,
  type ProfilePatch,
  type SignupInput,
} from '@/api/client';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/api/tokenStorage';

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
  /** True while the stored session is being restored on app boot. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
}

/** Maps the API user onto the shape the screens already consume. */
function toUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    displayName: apiUser.displayName,
    age: apiUser.age ?? undefined,
    xp: apiUser.xp,
    streak: apiUser.streak,
    level: apiUser.level,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Boot restore: if a token was persisted, fetch the profile to re-establish
  // the session. `isLoading` stays true for the whole restore so index.tsx
  // doesn't flash the login screen for an already signed-in user.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const apiUser = await getProfile(token);
        if (!cancelled) setUser(toUser(apiUser));
      } catch (error) {
        // A 401 means the token is invalid/expired — drop it. Other failures
        // (e.g. server temporarily unreachable) keep the token so a flaky
        // connection doesn't sign the user out for good.
        if (error instanceof ApiError && error.status === 401) {
          await clearAuthToken();
        }
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const session = await apiLogin({ email, password });
    await setAuthToken(session.token);
    setUser(toUser(session.user));
  };

  const signup = async (input: SignupInput) => {
    const session = await apiSignup(input);
    await setAuthToken(session.token);
    setUser(toUser(session.user));
  };

  const logout = async () => {
    setUser(null);
    await clearAuthToken();
  };

  const updateProfile = async (patch: ProfilePatch) => {
    const token = await getAuthToken();
    if (!token) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.');
    }
    try {
      const apiUser = await apiUpdateProfile(token, patch);
      setUser(toUser(apiUser));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        await clearAuthToken();
      }
      throw error;
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
        updateProfile,
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
