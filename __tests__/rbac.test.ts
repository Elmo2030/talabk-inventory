import { describe, it, expect } from 'vitest';
import {
  hasRole,
  can,
  resolvePermissions,
  getDefaultPermissions,
  planHasFeature,
} from '@/lib/auth/rbac';
import type { UserProfile } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// hasRole
// ─────────────────────────────────────────────────────────────────────────────

describe('hasRole', () => {
  it('returns false for null user', () => {
    expect(hasRole(null, 'tenant_user')).toBe(false);
  });

  it('returns false for undefined user', () => {
    expect(hasRole(undefined, 'tenant_user')).toBe(false);
  });

  it('same role → true', () => {
    expect(hasRole('tenant_admin', 'tenant_admin')).toBe(true);
  });

  it('super_admin passes any required role', () => {
    expect(hasRole('super_admin', 'tenant_admin')).toBe(true);
    expect(hasRole('super_admin', 'tenant_user')).toBe(true);
    expect(hasRole('super_admin', 'super_admin')).toBe(true);
  });

  it('tenant_admin passes tenant_user but not super_admin', () => {
    expect(hasRole('tenant_admin', 'tenant_user')).toBe(true);
    expect(hasRole('tenant_admin', 'super_admin')).toBe(false);
  });

  it('tenant_user fails tenant_admin and super_admin', () => {
    expect(hasRole('tenant_user', 'tenant_admin')).toBe(false);
    expect(hasRole('tenant_user', 'super_admin')).toBe(false);
  });

  it('tenant_user passes tenant_user', () => {
    expect(hasRole('tenant_user', 'tenant_user')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// can
// ─────────────────────────────────────────────────────────────────────────────

const makeProfile = (
  role: UserProfile['role'],
  overrides: Partial<Record<string, boolean>> = {}
): Pick<UserProfile, 'role' | 'permissions'> => ({
  role,
  permissions: overrides as UserProfile['permissions'],
});

describe('can', () => {
  it('returns false for null profile', () => {
    expect(can(null, 'items:read')).toBe(false);
  });

  it('returns false for undefined profile', () => {
    expect(can(undefined, 'items:read')).toBe(false);
  });

  it('super_admin can do anything', () => {
    const profile = makeProfile('super_admin');
    expect(can(profile, 'items:read')).toBe(true);
    expect(can(profile, 'settings:write')).toBe(true);
    expect(can(profile, 'users:write')).toBe(true);
    expect(can(profile, 'purchase_prices:read')).toBe(true);
  });

  it('tenant_admin has items:read by default', () => {
    expect(can(makeProfile('tenant_admin'), 'items:read')).toBe(true);
  });

  it('tenant_user cannot write items by default', () => {
    expect(can(makeProfile('tenant_user'), 'items:write')).toBe(false);
  });

  it('tenant_user can read items by default', () => {
    expect(can(makeProfile('tenant_user'), 'items:read')).toBe(true);
  });

  it('per-user override grants denied-by-default permission', () => {
    const profile = makeProfile('tenant_user', { 'items:write': true });
    expect(can(profile, 'items:write')).toBe(true);
  });

  it('per-user override denies granted-by-default permission', () => {
    const profile = makeProfile('tenant_user', { 'items:read': false });
    expect(can(profile, 'items:read')).toBe(false);
  });

  it('falls back to role default when permission not in overrides', () => {
    const profile = makeProfile('tenant_user', { 'settings:write': true });
    // items:read is not overridden — should use role default (true)
    expect(can(profile, 'items:read')).toBe(true);
  });

  it('tenant_user cannot access analytics by default', () => {
    expect(can(makeProfile('tenant_user'), 'analytics:read')).toBe(false);
  });

  it('tenant_user cannot read purchase_prices by default', () => {
    expect(can(makeProfile('tenant_user'), 'purchase_prices:read')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolvePermissions
// ─────────────────────────────────────────────────────────────────────────────

describe('resolvePermissions', () => {
  it('returns a complete permission map for tenant_user', () => {
    const map = resolvePermissions(makeProfile('tenant_user'));
    expect(typeof map['items:read']).toBe('boolean');
    expect(typeof map['items:write']).toBe('boolean');
  });

  it('override takes precedence over role default', () => {
    const profile = makeProfile('tenant_user', { 'items:write': true });
    const map = resolvePermissions(profile);
    expect(map['items:write']).toBe(true);
  });

  it('non-overridden permissions reflect role defaults', () => {
    const profile = makeProfile('tenant_user', {});
    const map = resolvePermissions(profile);
    // tenant_user default: items:write = false
    expect(map['items:write']).toBe(false);
    // tenant_user default: items:read = true
    expect(map['items:read']).toBe(true);
  });

  it('tenant_admin has full settings access by default', () => {
    const map = resolvePermissions(makeProfile('tenant_admin'));
    expect(map['settings:read']).toBe(true);
    expect(map['settings:write']).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDefaultPermissions
// ─────────────────────────────────────────────────────────────────────────────

describe('getDefaultPermissions', () => {
  it('returns correct defaults for tenant_user', () => {
    const perms = getDefaultPermissions('tenant_user');
    expect(perms['items:read']).toBe(true);
    expect(perms['items:write']).toBe(false);
    expect(perms['settings:write']).toBe(false);
  });

  it('returns correct defaults for tenant_admin', () => {
    const perms = getDefaultPermissions('tenant_admin');
    expect(perms['items:write']).toBe(true);
    expect(perms['settings:write']).toBe(true);
    expect(perms['users:write']).toBe(true);
  });

  it('returns a copy — mutating it does not affect defaults', () => {
    const perms = getDefaultPermissions('tenant_user');
    (perms as Record<string, boolean>)['items:write'] = true;
    // Getting defaults again should still return original value
    const fresh = getDefaultPermissions('tenant_user');
    expect(fresh['items:write']).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// planHasFeature
// ─────────────────────────────────────────────────────────────────────────────

describe('planHasFeature', () => {
  it('returns false for null plan', () => {
    expect(planHasFeature(null, 'api_access')).toBe(false);
  });

  it('returns false for undefined plan', () => {
    expect(planHasFeature(undefined, 'api_access')).toBe(false);
  });

  it('trial has no features', () => {
    expect(planHasFeature('trial', 'api_access')).toBe(false);
    expect(planHasFeature('trial', 'multi_store')).toBe(false);
    expect(planHasFeature('trial', 'advanced_reports')).toBe(false);
  });

  it('starter has no features', () => {
    expect(planHasFeature('starter', 'api_access')).toBe(false);
    expect(planHasFeature('starter', 'multi_store')).toBe(false);
  });

  it('pro has api_access and advanced_reports', () => {
    expect(planHasFeature('pro', 'api_access')).toBe(true);
    expect(planHasFeature('pro', 'advanced_reports')).toBe(true);
  });

  it('pro does NOT have multi_store or custom_domain', () => {
    expect(planHasFeature('pro', 'multi_store')).toBe(false);
    expect(planHasFeature('pro', 'custom_domain')).toBe(false);
  });

  it('enterprise has all features', () => {
    expect(planHasFeature('enterprise', 'api_access')).toBe(true);
    expect(planHasFeature('enterprise', 'multi_store')).toBe(true);
    expect(planHasFeature('enterprise', 'advanced_reports')).toBe(true);
    expect(planHasFeature('enterprise', 'custom_domain')).toBe(true);
    expect(planHasFeature('enterprise', 'priority_support')).toBe(true);
  });

  it('unknown plan returns false', () => {
    expect(planHasFeature('unknown_plan', 'api_access')).toBe(false);
  });
});
