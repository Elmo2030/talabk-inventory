/**
 * Supabase Auth Callback Route
 *
 * Handles ALL email-link flows Supabase can produce:
 *
 *   PKCE code flow  →  ?code=XXX&type=...
 *   OTP hash flow   →  ?token_hash=XXX&type=...
 *
 * Supported types:
 *   recovery  → /reset-password   (forgot password)
 *   invite    → /reset-password   (new user — must set initial password)
 *   signup    → role-based routing (email confirmation)
 *   magiclink → role-based routing
 *   (none)    → role-based routing
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/database.types';
import type { EmailOtpType } from '@supabase/supabase-js';

// ── Safe-redirect helper ─────────────────────────────────────────────────────
// Prevents open-redirect via `?next=https://evil.example.com`. We only
// allow same-origin paths that start with `/` and reject protocol-relative
// (`//host`) or absolute URLs. Falls back to `/` when the input is unsafe.
function safeRedirectPath(next: string | null | undefined): string {
  if (!next) return '/';
  // Reject protocol-relative and absolute URLs outright.
  if (next.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(next)) return '/';
  // Must start with a single slash.
  if (!next.startsWith('/')) return '/';
  // Reject backslashes (some browsers normalize \ to / in URLs).
  if (next.includes('\\')) return '/';
  return next;
}

// ── Supabase SSR client ───────────────────────────────────────────────────────
function buildSupabase() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// ── Role-based redirect after session is established ─────────────────────────
async function roleRedirect(
  supabase: ReturnType<typeof buildSupabase>,
  origin: string,
  fallback: string,
): Promise<NextResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', session.user.id)
      .single();

    // Supabase SSR client types don't narrow column-select results in route handlers;
    // use a targeted cast (not `as unknown as`) since we own the schema.
    const profile = profileData as { role: string; tenant_id: string | null } | null;

    if (profile?.role === 'super_admin') {
      return NextResponse.redirect(`${origin}/superadmin`);
    }
    if (profile?.tenant_id) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', profile.tenant_id)
        .single();
      const tenant = tenantData as { slug: string } | null;
      if (tenant?.slug) {
        return NextResponse.redirect(`${origin}/app/${tenant.slug}/dashboard`);
      }
    }
  }
  return NextResponse.redirect(`${origin}${fallback}`);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code       = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type       = searchParams.get('type') as EmailOtpType | null;
  // Validate `next` to prevent open-redirect attacks. Any off-origin or
  // protocol-bearing value is silently coerced to '/'.
  const next       = safeRedirectPath(searchParams.get('next'));

  const supabase = buildSupabase();

  // ── 1. token_hash flow (Supabase OTP / invite emails) ────────────────────
  //    Supabase sends:  /auth/callback?token_hash=XXX&type=invite
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      // Recovery or invite → user must set / update their password
      if (type === 'recovery' || type === 'invite') {
        return NextResponse.redirect(`${origin}/reset-password?type=${type}`);
      }
      return roleRedirect(supabase, origin, next);
    }
  }

  // ── 2. PKCE code flow (most desktop/web clients) ──────────────────────────
  //    Supabase sends:  /auth/callback?code=XXX&type=recovery
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === 'recovery' || type === 'invite') {
        return NextResponse.redirect(`${origin}/reset-password?type=${type}`);
      }
      return roleRedirect(supabase, origin, next);
    }
  }

  // ── Fallback: something went wrong ────────────────────────────────────────
  // Route to /login with an explicit error code the page can surface.
  const params = new URLSearchParams({ error: 'auth_callback_failed' });
  if (type) params.set('type', type);
  return NextResponse.redirect(`${origin}/login?${params.toString()}`);
}
