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

  // Scrub PII (emails, phone numbers, wallet addresses, JWTs) from
  // error payloads before they reach Sentry's servers.
  beforeSend(event) {
    const scrub = (s: string): string =>
      s
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
        .replace(/\+?\d[\d\s\-()]{7,}/g, '[phone]')
        .replace(/\b[T1][a-zA-HJ-NP-Z0-9]{33,34}\b/g, '[wallet]')          // TRC-20 / BTC-ish
        .replace(/\b0x[a-fA-F0-9]{40,64}\b/g, '[hex]')
        .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g, '[jwt]');

    const walk = (obj: unknown): unknown => {
      if (typeof obj === 'string') return scrub(obj);
      if (Array.isArray(obj)) return obj.map(walk);
      if (obj && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) out[k] = walk(v);
        return out;
      }
      return obj;
    };

    return walk(event) as typeof event;
  },
});
