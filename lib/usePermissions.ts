'use client';

/**
 * usePermissions — convenience hook for checking RBAC permissions.
 *
 * Wraps `useTenant` which already resolves per-user overrides against
 * role defaults (via lib/auth/rbac.ts → can()).
 *
 * Usage:
 *   const { can } = usePermissions();
 *   if (can('purchase_prices:read')) { ... }
 */

import { useTenant } from '@/lib/TenantContext';
import type { Permission } from '@/lib/types';

export function usePermissions() {
  const { can, role, isLoading } = useTenant();

  return {
    /** Returns true when the current user has the given permission. */
    can: (permission: Permission): boolean => can(permission),
    role,
    isLoading,
  };
}
