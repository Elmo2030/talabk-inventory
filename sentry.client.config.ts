import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production — no noise in dev/staging
  enabled: process.env.NODE_ENV === 'production',

  // Capture 10 % of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Capture 100 % of sessions that have errors
  replaysOnErrorSampleRate: 1.0,
  // Capture 1 % of normal sessions
  replaysSessionSampleRate: 0.01,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,      // GDPR — hide user-entered text in replays
      blockAllMedia: true,
    }),
  ],
});
