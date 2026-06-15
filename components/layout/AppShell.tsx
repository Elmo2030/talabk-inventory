'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import LoadingGate from '@/components/layout/LoadingGate';
import TalabkLogo from '@/components/ui/TalabkLogo';
import CommandPalette from '@/components/ui/CommandPalette';
import SubscriptionBanner from '@/components/layout/SubscriptionBanner';
import OfflineBanner from '@/components/ui/OfflineBanner';

// Pages that don't require login — rendered fullscreen without sidebar
const PUBLIC_PATHS  = ['/', '/register', '/pricing', '/about', '/contact', '/403'];
// Auth-flow pages — fullscreen, redirect away if already logged in
const AUTH_PATHS    = ['/login', '/setup', '/superadmin/login', '/reset-password'];
// Combined: all pages that bypass the "must be logged in" guard
const NO_AUTH_PATHS = [...PUBLIC_PATHS, ...AUTH_PATHS];

// Paths that have their OWN shell/layout — AppShell must not add a sidebar
const SELF_MANAGED_PREFIXES = ['/superadmin', '/app/', '/auth/', '/s/'];

function isNoAuthPath(pathname: string) {
  return NO_AUTH_PATHS.some(p => pathname === p) ||
    pathname.startsWith('/auth/'); // /auth/callback etc.
}

function isSelfManaged(pathname: string) {
  return SELF_MANAGED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { isLoggedIn, isSetupDone, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initialized) return;
    // Self-managed paths (/superadmin/*, /app/*) have their own server-side
    // auth guards — AppShell must not interfere with them
    if (isSelfManaged(pathname)) return;
    // Only redirect to login if the page actually requires auth
    if (isSetupDone && !isLoggedIn && !isNoAuthPath(pathname)) {
      router.replace('/login');
    }
  }, [initialized, isLoggedIn, isSetupDone, pathname, router]);

  // 1. Self-managed sections render children directly — they have their own layout
  if (isSelfManaged(pathname)) {
    return <>{children}</>;
  }

  // 2. Not yet initialized — show spinner only for protected pages
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

  // 3. Protected page + not logged in — wait for redirect
  if (initialized && isSetupDone && !isLoggedIn && !isNoAuthPath(pathname)) {
    return null;
  }

  // 4. Public or auth pages — fullscreen, no sidebar
  if (isNoAuthPath(pathname)) {
    return <>{children}</>;
  }

  // 5. Full app layout with tenant sidebar (logged-in tenant users)
  return (
    <div className="flex min-h-screen flex-col-reverse md:flex-row">
      <Sidebar />
      <div className="flex-1 md:mr-64 pt-14 md:pt-0 flex flex-col">
        <OfflineBanner />
        <SubscriptionBanner />
        <main className="flex-1 p-4 md:p-8">
          <LoadingGate>{children}</LoadingGate>
        </main>
      </div>
      <CommandPalette />
      {/* Mobile bottom navigation — hidden on md+ */}
      <BottomNav
        onOpenMore={() => window.dispatchEvent(new Event('talabk:open-sidebar'))}
      />
    </div>
  );
}
