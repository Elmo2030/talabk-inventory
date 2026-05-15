/**
 * Supabase Auth Callback Route
 * Handles email confirmation, password reset, and magic link flows.
 *
 * Supabase redirects to this URL after the user clicks an email link.
 * We exchange the ?code= param for a session, then redirect to the
 * appropriate page.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const type  = searchParams.get('type'); // 'recovery' | 'signup' | 'magiclink'
  const next  = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password reset → go to /reset-password so user can enter new password
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Email confirmation or magic link → route based on role
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, tenant_id')
          .eq('id', session.user.id)
          .single();

        const p = profile as unknown as { role: string; tenant_id: string | null } | null;

        if (p?.role === 'super_admin') {
          return NextResponse.redirect(`${origin}/superadmin`);
        }
        if (p?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', p.tenant_id)
            .single();
          const t = tenant as unknown as { slug: string } | null;
          if (t?.slug) {
            return NextResponse.redirect(`${origin}/app/${t.slug}/dashboard`);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Error — redirect to login with error message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
