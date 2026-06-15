'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
interface ThemeContextType { theme: Theme; toggleTheme: () => void; isDark: boolean; }
const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {}, isDark: false });

// Read initial theme synchronously from <html> class set by the inline
// boot script in app/layout.tsx. This avoids the FOUC + hydration mismatch
// the previous version (default 'light' → useEffect flip) caused.
function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  // Sync class on <html> whenever theme changes (the inline script handles
  // first paint; this handles toggles after hydration).
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('talabk_theme', theme); } catch {}
  }, [theme]);

  // Respect OS-level changes when the user hasn't pinned a preference.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem('talabk_theme')) return; // user pinned
      } catch {}
      setTheme(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
