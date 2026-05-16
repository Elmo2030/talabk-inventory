'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Root-level error boundary required by Sentry to capture React
 * render errors that escape `error.tsx` (root-segment crashes,
 * layout errors, etc.). Without this file Sentry silently misses
 * a whole class of production errors.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0C10',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 480 }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>
            حدث خطأ غير متوقع
          </h1>
          <p style={{ color: '#aaa', marginBottom: 24, lineHeight: 1.7 }}>
            تم تسجيل الخطأ تلقائياً وفريق الدعم سيتابعه. يمكنك إعادة المحاولة الآن.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: '#E5302A',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            العودة للصفحة الرئيسية
          </a>
        </div>
      </body>
    </html>
  );
}
