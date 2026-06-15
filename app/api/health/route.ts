/**
 * GET /api/health
 * Real DB-exercising probe — confirms the app can actually read Postgres,
 * not just reach the Supabase gateway. Mount this to UptimeRobot / Better Stack.
 *
 * Probes performed (in order):
 *   1. Auth gateway (`/auth/v1/health`)   — basic reachability
 *   2. PostgREST `SELECT id FROM tenants LIMIT 0` — confirms DB is up,
 *      RLS-protected so it returns an empty array even for anon callers,
 *      but a network-/schema-level failure surfaces as an error.
 *
 * Each probe has its own latency. The route returns 503 if EITHER fails
 * (the gateway alone returning 200 told us nothing useful — the prior bug).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProbeResult {
  ok: boolean;
  status: number;
  latency_ms: number;
  error?: string;
}

async function probe(url: string, headers: Record<string, string>, timeoutMs: number): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      ok: res.ok,
      status: res.status,
      latency_ms: Date.now() - started,
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      latency_ms: Date.now() - started,
      error: (err as Error).message,
    };
  }
}

export async function GET() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { status: 'misconfigured', error: 'Supabase env vars missing' },
      { status: 500 },
    );
  }

  const apikeyHeader = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  // Run both probes in parallel — we want total latency to be max(gateway, db),
  // not gateway + db. The probes are independent.
  const [gateway, db] = await Promise.all([
    probe(`${url}/auth/v1/health`, apikeyHeader, 3000),
    // `LIMIT 0` returns an empty array with HTTP 200 — exercises the
    // PostgREST → PgBouncer → Postgres path without leaking any data.
    probe(`${url}/rest/v1/tenants?select=id&limit=0`, apikeyHeader, 4000),
  ]);

  const allOk = gateway.ok && db.ok;

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      gateway,
      db,
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
