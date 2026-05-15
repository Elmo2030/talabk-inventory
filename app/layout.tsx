import type { Metadata } from 'next';
import './globals.css';
import { StockProvider } from '@/lib/StockContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'طلبك — للمتاجر الإلكترونية',
  description: 'نظام احترافي لإدارة المخزون — طلبك 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-arabic bg-[#F2F2F7] dark:bg-[#09090B] text-slate-900 dark:text-[#F4F4F5] antialiased transition-colors duration-200">
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
      </body>
    </html>
  );
}
