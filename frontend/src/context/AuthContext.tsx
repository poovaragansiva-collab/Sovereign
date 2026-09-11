import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import { authApi } from '../api';

export interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  role: string;
  status: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    const token = localStorage.getItem('sovereign_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.me();
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      localStorage.removeItem('sovereign_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (token: string) => {
    localStorage.setItem('sovereign_token', token);
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('sovereign_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
