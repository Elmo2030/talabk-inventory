'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import Button from './Button';

// ============================================
// Confirm Dialog — بديل احترافي لـ confirm()
// ============================================

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

type ConfirmResolver = (confirmed: boolean) => void;

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

interface DialogState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: ConfirmResolver | null;
}

const initialState: DialogState = {
  isOpen: false,
  options: { title: '', description: '' },
  resolve: null,
};

const variantConfig = {
  danger: {
    icon: <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />,
    iconBg: 'bg-red-100 dark:bg-red-500/15',
    confirmVariant: 'danger' as const,
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
    confirmVariant: 'primary' as const,
  },
  info: {
    icon: <Info className="w-6 h-6 text-slate-500 dark:text-slate-300" />,
    iconBg: 'bg-slate-100 dark:bg-slate-700/40',
    confirmVariant: 'primary' as const,
  },
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(initialState);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, options, resolve });
    });
  }, []);

  const handleResponse = (confirmed: boolean) => {
    state.resolve?.(confirmed);
    setState(initialState);
  };

  const { options } = state;
  const variant = options.variant ?? 'danger';
  const config = variantConfig[variant];

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}

      {state.isOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => handleResponse(false)}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div
            className="relative bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4 border border-transparent dark:border-[#27272A]"
            dir="rtl"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-[#F4F4F5]">{options.title}</h2>
                <p className="text-sm text-slate-600 dark:text-[#A1A1AA] mt-1 leading-5">{options.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleResponse(false)}
              >
                {options.cancelLabel ?? 'إلغاء'}
              </Button>
              <Button
                variant={config.confirmVariant}
                className="flex-1"
                onClick={() => handleResponse(true)}
              >
                {options.confirmLabel ?? 'تأكيد'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm(): ConfirmDialogContextType {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider');
  return ctx;
}
