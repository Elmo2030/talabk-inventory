'use client';

/**
 * TenantStatusGate
 * Shows the app normally for active tenants.
 * Renders a friendly block screen for suspended / cancelled tenants.
 */

import { AlertTriangle, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  tenant: { status: string; store_name: string };
  children: ReactNode;
}

export default function TenantStatusGate({ tenant, children }: Props) {
  if (tenant.status === 'active' || tenant.status === 'pending') {
    return <>{children}</>;
  }

  const isSuspended = tenant.status === 'suspended';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#09090B] p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          {isSuspended ? (
            <AlertTriangle className="w-16 h-16 text-amber-500" />
          ) : (
            <XCircle className="w-16 h-16 text-[#E5302A]" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-3">
          {isSuspended ? 'الحساب موقوف مؤقتاً' : 'تم إيقاف الاشتراك'}
        </h1>

        <p className="text-[#6C6C70] dark:text-[#A1A1AA] mb-2 text-sm leading-relaxed">
          {isSuspended
            ? `تم إيقاف حساب "${tenant.store_name}" مؤقتاً. يرجى التواصل مع فريق الدعم لاستعادة الوصول.`
            : `انتهى اشتراك "${tenant.store_name}". لتجديد الاشتراك وإعادة الوصول إلى بياناتك، تواصل مع الإدارة.`}
        </p>

        <a
          href="mailto:support@talabk.app"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-[#E5302A] text-white font-semibold text-sm hover:bg-[#C42B24] transition-colors"
        >
          تواصل مع الدعم
        </a>
      </div>
    </div>
  );
}
