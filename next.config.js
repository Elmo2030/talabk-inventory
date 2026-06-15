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
  // Content-Security-Policy is set per-request by middleware.ts using a
  // nonce so we can drop 'unsafe-inline' / 'unsafe-eval' from script-src.
  // Setting it as a static header here would conflict with the dynamic one.
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
