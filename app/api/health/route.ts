/**
 * GET /api/health
 * Lightweight uptime check — confirms the app can reach Supabase.
 * Mount this to your monitoring service (UptimeRobot, Better Stack, etc.).
 *
 * We hit Supabase's `/auth/v1/health` endpoint which is unauthenticated and
 * not affected by RLS — a good signal that the app↔Supabase path is healthy
 * without us needing a service-role key inside the request.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const started = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    return NextResponse.json(
      { status: 'misconfigured', error: 'NEXT_PUBLIC_SUPABASE_URL missing' },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { status: 'degraded', supabase: res.status,
          latency_ms: Date.now() - started },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { status: 'ok', supabase: 'reachable',
        latency_ms: Date.now() - started },
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
