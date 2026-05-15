'use client';

/**
 * TenantContext
 * Loads the current user's tenant + profile once after login and
 * makes them available everywhere in the React tree.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Tenant, UserProfile, UserRole, Permission } from '@/lib/types';
import { can as rbacCan } from '@/lib/auth/rbac';

// ── Context shape ─────────────────────────────────────────────────────────────

interface TenantContextValue {
  /** The tenant row for the current user (null for super_admin) */
  tenant:      Tenant | null;
  /** Extended profile row from user_profiles */
  userProfile: UserProfile | null;
  /** Shortcut: profile.role */
  role:        UserRole | null;
  /** Shortcut: profile.tenant_id */
  tenantId:    string | null;
  /** True while the context is being fetched */
  isLoading:   boolean;
  /** Check a permission for the current user */
  can:         (permission: Permission) => boolean;
  /** Reload tenant + profile (useful after subscription changes) */
  refresh:     () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  tenant:      null,
  userProfile: null,
  role:        null,
  tenantId:    null,
  isLoading:   true,
  can:         () => false,
  refresh:     async () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function TenantProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();

  const [tenant,      setTenant]      = useState<Tenant | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);

  const loadContext = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Current Supabase session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTenant(null);
        setUserProfile(null);
        return;
      }

      // 2. Fetch user profile (role + tenant_id + permissions)
      const { data: profile, error: profileErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile) {
        console.error('[TenantContext] Could not load user profile:', profileErr?.message);
        setUserProfile(null);
        setTenant(null);
        return;
      }

      setUserProfile(profile as unknown as UserProfile);

      // 3. Fetch tenant (super_admin has no tenant)
      if (profile.tenant_id) {
        const { data: tenantRow } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profile.tenant_id)
          .single();
        setTenant(tenantRow as unknown as Tenant ?? null);
      } else {
        setTenant(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Load on mount
  useEffect(() => {
    loadContext();

    // Re-load whenever auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadContext();
    });

    return () => subscription.unsubscribe();
  }, [loadContext, supabase.auth]);

  // Stable permission helper
  const canDo = useCallback(
    (permission: Permission) => rbacCan(userProfile, permission),
    [userProfile],
  );

  const value: TenantContextValue = {
    tenant,
    userProfile,
    role:     userProfile?.role ?? null,
    tenantId: userProfile?.tenant_id ?? null,
    isLoading,
    can:      canDo,
    refresh:  loadContext,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useTenant() {
  return useContext(TenantContext);
}

/** Convenience hook: returns true when the user has the given permission */
export function usePermission(permission: Permission): boolean {
  const { can } = useTenant();
  return can(permission);
}
