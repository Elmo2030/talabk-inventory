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
import type { EmailOtpType } from '@supabase/supabase-js';

// ── Supabase SSR client ───────────────────────────────────────────────────────
function buildSupabase() {
  const cookieStore = cookies();
  return createServerClient(
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  origin: string,
  fallback: string,
): Promise<NextResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', session.user.id)
      .single();

    const p = profile as { role: string; tenant_id: string | null } | null;

    if (p?.role === 'super_admin') {
      return NextResponse.redirect(`${origin}/superadmin`);
    }
    if (p?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', p.tenant_id)
        .single();
      const t = tenant as { slug: string } | null;
      if (t?.slug) {
        return NextResponse.redirect(`${origin}/app/${t.slug}/dashboard`);
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
  const next       = searchParams.get('next') ?? '/';

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
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
