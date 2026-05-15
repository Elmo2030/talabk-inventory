/**
 * Next.js Edge Middleware — Multi-Tenant Routing & Auth Guard
 * طلبك — للمتاجر الإلكترونية
 *
 * Strategy A — Subdomain routing:
 *   store1.talabk.app  →  rewrite to /app/store1/...
 *
 * Strategy B — Path routing (fallback / dev):
 *   talabk.app/app/store1/dashboard  →  protected, no rewrite
 *
 * Auth guards:
 *   /superadmin/*        →  must be super_admin (redirect to /superadmin/login)
 *   /app/[slug]/*        →  must be authenticated & tenant matches slug
 *   /login, /register    →  redirect to dashboard if already logged in
 *
 * JWT claims strategy:
 *   Custom claims (user_role, tenant_id, tenant_slug) are injected by the
 *   custom_access_token_hook into app_metadata. Server layouts also verify
 *   via direct DB lookup as defence-in-depth.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROOT_DOMAIN   = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
const PUBLIC_PATHS  = ['/', '/pricing', '/about', '/contact'];
const AUTH_PATHS    = ['/login', '/register', '/setup', '/superadmin/login', '/auth/callback', '/reset-password'];
const SUPERADMIN_PREFIX = '/superadmin';
const TENANT_APP_PREFIX = '/app';

// ── Supabase SSR client (middleware-compatible) ───────────────────────────────
function buildSupabaseClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    },
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function redirectTo(req: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return NextResponse.redirect(url);
}

// ── Main middleware ───────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const res      = NextResponse.next();
  const supabase = buildSupabaseClient(req, res);

  const pathname = req.nextUrl.pathname;
  const hostname = req.headers.get('host') ?? '';

  // ── 1. Verify session via Supabase Auth server (validates JWT signature) ──────
  // getUser() makes a lightweight request to Supabase to validate the JWT.
  // This is the secure approach — getSession() only reads from the cookie
  // without re-verifying the signature, which a tampered cookie could bypass.
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Custom claims injected by our Postgres custom_access_token_hook.
  // The hook writes into app_metadata (server-only, not user-editable).
  // user_metadata is user-editable and must NEVER be trusted for authz.
  const appMeta     = (user?.app_metadata ?? {}) as Record<string, string>;
  const userRole    = appMeta['user_role']   as string | undefined;
  const jwtTenantId = appMeta['tenant_id']   as string | undefined;
  const tenantSlug  = appMeta['tenant_slug'] as string | undefined;

  // ── 2. Subdomain extraction ───────────────────────────────────────────────
  //   store1.talabk.app → subSlug = 'store1'
  //   talabk.app        → subSlug = null  (landing / admin)
  let subSlug: string | null = null;
  if (hostname !== ROOT_DOMAIN && hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    subSlug = hostname.replace(`.${ROOT_DOMAIN}`, '');
    // Ignore reserved subdomains
    if (['www', 'api', 'admin', 'superadmin', 'app'].includes(subSlug)) {
      subSlug = null;
    }
  }

  // ── 3. Subdomain rewrite: store1.talabk.app/... → /app/store1/... ─────────
  if (subSlug) {
    // Auth pages are served at root for subdomains too
    if (AUTH_PATHS.some(p => pathname.startsWith(p))) {
      return res;
    }

    if (!isAuthenticated) {
      return redirectTo(req, '/login', { redirect: `https://${hostname}${pathname}` });
    }

    const targetPath = `${TENANT_APP_PREFIX}/${subSlug}${pathname === '/' ? '/dashboard' : pathname}`;
    const url = req.nextUrl.clone();
    url.pathname = targetPath;

    const rewritten = NextResponse.rewrite(url);
    // Forward tenant slug for layout components
    rewritten.headers.set('x-tenant-slug', subSlug);
    return rewritten;
  }

  // ── 4. Super Admin routes ─────────────────────────────────────────────────
  if (pathname.startsWith(SUPERADMIN_PREFIX)) {
    // /superadmin/login is always public
    if (pathname === '/superadmin/login') return res;

    if (!isAuthenticated) {
      return redirectTo(req, '/superadmin/login', { redirect: pathname });
    }
    if (userRole !== 'super_admin') {
      return redirectTo(req, '/403');
    }
    return res;
  }

  // ── 5. Tenant app routes (/app/[slug]/...) ────────────────────────────────
  const tenantMatch = pathname.match(/^\/app\/([^/]+)(\/.*)?$/);
  if (tenantMatch) {
    const routeSlug = tenantMatch[1];

    if (!isAuthenticated) {
      return redirectTo(req, '/login', { redirect: pathname });
    }

    // Verify the authenticated user belongs to this tenant.
    // super_admin may browse any tenant path.
    // If tenantSlug is missing from JWT (new user without tenant), deny access.
    if (userRole !== 'super_admin') {
      if (!tenantSlug) {
        // No tenant assigned yet — send to landing page
        return redirectTo(req, '/');
      }
      if (tenantSlug !== routeSlug) {
        // Wrong tenant — redirect to the user's own dashboard
        return redirectTo(req, `/app/${tenantSlug}/dashboard`);
      }
    }

    const response = NextResponse.next();
    // Forward useful headers to Server Components
    response.headers.set('x-tenant-slug', routeSlug);
    if (jwtTenantId) response.headers.set('x-tenant-id', jwtTenantId);
    if (userRole)    response.headers.set('x-user-role', userRole);
    return response;
  }

  // ── 6. Auth pages: redirect away if already logged in ────────────────────
  // Exception: /reset-password is kept accessible even when authenticated.
  // After exchangeCodeForSession (recovery/invite flow) the user has a valid
  // session but still needs to reach the password-reset form.
  if (isAuthenticated && AUTH_PATHS.some(p => pathname === p) && pathname !== '/reset-password') {
    if (userRole === 'super_admin') {
      return redirectTo(req, SUPERADMIN_PREFIX);
    }
    if (tenantSlug) {
      return redirectTo(req, `/app/${tenantSlug}/dashboard`);
    }
    return redirectTo(req, '/');
  }

  // ── 7. Protected pages (not public, not auth, not tenant app) ────────────
  const isPublic = PUBLIC_PATHS.includes(pathname) ||
    AUTH_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api');

  if (!isPublic && !isAuthenticated) {
    return redirectTo(req, '/login', { redirect: pathname });
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - api/webhooks  (Stripe / external webhooks — handled directly)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
