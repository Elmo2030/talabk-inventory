import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from '@/lib/safeRedirect';

describe('safeRedirectPath', () => {
  it('keeps same-origin paths', () => {
    expect(safeRedirectPath('/superadmin/tenants?x=1', '/superadmin')).toBe('/superadmin/tenants?x=1');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\\/evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    '/\t/evil.example',
    '/\n/evil.example',
    'relative/path',
  ])('rejects %j', (raw) => {
    expect(safeRedirectPath(raw, '/superadmin')).toBe('/superadmin');
  });

  it('falls back when empty', () => {
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
  });
});
