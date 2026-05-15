'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import LoadingGate from '@/components/layout/LoadingGate';

function TalabkLogo({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M28 2C13 2 2 13 2 26C2 40 13 52 21 61L28 69L35 61C43 52 54 40 54 26C54 13 43 2 28 2Z"
        fill="#E5302A"
      />
      <path
        d="M17 9C11 14 8 20 8 27C8 35 13 43 20 50"
        stroke="#C42B24"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.55"
        fill="none"
      />
      <rect x="12" y="17" width="32" height="9" rx="3.5" fill="white" />
      <rect x="22" y="17" width="12" height="26" rx="3.5" fill="white" />
      <polygon points="28,69 22,60 34,60" fill="#E5302A" />
      <ellipse cx="28" cy="71" rx="8" ry="3" stroke="#E5302A" strokeWidth="1.8" fill="none" />
    </svg>
  );
}

// Pages that don't require login — rendered fullscreen without sidebar
const PUBLIC_PATHS  = ['/', '/register', '/pricing', '/about', '/contact', '/403'];
// Auth-flow pages — fullscreen, redirect away if already logged in
const AUTH_PATHS    = ['/login', '/setup', '/superadmin/login', '/reset-password'];
// Combined: all pages that bypass the "must be logged in" guard
const NO_AUTH_PATHS = [...PUBLIC_PATHS, ...AUTH_PATHS];

function isNoAuthPath(pathname: string) {
  return NO_AUTH_PATHS.some(p => pathname === p) ||
    pathname.startsWith('/auth/'); // /auth/callback etc.
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { isLoggedIn, isSetupDone, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initialized) return;

    // Only redirect to login if the page actually requires auth
    if (isSetupDone && !isLoggedIn && !isNoAuthPath(pathname)) {
      router.replace('/login');
    }
  }, [initialized, isLoggedIn, isSetupDone, pathname, router]);

  // 1. Not yet initialized — show spinner only for protected pages
  if (!initialized && !isNoAuthPath(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
        <div className="flex flex-col items-center gap-4">
          <TalabkLogo size={64} />
          <div className="w-8 h-8 border-4 border-[#E5302A] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // 2. Protected page + not logged in — wait for redirect
  if (initialized && isSetupDone && !isLoggedIn && !isNoAuthPath(pathname)) {
    return null;
  }

  // 3. Public or auth pages — fullscreen, no sidebar
  if (isNoAuthPath(pathname)) {
    return <>{children}</>;
  }

  // 4. Full app layout (logged in)
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:mr-64 pt-14 md:pt-0 p-4 md:p-8">
        <LoadingGate>{children}</LoadingGate>
      </main>
    </div>
  );
}
