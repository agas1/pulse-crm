import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../data/types';
import { hasPermission as checkPermission, effectiveRole } from '../config/permissions';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  token: null,
  login: async () => ({ success: false }),
  logout: () => {},
  hasPermission: () => false,
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function getStoredToken(): string | null {
  return localStorage.getItem('pulse-auth-token');
}

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('pulse-auth-user');
    if (!stored) return null;
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(getStoredToken);

  // Validate token on mount
  useEffect(() => {
    if (token && !user) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Invalid token');
          return res.json();
        })
        .then((data) => {
          setUser(data.user);
          localStorage.setItem('pulse-auth-user', JSON.stringify(data.user));
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem('pulse-auth-token');
          localStorage.removeItem('pulse-auth-user');
        });
    }
  }, [token, user]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao fazer login' };
      }

      localStorage.setItem('pulse-auth-token', data.token);
      localStorage.setItem('pulse-auth-user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  };

  const logout = () => {
    localStorage.removeItem('pulse-auth-token');
    localStorage.removeItem('pulse-auth-user');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return checkPermission(effectiveRole(user), permission);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('pulse-auth-user', JSON.stringify(data.user));
      }
    } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, token, login, logout, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
