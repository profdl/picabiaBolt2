import React, { createContext, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { mockUser } from '../lib/mockUser';

interface MockAuthContextType {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string) => Promise<{ error: string | null }>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

export const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const register = async () => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { error: null };
  };

  const login = async () => {
    setLoading(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(mockUser);
    setLoading(false);
    return { error: null };
  };

  const logout = async () => {
    setLoading(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(null);
    setLoading(false);
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout
  };

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
} 