/**
 * GET /api/health
 * Lightweight uptime check — pings Supabase and returns status.
 * Mount this to your monitoring service (UptimeRobot, Better Stack, etc.).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const started = Date.now();
  try {
    const supabase = await createServerSupabaseClient();
    // Lightweight ping — head request against a tiny table
    const { error } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { status: 'degraded', db: 'error', error: error.message,
          latency_ms: Date.now() - started },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { status: 'ok', db: 'ok', latency_ms: Date.now() - started },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      { status: 'error', error: (err as Error).message,
        latency_ms: Date.now() - started },
      { status: 500 },
    );
  }
}
