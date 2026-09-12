import { describe, it, expect } from 'vitest';
import { generateNonce, buildCspHeader } from '@/middleware';

// ── Helper: محاكاة منطق استخراج subSlug من الـ hostname ──────────────────────
// نفس المنطق الموجود في middleware.ts — inline للاختبار دون استيراد الـ middleware كاملاً
function extractSubSlug(hostname: string, rootDomain: string): string | null {
  if (hostname === rootDomain || !hostname.endsWith(`.${rootDomain}`)) return null;
  const sub = hostname.replace(`.${rootDomain}`, '');
  if (!sub || ['www', 'api', 'admin', 'superadmin', 'app'].includes(sub)) return null;
  return sub;
}

describe('generateNonce', () => {
  it('returns a non-empty string', () => {
    const nonce = generateNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('returns different nonces on successive calls', () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
  });
});

describe('buildCspHeader', () => {
  it("includes 'unsafe-eval' in development", () => {
    const header = buildCspHeader('nonce123', true);
    expect(header).toContain("'unsafe-eval'");
  });

  it("does NOT include 'unsafe-eval' in production", () => {
    const header = buildCspHeader('nonce123', false);
    expect(header).not.toContain("'unsafe-eval'");
  });

  it('includes the nonce value', () => {
    const header = buildCspHeader('nonce123', false);
    expect(header).toContain("'nonce-nonce123'");
  });

  it('includes strict-dynamic', () => {
    const header = buildCspHeader('nonce123', false);
    expect(header).toContain("'strict-dynamic'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// tenantSlug extraction logic
// ─────────────────────────────────────────────────────────────────────────────

describe('tenantSlug extraction logic', () => {
  const ROOT = 'talabk.app';

  it('root domain → null (no subdomain)', () => {
    expect(extractSubSlug('talabk.app', ROOT)).toBeNull();
  });

  it('valid store subdomain → returns slug', () => {
    expect(extractSubSlug('store1.talabk.app', ROOT)).toBe('store1');
  });

  it('another valid subdomain → returns slug', () => {
    expect(extractSubSlug('myshop.talabk.app', ROOT)).toBe('myshop');
  });

  it('reserved "www" → null', () => {
    expect(extractSubSlug('www.talabk.app', ROOT)).toBeNull();
  });

  it('reserved "api" → null', () => {
    expect(extractSubSlug('api.talabk.app', ROOT)).toBeNull();
  });

  it('reserved "admin" → null', () => {
    expect(extractSubSlug('admin.talabk.app', ROOT)).toBeNull();
  });

  it('reserved "superadmin" → null', () => {
    expect(extractSubSlug('superadmin.talabk.app', ROOT)).toBeNull();
  });

  it('reserved "app" → null', () => {
    expect(extractSubSlug('app.talabk.app', ROOT)).toBeNull();
  });

  it('completely different domain → null', () => {
    expect(extractSubSlug('evil.com', ROOT)).toBeNull();
  });

  it('subdomain of different root → null', () => {
    expect(extractSubSlug('store1.evil.com', ROOT)).toBeNull();
  });

  it('localhost dev fallback → null (no match)', () => {
    expect(extractSubSlug('localhost:3000', ROOT)).toBeNull();
  });
});
