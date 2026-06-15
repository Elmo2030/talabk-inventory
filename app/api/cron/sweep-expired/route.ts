/**
 * GET /api/cron/sweep-expired
 * Vercel Cron job → flips active tenants whose subscription_ends_at
 * has passed to status='suspended'. Runs once a day at 03:00 UTC
 * (see vercel.json). Protected by CRON_SECRET so only Vercel's
 * scheduler can invoke it.
 *
 * Hardening (Wave C, per SRE audit):
 *   • Constant-time CRON_SECRET compare (no early-exit timing leak)
 *   • Per-tenant audit_log entries (not just an aggregate count)
 *   • Sentry capture on every error path
 *   • Returns non-200 on audit-log failure so Vercel surfaces it
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { timingSafeEqual } from 'node:crypto';
import type { Database } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Constant-time string compare. Length mismatch ⇒ pads the shorter
// buffer with zeros so timingSafeEqual still runs on equal-length inputs,
// then forces a `false` return — preserves the constant-time property
// across any pair of inputs.
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Still do a compare so attackers can't time-side-channel length.
    const padded = Buffer.alloc(aBuf.length);
    bBuf.copy(padded, 0, 0, Math.min(aBuf.length, bBuf.length));
    timingSafeEqual(aBuf, padded);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export async function GET(req: NextRequest) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  const auth = req.headers.get('authorization') ?? '';
  if (!process.env.CRON_SECRET || !safeEqual(auth, expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Service-role client bypasses RLS — needed because the sweep RPC
  // checks for super_admin role via get_current_user_role(), which is
  // null for unauthenticated cron calls. We instead run the UPDATE
  // directly with service-role privileges.
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const sweptAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('tenants')
    .update({ status: 'suspended' })
    .eq('status', 'active')
    .lt('subscription_ends_at', sweptAt)
    .select('id, slug, owner_email, subscription_plan');

  if (error) {
    Sentry.captureException(error, { tags: { route: 'cron/sweep-expired', stage: 'update' } });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sweptRows = data ?? [];
  const count = sweptRows.length;

  if (count > 0) {
    // One audit_log row per tenant — gives an investigative trail when
    // a customer asks "why was my account suspended?". audit_log is a
    // recent table not yet covered by the generated types; cast through
    // any to keep the insert payload typed for us.
    const rows = sweptRows.map((t) => ({
      actor_id: null,
      actor_role: 'system',
      action: 'cron.sweep_expired',
      target_type: 'tenants',
      target_id: (t as { id: string }).id,
      payload: {
        slug: (t as { slug: string }).slug,
        owner_email: (t as { owner_email: string }).owner_email,
        subscription_plan: (t as { subscription_plan: string }).subscription_plan,
        swept_at: sweptAt,
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: auditErr } = await (supabase as any).from('audit_log').insert(rows);
    if (auditErr) {
      // Sweep succeeded but we lost the audit trail — surface to Sentry
      // and return 207 so Vercel keeps a record but doesn't retry the
      // sweep (which would re-run on already-suspended tenants — no-op
      // but wasted DB work).
      Sentry.captureException(auditErr, {
        tags: { route: 'cron/sweep-expired', stage: 'audit_insert' },
        extra: { swept_count: count, swept_at: sweptAt },
      });
      return NextResponse.json(
        { swept: count, at: sweptAt, audit_warning: auditErr.message },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ swept: count, at: sweptAt });
}
