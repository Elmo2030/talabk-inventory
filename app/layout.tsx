import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import { StockProvider } from '@/lib/StockContext';
import LoadingGate from '@/components/layout/LoadingGate';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';

export const metadata: Metadata = {
  title: 'طلبك — نظام إدارة المخازن',
  description: 'نظام احترافي لإدارة المخزون — طلبك 2026',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-arabic bg-[#F2F2F7] text-slate-900 antialiased">
        <StockProvider>
          <ToastProvider>
            <ConfirmDialogProvider>
              <LoadingGate>
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1 mr-64 p-8">{children}</main>
                </div>
              </LoadingGate>
            </ConfirmDialogProvider>
          </ToastProvider>
        </StockProvider>
      </body>
    </html>
  );
}
