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

const AUTH_PATHS = ['/login', '/setup'];

export default function AppShell({ children }: { children: ReactNode }) {
  const { isLoggedIn, isSetupDone, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initialized) return;

    if (!isSetupDone && pathname !== '/setup') {
      router.replace('/setup');
      return;
    }
    if (isSetupDone && !isLoggedIn && !AUTH_PATHS.includes(pathname)) {
      router.replace('/login');
      return;
    }
    if (isLoggedIn && AUTH_PATHS.includes(pathname)) {
      router.replace('/');
    }
  }, [initialized, isLoggedIn, isSetupDone, pathname, router]);

  // 1. Not yet initialized — spinner
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
        <div className="flex flex-col items-center gap-4">
          <TalabkLogo size={64} />
          <div className="w-8 h-8 border-4 border-[#E5302A] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // 2. Setup not done, not on /setup — wait for redirect
  if (!isSetupDone && pathname !== '/setup') {
    return null;
  }

  // 3. Setup done, not logged in, not on auth page — wait for redirect
  if (isSetupDone && !isLoggedIn && !AUTH_PATHS.includes(pathname)) {
    return null;
  }

  // 4. Logged in but on auth page — wait for redirect
  if (isLoggedIn && AUTH_PATHS.includes(pathname)) {
    return null;
  }

  // 5. Auth pages — fullscreen, no sidebar
  if (AUTH_PATHS.includes(pathname)) {
    return (
      <div className="min-h-screen bg-[#F2F2F7]">
        {children}
      </div>
    );
  }

  // 6. Full app layout
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 mr-64 p-8">
        <LoadingGate>{children}</LoadingGate>
      </main>
    </div>
  );
}
