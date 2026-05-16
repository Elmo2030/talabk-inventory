import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// Moyasar Webhook Handler
// POST /api/webhooks/moyasar
// ============================================================

interface MoyasarWebhookPayload {
  id: string;
  status: 'initiated' | 'paid' | 'failed' | 'authorized' | 'captured' | 'refunded';
  amount: number;       // in halalas (×100)
  currency: string;
  description: string;
  metadata: {
    tenant_id?: string;
    plan?: string;
    billing_months?: string;
  };
}

export async function POST(req: NextRequest) {
  // 1. Verify webhook secret (Moyasar sends Basic auth with secret key)
  const authHeader = req.headers.get('authorization') ?? '';
  const expectedSecret = process.env.MOYASAR_WEBHOOK_SECRET ?? '';

  if (
    expectedSecret &&
    authHeader !== `Basic ${Buffer.from(expectedSecret + ':').toString('base64')}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: MoyasarWebhookPayload;
  try {
    payload = (await req.json()) as MoyasarWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate required metadata
  if (!payload.metadata?.tenant_id) {
    return NextResponse.json({ error: 'Missing tenant_id in metadata' }, { status: 400 });
  }

  // Use service role to bypass RLS for webhook processing
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const billingMonths = parseInt(payload.metadata.billing_months ?? '1', 10);
  const plan = payload.metadata.plan ?? 'starter';

  // 2. Upsert payment record
  const { error: upsertError } = await supabase
    .from('subscription_payments')
    .upsert(
      {
        moyasar_id:     payload.id,
        moyasar_status: payload.status,
        tenant_id:      payload.metadata.tenant_id,
        amount:         payload.amount / 100,
        currency:       payload.currency,
        plan,
        billing_months: billingMonths,
        description:    payload.description,
        metadata:       payload.metadata,
      },
      { onConflict: 'moyasar_id' }
    );

  if (upsertError) {
    console.error('[moyasar-webhook] upsert error:', upsertError);
    return NextResponse.json({ error: 'DB upsert failed' }, { status: 500 });
  }

  // 3. If payment succeeded: activate subscription on tenant
  if (payload.status === 'paid' || payload.status === 'captured') {
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + billingMonths);

    const { error: tenantError } = await supabase
      .from('tenants')
      .update({
        status: 'active',
        subscription_plan: plan,
        subscription_ends_at: endsAt.toISOString(),
      })
      .eq('id', payload.metadata.tenant_id);

    if (tenantError) {
      console.error('[moyasar-webhook] tenant update error:', tenantError);
    }

    // Mark payment as confirmed
    await supabase
      .from('subscription_payments')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('moyasar_id', payload.id);
  }

  return NextResponse.json({ received: true });
}
