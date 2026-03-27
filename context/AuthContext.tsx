'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser, UserRole } from '@/types';
import { getStoredUser, setStoredUser, getToken, setToken, clearToken, getMe } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: () => {},
  signOut: () => {},
  hasRole: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (token && stored) {
      setUser(stored);
      // Validate token in background
      getMe()
        .then((me) => {
          setUser(me);
          setStoredUser(me);
        })
        .catch(() => {
          clearToken();
          setUser(null);
          router.replace('/login');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const signIn = useCallback((token: string, authUser: AuthUser) => {
    setToken(token);
    setStoredUser(authUser);
    setUser(authUser);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    router.replace('/login');
  }, [router]);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
