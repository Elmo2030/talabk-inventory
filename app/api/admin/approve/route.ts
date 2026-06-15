import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/supabase/database.types';

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return NextResponse.json(
      { error: 'Server is not configured (missing environment variables).' },
      { status: 503 }
    );
  }

  // ── Auth guard: caller must be an authenticated super_admin ──────────────────
  // Build a request-scoped SSR client (reads cookies from the incoming request)
  // to validate the session without trusting the request body.
  const authClient = createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      // Read-only in API routes — we don't set cookies here
      setAll(_cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {},
    },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: callerProfileData } = await authClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const callerProfile = callerProfileData as { role: string } | null;

  if (callerProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // Service-role admin client — only used after auth is confirmed above
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { requestId, storeName, ownerName, email, plan } = await req.json();

    if (!requestId || !storeName || !email || !plan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── Idempotency guard ──────────────────────────────────────────────
    // Trust ONLY the server-side row, not the client-supplied body. This
    // prevents a double-click (or a replay attack) from creating two
    // tenants for the same registration. We atomically flip the row from
    // 'pending' → 'processing' so a concurrent second call sees nothing
    // to claim and returns 409.
    const { data: claimedRows, error: claimErr } = await supabaseAdmin
      .from('registration_requests')
      .update({ status: 'processing', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id, email, store_name, plan, status');

    if (claimErr) {
      return NextResponse.json({ error: 'Failed to claim request: ' + claimErr.message }, { status: 500 });
    }
    if (!claimedRows || claimedRows.length === 0) {
      // Already processed (or never existed). Look up the current state
      // so the UI can show "approved" vs "not found" instead of looping.
      const { data: existingRow } = await supabaseAdmin
        .from('registration_requests')
        .select('status')
        .eq('id', requestId)
        .maybeSingle();
      const currentStatus = (existingRow as { status?: string } | null)?.status ?? 'unknown';
      return NextResponse.json(
        { error: 'Request already processed', status: currentStatus },
        { status: 409 }
      );
    }

    // Cross-check: server-side email must match the body to guard against
    // a stale request body referencing a different registration's id.
    const claimed = claimedRows[0] as { id: string; email: string };
    if (claimed.email !== email) {
      // Roll back the status flip so a real admin can re-issue with the
      // correct payload.
      await supabaseAdmin
        .from('registration_requests')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', requestId);
      return NextResponse.json({ error: 'Request body does not match server record' }, { status: 400 });
    }
    // ───────────────────────────────────────────────────────────────────

    // 1. Create slug from store name
    const slug = storeName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50) || `store-${Date.now()}`;

    // 2. Check slug uniqueness — append random suffix if taken
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    const finalSlug = existing ? `${slug}-${Math.random().toString(36).slice(2, 6)}` : slug;

    // 3. Create tenant
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .insert({
        slug: finalSlug,
        store_name: storeName,
        owner_name: ownerName,
        email,
        subscription_plan: plan,
        status: 'active',
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (tenantErr) {
      // Revert the claim so the admin can retry.
      await supabaseAdmin
        .from('registration_requests')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', requestId);
      return NextResponse.json(
        { error: 'Failed to create tenant: ' + tenantErr.message },
        { status: 500 }
      );
    }

    // 4. Invite user via Supabase Admin API (sends email automatically)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    const redirectTo = `${siteUrl}/auth/callback?type=invite`;

    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          tenant_id: tenant.id,
          tenant_slug: finalSlug,
          user_role: 'tenant_admin',
          full_name: ownerName,
        },
      }
    );

    if (inviteErr) {
      // Rollback tenant creation AND revert the claim so retries work.
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      await supabaseAdmin
        .from('registration_requests')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', requestId);
      return NextResponse.json(
        { error: 'Failed to invite user: ' + inviteErr.message },
        { status: 500 }
      );
    }

    // 5. Create user_profiles row
    if (inviteData?.user?.id) {
      await supabaseAdmin.from('user_profiles').insert({
        id: inviteData.user.id,
        tenant_id: tenant.id,
        role: 'tenant_admin',
        is_active: true,
      });
    }

    // 6. Mark request as approved — log reviewer ID for audit trail.
    // We claimed the row earlier (pending → processing); now finalize.
    await supabaseAdmin
      .from('registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', requestId);

    // 7. Log subscription event
    await supabaseAdmin.from('subscription_events').insert({
      tenant_id: tenant.id,
      event_type: 'trial_started',
      plan_from: null,
      plan_to: plan,
      notes: 'Account approved by super admin',
      created_by: user.id,
    });

    return NextResponse.json({ success: true, tenantSlug: finalSlug });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
