/**
 * POST /api/account/delete
 * GDPR right-to-erasure request. Soft-deletes the user's account
 * (and, if they're the tenant owner, schedules tenant purge).
 *
 * Behavior:
 *   • Non-owner user → user_profiles.is_active = false, auth user deleted
 *   • Tenant owner   → tenant marked status='cancelled', subscription_ends_at = now()
 *                       The cron sweep at 03:00 UTC will suspend it; full
 *                       hard-delete is a manual operation reviewed by
 *                       super_admin from the dashboard so we don't lose
 *                       legally-required retention windows (invoices
 *                       have a 5-year retention requirement in Libya).
 *
 * Body: `{ confirm: "DELETE" }` — typed-confirmation pattern so a CSRF
 *       attacker can't trigger erasure with an empty body.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Typed confirmation guards against accidental / CSRF triggers.
  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* empty body → no confirm */ }
  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'Confirmation required. POST { "confirm": "DELETE" }.' },
      { status: 400 }
    );
  }

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();
  const profile = profileData as { tenant_id: string | null; role: string } | null;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server is not configured for deletion' }, { status: 503 });
  }

  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  try {
    const isOwner = profile?.role === 'tenant_admin' && !!profile.tenant_id;
    const nowIso = new Date().toISOString();

    if (isOwner && profile?.tenant_id) {
      // Tenant owner: mark tenant cancelled. Cron will suspend at next pass.
      await admin
        .from('tenants')
        .update({ status: 'cancelled', subscription_ends_at: nowIso })
        .eq('id', profile.tenant_id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('audit_log').insert({
        actor_id: user.id,
        actor_role: profile.role,
        action: 'gdpr.tenant_cancellation_requested',
        target_type: 'tenants',
        target_id: profile.tenant_id,
        payload: { requested_at: nowIso, scheduled_purge_review: true },
      });
    }

    // Always: deactivate the user_profile so this person can't log back in.
    await admin
      .from('user_profiles')
      .update({ is_active: false })
      .eq('id', user.id);

    // Delete the auth user. This invalidates all sessions immediately.
    // (For tenant owners we keep the tenant row + invoices for the
    // legally-required retention window; only the auth identity goes.)
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      Sentry.captureException(deleteErr, { tags: { route: 'account/delete', stage: 'auth_delete' } });
      return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      tenant_scheduled_for_purge: isOwner,
      note: isOwner
        ? 'سيتم مراجعة طلب حذف بيانات المتجر خلال 30 يوماً وفقاً لمتطلبات الاحتفاظ بالسجلات.'
        : 'تم حذف حسابك. سجلات النشاط محتفظ بها لدى صاحب المتجر.',
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'account/delete', stage: 'unexpected' } });
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
