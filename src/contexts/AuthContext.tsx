// client/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { username: string; email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void> | void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

interface AuthProviderProps { children: ReactNode; }

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Hydrate from storage on mount and verify with the server
  useEffect(() => {
    const init = async () => {
      try {
        const storedToken =
          localStorage.getItem('auth_token') ||
          localStorage.getItem('token'); // support legacy key
        const storedUser = localStorage.getItem('user');

        if (storedToken) {
          setToken(storedToken);
          (window as any).__authToken__ = storedToken; // immediate for axios interceptor
        }
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch { setUser(null); }
        }

        if (storedToken) {
          // Verify token and refresh user
          try {
            const me = await authAPI.getMe();
            setUser(me.user);
            localStorage.setItem('user', JSON.stringify(me.user));
            // Connect socket only after auth is valid
            socketService.connect(storedToken);
          } catch (e) {
            // Invalid token -> clear state
            clearSession();
          }
        }
      } catch (e) {
        console.error('Auth init error:', e);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSession = (tok: string, usr: User) => {
    setToken(tok);
    setUser(usr);
    localStorage.setItem('auth_token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
    (window as any).__authToken__ = tok;
  };

  const clearSession = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token'); // legacy
    localStorage.removeItem('user');
    (window as any).__authToken__ = undefined;
    try { socketService.disconnect(); } catch {}
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const tok = (res as any)?.token;
      const usr = (res as any)?.user;
      if (!tok || !usr) throw new Error('Missing token or user in login response');
      persistSession(tok, usr);
      try { socketService.connect(tok); } catch {}
      toast.success('Login successful!');
      window.location.replace('/'); // avoids history back to login
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Login failed';
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { username: string; email: string; password: string; displayName: string; }) => {
    setIsLoading(true);
    try {
      const res = await authAPI.register(userData);
      const tok = (res as any)?.token;
      const usr = (res as any)?.user;
      if (tok && usr) {
        persistSession(tok, usr);
        try { socketService.connect(tok); } catch {}
      }
      toast.success('Registration successful!');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Registration failed';
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout().catch(() => {});
    } finally {
      clearSession();
      toast.success('Logged out successfully');
      window.location.replace('/login');
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...userData };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  const refreshUser = async () => {
    try {
      if (!token) return;
      const me = await authAPI.getMe();
      setUser(me.user);
      localStorage.setItem('user', JSON.stringify(me.user));
    } catch (e) {
      console.error('refreshUser error:', e);
      clearSession();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
