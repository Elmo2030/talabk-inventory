/**
 * POST /api/billing/submit
 * Submit a payment request (cash or USDT).
 * Amount is computed server-side — clients cannot tamper with it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { TablesInsert } from '@/lib/supabase/database.types';

// ── Plan pricing (must match /billing/page.tsx PLANS) ─────────────────────────
const PLAN_PRICES: Record<string, number> = {
  starter:    29,
  pro:        59,
  enterprise: 99,
};

const BILLING_DISCOUNTS: Record<number, number> = {
  1:  0,
  3:  5,
  6:  10,
  12: 20,
};

function calcAmount(plan: string, months: number): number {
  const monthly  = PLAN_PRICES[plan];
  const discount = BILLING_DISCOUNTS[months] ?? 0;
  return parseFloat((monthly * months * (1 - discount / 100)).toFixed(2));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const plan           = String(body.plan ?? '');
    const billing_months = Number(body.billing_months ?? 0);
    const payment_method_raw = String(body.payment_method ?? '');
    const tx_hash        = typeof body.tx_hash === 'string' ? body.tx_hash : '';
    const proof_notes    = typeof body.proof_notes === 'string' ? body.proof_notes : '';

    // ── Validate plan ──────────────────────────────────────────────────────────
    if (!PLAN_PRICES[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // ── Validate billing period ────────────────────────────────────────────────
    if (!(billing_months in BILLING_DISCOUNTS)) {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
    }

    // ── Validate payment method ────────────────────────────────────────────────
    if (payment_method_raw !== 'cash' && payment_method_raw !== 'usdt') {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }
    const payment_method = payment_method_raw as 'cash' | 'usdt';

    // ── USDT: require tx_hash, validate format (64 hex chars) ─────────────────
    if (payment_method === 'usdt') {
      if (!tx_hash?.trim()) {
        return NextResponse.json({ error: 'TX hash is required for USDT payments' }, { status: 400 });
      }
      const clean = tx_hash.trim().replace(/^0x/, '');
      if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
        return NextResponse.json({ error: 'Invalid TX hash format (expected 64 hex characters)' }, { status: 400 });
      }
    }

    // ── Cash: require proof_notes ──────────────────────────────────────────────
    if (payment_method === 'cash' && !proof_notes?.trim()) {
      return NextResponse.json({ error: 'Notes are required for cash payments' }, { status: 400 });
    }

    // ── Resolve tenant_id from session ────────────────────────────────────────
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    const profile = profileData as { tenant_id: string | null } | null;

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found for user' }, { status: 400 });
    }

    const tenant_id: string = profile.tenant_id;

    // ── Prevent duplicate pending payments ────────────────────────────────────
    const { count } = await supabase
      .from('subscription_payments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('status', 'pending');

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'لديك طلب دفع قيد المراجعة بالفعل، يرجى الانتظار حتى تتم مراجعته' },
        { status: 409 }
      );
    }

    // ── Compute amount server-side ─────────────────────────────────────────────
    const amount = calcAmount(plan, Number(billing_months));

    // ── Insert payment record ──────────────────────────────────────────────────
    const insertPayload: TablesInsert<'subscription_payments'> = {
      tenant_id,
      plan,
      billing_months,
      amount,
      currency:       'USD',
      payment_method,
      status:         'pending',
      tx_hash:        payment_method === 'usdt' ? tx_hash.trim() : null,
      proof_notes:    proof_notes.trim() || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertErr } = await (supabase as any)
      .from('subscription_payments')
      .insert(insertPayload);

    if (insertErr) {
      console.error('[billing/submit] insert error:', insertErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, amount });
  } catch (err) {
    console.error('[billing/submit] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
