/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop browsers from sniffing MIME types
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy — send origin only, no path leakage
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features we don't need
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // HSTS — force HTTPS for 1 year (enable once you're sure TLS is stable)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy
  // nonce-based approach would be ideal for prod; this is a solid baseline.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Supabase API + realtime websocket
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://o*.ingest.sentry.io",
      // Scripts: self + Next.js inline chunks
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Styles: self + Tailwind inline styles
      "style-src 'self' 'unsafe-inline'",
      // Images: self + data URIs (for print receipts)
      "img-src 'self' data: blob:",
      // Fonts
      "font-src 'self'",
      // Disallow framing entirely
      "frame-ancestors 'none'",
      // Disallow form submissions to external sites
      "form-action 'self'",
      // Block mixed content
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Reduce bundle size — exclude heavy server-only packages from client
  serverExternalPackages: [],

  // Image domains for future use (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

// Wrap with Sentry — uploads source maps on build, instruments server/edge
module.exports = withSentryConfig(nextConfig, {
  // Sentry organisation + project (set via env or hardcode after creating a project)
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source-map upload (CI secret — never commit)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silence Sentry's own build output unless something goes wrong
  silent: true,

  // Upload source maps so stack traces show original TypeScript code
  widenClientFileUpload: true,

  // Tree-shake Sentry debug code in production
  disableLogger: true,

  // Automatically instrument Next.js server routes
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,

  // Tunnel Sentry requests through our own domain to avoid adblockers
  tunnelRoute: '/monitoring',
});
