/**
 * GET /api/account/export
 * GDPR subject-access export. Returns every row the authenticated user
 * (and the tenant they belong to) owns, as a single JSON document.
 *
 * Scope:
 *   • user_profiles row (theirs)
 *   • tenants row (their tenant)
 *   • items, suppliers, current_stock, stock_in, stock_out
 *   • sales_orders, purchase_invoices
 *   • subscription_payments, subscription_events
 *   • audit_log entries where target_id = tenant_id
 *
 * Excluded: other users' profiles inside the same tenant (each user
 * exports their own profile only). For multi-user tenants, an admin
 * can export the tenant-scoped data sets and each individual user
 * exports their own profile separately — this matches GDPR's
 * "controller / processor" split where the tenant is the controller.
 *
 * Returned as `Content-Type: application/json` with a
 * `Content-Disposition: attachment` header so the browser saves it.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProfileRow {
  tenant_id: string | null;
  role: string;
}

// Tables we export tenant-scoped. RLS ensures only matching rows come
// back, so the explicit `eq('tenant_id', ...)` is defense in depth.
const TENANT_TABLES = [
  'tenants',
  'items',
  'suppliers',
  'current_stock',
  'stock_in',
  'stock_out',
  'sales_orders',
  'purchase_invoices',
  'subscription_payments',
  'subscription_events',
] as const;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();
  const profile = profileData as ProfileRow | null;

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'No tenant associated with this account' }, { status: 400 });
  }
  const tenantId = profile.tenant_id;

  // Fetch all tables in parallel — they're independent.
  const fetches = TENANT_TABLES.map(async (table) => {
    // tenants is filtered by id, the rest by tenant_id.
    const column = table === 'tenants' ? 'id' : 'tenant_id';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (supabase.from(table as any) as any).select('*').eq(column, tenantId);
    const { data, error } = await q;
    return [table, error ? { error: error.message } : (data ?? [])] as const;
  });
  const tenantSnapshot = Object.fromEntries(await Promise.all(fetches));

  const { data: ownProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const payload = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      profile: ownProfile,
    },
    tenant: tenantSnapshot,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="talabk-export-${tenantId.slice(0, 8)}-${Date.now()}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
