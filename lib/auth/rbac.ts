/**
 * RBAC — Role-Based Access Control utilities
 * طلبك — للمتاجر الإلكترونية
 */

import type { UserRole, Permission, UserProfile } from '../types';
import { DEFAULT_PERMISSIONS } from '../types';

// Role hierarchy: higher number = more privilege
const ROLE_WEIGHT: Record<UserRole, number> = {
  super_admin:  100,
  tenant_admin:  50,
  tenant_user:   10,
};

/**
 * Returns true if `userRole` is at least as privileged as `requiredRole`.
 */
export function hasRole(
  userRole: UserRole | null | undefined,
  requiredRole: UserRole,
): boolean {
  if (!userRole) return false;
  return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[requiredRole];
}

/**
 * Returns true if the user profile has the given permission.
 *
 * Logic:
 *  1. super_admin always has everything.
 *  2. Check the profile's per-user `permissions` override first.
 *  3. Fall back to the role's default permission table.
 */
export function can(
  profile: Pick<UserProfile, 'role' | 'permissions'> | null | undefined,
  permission: Permission,
): boolean {
  if (!profile) return false;
  if (profile.role === 'super_admin') return true;

  // Per-user override (explicit grant or denial)
  if (permission in profile.permissions) {
    return profile.permissions[permission] === true;
  }

  // Role default
  return DEFAULT_PERMISSIONS[profile.role]?.[permission] ?? false;
}

/**
 * Returns the full resolved permission map for a profile,
 * merging role defaults with per-user overrides.
 */
export function resolvePermissions(
  profile: Pick<UserProfile, 'role' | 'permissions'>,
): Record<Permission, boolean> {
  const defaults = DEFAULT_PERMISSIONS[profile.role] as Record<Permission, boolean>;
  return { ...defaults, ...profile.permissions } as Record<Permission, boolean>;
}

/**
 * Builds an initialised permission map for a new user based on their role.
 */
export function getDefaultPermissions(role: UserRole): Record<Permission, boolean> {
  return { ...DEFAULT_PERMISSIONS[role] };
}

// ── Plan-based feature flags ──────────────────────────────────────────────────

export type PlanFeature =
  | 'api_access'
  | 'multi_store'
  | 'advanced_reports'
  | 'custom_domain'
  | 'priority_support';

const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  trial:      [],
  starter:    [],
  pro:        ['api_access', 'advanced_reports'],
  enterprise: ['api_access', 'multi_store', 'advanced_reports', 'custom_domain', 'priority_support'],
};

export function planHasFeature(
  plan: string | null | undefined,
  feature: PlanFeature,
): boolean {
  if (!plan) return false;
  return (PLAN_FEATURES[plan] ?? []).includes(feature);
}
