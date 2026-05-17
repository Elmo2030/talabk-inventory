'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ============================================
// Toast System — نظام الإشعارات المخصص
// ============================================

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  /**
   * Wrap a promise to surface loading / success / error toasts automatically.
   * Use for long-running operations (> ~500ms) where a button spinner alone
   * isn't a strong enough signal — e.g. receivePurchaseInvoice (multi-step),
   * approval flows, exports.
   */
  promise: <T,>(
    p: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error:   string | ((err: Error) => string);
    }
  ) => Promise<T>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const variantStyles: Record<ToastVariant, { container: string; icon: React.ReactNode }> = {
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />,
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
  },
  info: {
    container: 'bg-slate-50 border-slate-200 text-slate-800',
    icon: <Info className="w-5 h-5 text-slate-500 flex-shrink-0" />,
  },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const { container, icon } = variantStyles[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium max-w-sm w-full animate-in slide-in-from-bottom-4 ${container}`}
      role="alert"
    >
      {icon}
      <span className="flex-1 leading-5">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, duration }]);
    },
    []
  );

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error', 6000), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  // Promise-aware toast: shows a loading hint immediately, replaces it with
  // success/error once the promise settles. Short ops (< 500ms) skip the
  // loading hint entirely so we don't flash unnecessary chrome.
  const promise = useCallback(
    async <T,>(
      p: Promise<T>,
      msgs: {
        loading: string;
        success: string | ((data: T) => string);
        error:   string | ((err: Error) => string);
      },
    ): Promise<T> => {
      const loadingTimer = window.setTimeout(() => {
        showToast(msgs.loading, 'info', 60_000);
      }, 500);
      try {
        const data = await p;
        window.clearTimeout(loadingTimer);
        const msg = typeof msgs.success === 'function' ? msgs.success(data) : msgs.success;
        showToast(msg, 'success');
        return data;
      } catch (err) {
        window.clearTimeout(loadingTimer);
        const e   = err instanceof Error ? err : new Error(String(err));
        const msg = typeof msgs.error === 'function' ? msgs.error(e) : msgs.error;
        showToast(msg, 'error', 6000);
        throw err;
      }
    },
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, promise }}>
      {children}

      {/* Toast Container */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
