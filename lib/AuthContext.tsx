'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface AuthContextType {
  isLoggedIn: boolean;
  isSetupDone: boolean;
  initialized: boolean;
  username: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setup: (username: string, password: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  changeUsername: (newUsername: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();

  const [isLoggedIn,   setIsLoggedIn]   = useState(false);
  const [initialized,  setInitialized]  = useState(false);
  const [username,     setUsername]     = useState<string | null>(null);

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUsername(session?.user?.email ?? null);
      setInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUsername(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const logout = () => {
    supabase.auth.signOut();
    setIsLoggedIn(false);
    setUsername(null);
  };

  // No longer needed — users are created via Supabase Dashboard / Super Admin
  const setup = async (_u: string, _p: string): Promise<void> => {};

  const changePassword = async (_old: string, newPassword: string): Promise<boolean> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return !error;
  };

  const changeUsername = (_newUsername: string) => {
    // Username is now the email — managed via Supabase
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      isSetupDone: true,   // Always true — Supabase is always set up
      initialized,
      username,
      login,
      logout,
      setup,
      changePassword,
      changeUsername,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
