/**
 * POST /api/register
 * Public-facing tenant registration endpoint.
 *
 * Behavior matrix (Wave B — auto-provision):
 *   • `trial` plan          → tenant created instantly, invite email sent.
 *                              The merchant clicks the link, sets a password,
 *                              and lands in the dashboard. No human wait.
 *   • paid plan (starter/   → registration_request inserted, status=pending.
 *      pro/enterprise)        Super-admin reviews after payment is verified.
 *
 * Rate limited at 5/hour/IP via in-memory limiter. RLS on
 * `registration_requests` still applies as defense in depth (we use the
 * anon client for the request-row insert).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { SubscriptionPlan } from '@/lib/types';
import { registerLimiter, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const PLANS = new Set<SubscriptionPlan>(['trial', 'starter', 'pro', 'enterprise']);

interface RegisterPayload {
  store_name?: unknown;
  owner_name?: unknown;
  email?: unknown;
  phone?: unknown;
  requested_plan?: unknown;
}

function buildSlug(storeName: string): string {
  const base = storeName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
  return base || `store-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  // ── Rate limit ───────────────────────────────────────────────────────────
  const ip = getClientIp(req.headers);
  const limit = registerLimiter.check(`register:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'تم تجاوز الحد المسموح. حاول بعد قليل.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  // ── Parse + validate ─────────────────────────────────────────────────────
  let body: RegisterPayload;
  try {
    body = (await req.json()) as RegisterPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const store_name = typeof body.store_name === 'string' ? body.store_name.trim() : '';
  const owner_name = typeof body.owner_name === 'string' ? body.owner_name.trim() : '';
  const email      = typeof body.email      === 'string' ? body.email.trim().toLowerCase() : '';
  const phoneRaw   = typeof body.phone      === 'string' ? body.phone.trim() : '';
  const requested_plan = typeof body.requested_plan === 'string' ? body.requested_plan : '';

  if (store_name.length < 2 || store_name.length > 100) {
    return NextResponse.json({ error: 'اسم المتجر غير صالح' }, { status: 400 });
  }
  if (owner_name.length < 2 || owner_name.length > 100) {
    return NextResponse.json({ error: 'اسم المالك غير صالح' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'بريد إلكتروني غير صالح' }, { status: 400 });
  }
  if (phoneRaw) {
    const cleaned = phoneRaw.replace(/\s|-/g, '');
    if (!/^(\+218|00218|0)?9[1-5]\d{7}$/.test(cleaned)) {
      return NextResponse.json({ error: 'رقم هاتف ليبي غير صالح' }, { status: 400 });
    }
  }
  if (!PLANS.has(requested_plan as SubscriptionPlan)) {
    return NextResponse.json({ error: 'خطة غير صالحة' }, { status: 400 });
  }
  const plan = requested_plan as SubscriptionPlan;

  // ── Env check ────────────────────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server is not configured' }, { status: 503 });
  }

  // ── Paid plans: keep approval wall (payment verification required) ───────
  if (plan !== 'trial') {
    const supabase = createClient<Database>(url, anonKey, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.from('registration_requests').insert({
      store_name,
      owner_name,
      email,
      phone: phoneRaw || null,
      requested_plan: plan,
    });
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'هذا البريد الإلكتروني مسجل مسبقاً.', code: 'duplicate' },
          { status: 409 }
        );
      }
      console.error('[api/register] insert error:', error);
      return NextResponse.json({ error: 'حدث خطأ أثناء الإرسال.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, mode: 'pending_review' });
  }

  // ── Trial: auto-provision tenant + invite user ───────────────────────────
  if (!serviceKey) {
    // No service role available → fall back to request queue.
    const fallback = createClient<Database>(url, anonKey, {
      auth: { persistSession: false },
    });
    await fallback.from('registration_requests').insert({
      store_name, owner_name, email, phone: phoneRaw || null, requested_plan: plan,
    });
    return NextResponse.json({ ok: true, mode: 'pending_review' });
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Pick a unique slug. Loop with a short random suffix on collision —
  // 4 attempts is enough for any realistic store-name collision rate.
  const baseSlug = buildSlug(store_name);
  let finalSlug = baseSlug;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: hit } = await admin
      .from('tenants')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();
    if (!hit) break;
    finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // 14-day trial window — matches the /register form's "تجريبي 14 يوم" copy.
  const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: tenantRow, error: tenantErr } = await admin
    .from('tenants')
    .insert({
      slug: finalSlug,
      store_name,
      owner_email: email,
      owner_phone: phoneRaw || null,
      subscription_plan: 'trial',
      status: 'active',
      subscription_ends_at: trialEnds,
    })
    .select('id')
    .single();

  if (tenantErr || !tenantRow) {
    console.error('[api/register] tenant create failed:', tenantErr);
    return NextResponse.json(
      { error: 'تعذر إنشاء المتجر. حاول مجدداً أو تواصل مع الدعم.' },
      { status: 500 }
    );
  }

  const tenant = tenantRow as { id: string };

  // Invite via Supabase Admin API — sends the activation email automatically.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${siteUrl}/auth/callback?type=invite`,
      data: {
        tenant_id: tenant.id,
        tenant_slug: finalSlug,
        user_role: 'tenant_admin',
        full_name: owner_name,
      },
    }
  );

  if (inviteErr) {
    // Roll back the tenant so the email can be re-tried later without conflict.
    await admin.from('tenants').delete().eq('id', tenant.id);
    if (inviteErr.message?.toLowerCase().includes('already')) {
      return NextResponse.json(
        { error: 'هذا البريد الإلكتروني مسجل مسبقاً.', code: 'duplicate' },
        { status: 409 }
      );
    }
    console.error('[api/register] invite failed:', inviteErr);
    return NextResponse.json(
      { error: 'تعذر إرسال رسالة التفعيل. حاول مجدداً.' },
      { status: 500 }
    );
  }

  // Create user_profiles row so RLS works on first login.
  if (inviteData?.user?.id) {
    await admin.from('user_profiles').insert({
      id: inviteData.user.id,
      tenant_id: tenant.id,
      role: 'tenant_admin',
      is_active: true,
    });
  }

  // Audit trail: log the auto-provision in subscription_events.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('subscription_events') as any).insert({
    tenant_id: tenant.id,
    event_type: 'trial_started',
    plan_from: null,
    plan_to: 'trial',
    notes: 'Auto-provisioned via /api/register',
    created_by: null,
  });

  return NextResponse.json({
    ok: true,
    mode: 'auto_provisioned',
    tenant_slug: finalSlug,
  });
}
