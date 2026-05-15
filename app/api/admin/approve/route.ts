import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Lazy init — runs at request time, not module load, so missing env vars
  // don't crash the build when the route is first imported.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Server is not configured (missing service role key).' },
      { status: 503 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { requestId, storeName, ownerName, email, plan } = await req.json();

    // Validate inputs
    if (!requestId || !storeName || !email || !plan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Failed to create tenant: ' + tenantErr.message }, { status: 500 });
    }

    // 4. Invite user via Supabase Admin API (sends email automatically)
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://inventory-app-nine-lilac.vercel.app'}/auth/callback?type=invite`;

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
      // Rollback tenant creation
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      return NextResponse.json({ error: 'Failed to invite user: ' + inviteErr.message }, { status: 500 });
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

    // 6. Mark request as approved
    await supabaseAdmin
      .from('registration_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    // 7. Log subscription event
    await supabaseAdmin.from('subscription_events').insert({
      tenant_id: tenant.id,
      event_type: 'trial_started',
      plan_from: null,
      plan_to: plan,
      notes: 'Account approved by super admin',
    });

    return NextResponse.json({ success: true, tenantSlug: finalSlug });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
