/**
 * Super Admin Layout — /superadmin/*
 * Separate from the tenant app shell; no Sidebar, its own nav.
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import SuperAdminSidebar from '@/components/layout/SuperAdminSidebar';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'لوحة الإدارة العليا — طلبك',
};

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/superadmin/login');

  const { data: profileRaw } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const profile = profileRaw as unknown as { role: string } | null;

  if (profile?.role !== 'super_admin') redirect('/403');

  return (
    <div className="flex min-h-screen bg-[#F2F2F7] dark:bg-[#09090B]">
      <SuperAdminSidebar />
      <main className="flex-1 md:mr-64 p-6 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
