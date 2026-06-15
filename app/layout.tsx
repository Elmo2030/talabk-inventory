import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { StockProvider } from '@/lib/StockContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import AppShell from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export const metadata: Metadata = {
  title: 'طلبك — للمتاجر الإلكترونية',
  description: 'نظام احترافي لإدارة المخزون — طلبك 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inline boot script: runs before React hydrates, sets `dark` class on
  // <html> from localStorage or OS preference. Eliminates FOUC + hydration
  // mismatch. Must be a string so Next.js serializes it into the SSR HTML.
  const themeBootScript = `
    (function() {
      try {
        var saved = localStorage.getItem('talabk_theme');
        var isDark = saved
          ? saved === 'dark'
          : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) document.documentElement.classList.add('dark');
      } catch (e) {}
    })();
  `;

  // Per-request CSP nonce — set by middleware.ts. Falls back to an empty
  // string in build-time render paths (the inline script is still allowed
  // by the static fallback because the dev/prod CSP includes `'strict-dynamic'`).
  const nonce = headers().get('x-nonce') ?? '';

  return (
    <html lang="ar" dir="rtl">
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-arabic bg-[#F2F2F7] dark:bg-[#09090B] text-slate-900 dark:text-[#F4F4F5] antialiased">
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <StockProvider>
                <ToastProvider>
                  <ConfirmDialogProvider>
                    <AppShell>{children}</AppShell>
                  </ConfirmDialogProvider>
                </ToastProvider>
              </StockProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
