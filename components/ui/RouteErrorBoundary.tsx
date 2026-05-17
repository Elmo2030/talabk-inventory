'use client';

/**
 * Reusable route-scoped error boundary body — DRY shell for the per-route
 * error.tsx files. Each error.tsx is intentionally minimal (it just delegates
 * here) so we don't ship the same JSX three times.
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function RouteErrorBoundary({
  error,
  reset,
  route,
  title,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Used as a Sentry tag so per-route incidents are easy to filter. */
  route: string;
  /** Localized heading shown to the user. */
  title: string;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { route } });
  }, [error, route]);

  return (
    <div dir="rtl" className="flex items-center justify-center min-h-[50vh] p-6">
      <div className="max-w-md w-full bg-white dark:bg-[#18181B] border border-red-200 dark:border-red-900/40 rounded-2xl p-6 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
          السايدبار وبقية أقسام التطبيق تعمل بشكل طبيعي، يمكنك التنقل لصفحة
          أخرى أو إعادة المحاولة.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E5302A] hover:bg-[#C42B24] text-white font-semibold text-sm rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
