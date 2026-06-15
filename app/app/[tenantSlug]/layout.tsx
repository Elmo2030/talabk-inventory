/**
 * Tenant App Shell Layout  — /app/[tenantSlug]/*
 *
 * • Loads TenantProvider (tenant + user profile + RBAC)
 * • Verifies tenant is active; suspends/cancelled → gate screen
 * • Injects tenantSlug into the Sidebar via a prop / context override
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TenantProvider } from '@/lib/TenantContext';
import Sidebar from '@/components/layout/Sidebar';
import LoadingGate from '@/components/layout/LoadingGate';
import TenantStatusGate from '@/components/layout/TenantStatusGate';
import TenantBottomNav from '@/components/layout/TenantBottomNav';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  return {
    title: `طلبك — ${tenantSlug}`,
  };
}

export default async function TenantAppLayout({ children, params }: Props) {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  // ── 1. Session check (middleware already guards, this is defence-in-depth) ─
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // ── 2. Load tenant row ────────────────────────────────────────────────────
  type TenantRow = { id: string; slug: string; store_name: string; status: string; subscription_plan: string; subscription_ends_at: string | null };
  const { data: tenantRaw, error } = await supabase
    .from('tenants')
    .select('id, slug, store_name, status, subscription_plan, subscription_ends_at')
    .eq('slug', tenantSlug)
    .single();
  const tenant = tenantRaw as unknown as TenantRow | null;

  if (error || !tenant) {
    redirect('/login');
  }
  // TypeScript narrowed: tenant is TenantRow past this point
  const tenantTyped = tenant as TenantRow;

  // ── 3. Verify user belongs to this tenant ─────────────────────────────────
  type ProfileRow = { tenant_id: string | null; role: string; is_active: boolean };
  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('tenant_id, role, is_active')
    .eq('id', user.id)
    .single();
  const profile = profileRaw as unknown as ProfileRow | null;

  const isSuperAdmin = profile?.role === 'super_admin';

  if (!isSuperAdmin && profile?.tenant_id !== tenantTyped.id) {
    // User belongs to a different tenant
    redirect('/login');
  }

  if (!isSuperAdmin && !profile?.is_active) {
    redirect('/login?error=account_disabled');
  }

  return (
    <TenantProvider>
      <TenantStatusGate tenant={tenantTyped}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:mr-64 pt-14 md:pt-0 p-4 md:p-8 pb-20 md:pb-8">
            <LoadingGate>{children}</LoadingGate>
          </main>
        </div>
        <TenantBottomNav tenantSlug={tenantSlug} />
      </TenantStatusGate>
    </TenantProvider>
  );
}
