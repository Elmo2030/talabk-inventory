import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',

  // Minimal tracing on edge (middleware runs on every request)
  tracesSampleRate: 0.02,
});
