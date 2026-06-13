'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, UserProfile, setAuthToken } from './api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; institution?: string; semester?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem('access_token');
    if (!stored) {
      setUser(null);
      setToken(null);
      setAuthToken(null);
      return;
    }
    setAuthToken(stored);
    setToken(stored);
    try {
      const res = await authApi.getMe();
      setUser(res.data);
    } catch {
      localStorage.removeItem('access_token');
      setUser(null);
      setToken(null);
      setAuthToken(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('access_token', res.data.access_token);
    setAuthToken(res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await authApi.googleAuth(credential);
    localStorage.setItem('access_token', res.data.access_token);
    setAuthToken(res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
  };

  const register = async (data: { email: string; password: string; name: string; institution?: string; semester?: string }) => {
    const res = await authApi.register(data);
    localStorage.setItem('access_token', res.data.access_token);
    setAuthToken(res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      if (token) await authApi.logout();
    } catch {}
    localStorage.removeItem('access_token');
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
