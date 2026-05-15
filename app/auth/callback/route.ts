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
