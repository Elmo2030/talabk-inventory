/**
 * Lightweight in-memory rate limiter — sliding-window counter per key.
 *
 * NOTE: This is per-process, so on Vercel each lambda instance keeps its
 * own counter. That is still a useful defense in depth against bursty
 * abuse, but it is NOT a substitute for a centralized limiter
 * (Upstash, Redis, Cloudflare Turnstile) once traffic justifies it.
 *
 * Usage:
 *
 *   const lim = createLimiter({ tokens: 5, windowMs: 60_000 });
 *   const { ok, retryAfter } = lim.check(`register:${ip}`);
 *   if (!ok) return new Response('rate limited', { status: 429, headers: { 'Retry-After': String(retryAfter) } });
 *
 * Keys are auto-evicted via a coarse LRU sweep so the map can't grow
 * unboundedly on a long-lived process.
 */

interface LimiterOpts {
  tokens: number;     // requests allowed
  windowMs: number;   // per this window
  maxKeys?: number;   // soft cap on tracked keys (default 10_000)
}

interface Bucket {
  count: number;
  resetAt: number;   // epoch ms when the window rolls over
}

export interface LimiterResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds — for the Retry-After header
}

export interface Limiter {
  check(key: string): LimiterResult;
}

export function createLimiter(opts: LimiterOpts): Limiter {
  const maxKeys = opts.maxKeys ?? 10_000;
  const buckets = new Map<string, Bucket>();

  function sweep(now: number) {
    if (buckets.size <= maxKeys) return;
    // Evict expired buckets first.
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size <= maxKeys * 0.9) return;
    }
    // Still over the cap → drop oldest insertion order (Map preserves it).
    while (buckets.size > maxKeys * 0.9) {
      const firstKey = buckets.keys().next().value;
      if (firstKey === undefined) break;
      buckets.delete(firstKey);
    }
  }

  return {
    check(key: string): LimiterResult {
      const now = Date.now();
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        sweep(now);
        return { ok: true, remaining: opts.tokens - 1, retryAfter: 0 };
      }
      if (existing.count >= opts.tokens) {
        return {
          ok: false,
          remaining: 0,
          retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
      }
      existing.count += 1;
      return { ok: true, remaining: opts.tokens - existing.count, retryAfter: 0 };
    },
  };
}

/**
 * Extract the caller's IP from a Next.js request. Walks the standard
 * chain of proxy headers Vercel/Cloudflare set. Falls back to "unknown"
 * which means a single bucket — that's intentional, it caps total
 * anonymous traffic when headers are absent.
 */
export function getClientIp(headers: Headers): string {
  // Vercel sets x-real-ip for the edge. x-forwarded-for is the standard
  // proxy chain — take the leftmost (originating) address.
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}

// ── Shared limiters (module-scoped so all callers share the same buckets) ────
// 5 registrations / hour / IP — generous enough for a real merchant who
// makes a typo, tight enough that scripted abuse hits the wall fast.
export const registerLimiter = createLimiter({ tokens: 5, windowMs: 60 * 60 * 1000 });

// 10 billing submissions / hour / IP — billing/submit also dedupes by
// tenant via a DB check, but the limiter bounds anonymous-burst load
// against the route itself.
export const billingLimiter = createLimiter({ tokens: 10, windowMs: 60 * 60 * 1000 });
