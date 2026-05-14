'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/lib/auth/authService';

interface AuthContextType {
  isLoggedIn: boolean;
  isSetupDone: boolean;
  initialized: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setup: (username: string, password: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  changeUsername: (newUsername: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSetupDone, setIsSetupDone] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setIsSetupDone(authService.isSetupDone());
    setIsLoggedIn(authService.isLoggedIn());
    setUsername(authService.getUsername());
    setInitialized(true);
  }, []);

  const login = async (u: string, p: string): Promise<boolean> => {
    const ok = await authService.login(u, p);
    if (ok) {
      setIsLoggedIn(true);
      setUsername(authService.getUsername());
    }
    return ok;
  };

  const logout = () => {
    authService.logout();
    setIsLoggedIn(false);
  };

  const setup = async (u: string, p: string): Promise<void> => {
    await authService.setup(u, p);
    setIsSetupDone(true);
    setIsLoggedIn(true);
    setUsername(u);
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    return authService.changePassword(oldPassword, newPassword);
  };

  const changeUsername = (newUsername: string) => {
    authService.changeUsername(newUsername);
    setUsername(newUsername);
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isSetupDone, initialized, username, login, logout, setup, changePassword, changeUsername }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
