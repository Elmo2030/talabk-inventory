/**
 * GET /api/cron/sweep-expired
 * Vercel Cron job → flips active tenants whose subscription_ends_at
 * has passed to status='suspended'. Runs once a day at 03:00 UTC
 * (see vercel.json). Protected by CRON_SECRET so only Vercel's
 * scheduler can invoke it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Vercel attaches `Authorization: Bearer <CRON_SECRET>` to scheduled invocations.
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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

  const { data, error } = await supabase
    .from('tenants')
    .update({ status: 'suspended' })
    .eq('status', 'active')
    .lt('subscription_ends_at', new Date().toISOString())
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = data?.length ?? 0;

  if (count > 0) {
    // audit_log is a new table not yet in the generated types; cast through any.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      actor_id: null,
      actor_role: 'system',
      action: 'cron.sweep_expired',
      target_type: 'tenants',
      payload: { count, swept_at: new Date().toISOString() },
    });
  }

  return NextResponse.json({ swept: count, at: new Date().toISOString() });
}
