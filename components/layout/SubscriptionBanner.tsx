'use client';

/**
 * Subscription expiry warning banner.
 * Shown inside the tenant app shell when the current tenant's subscription
 * expires within 7 days, or has already expired. Links to /billing.
 *
 * Renders nothing for tenants with no expiry date, super_admins, or when
 * the tenant context is still loading.
 */

import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useTenant } from '@/lib/TenantContext';

const WARN_THRESHOLD_DAYS = 7;
const DAY_MS = 86_400_000;

export default function SubscriptionBanner() {
  const { tenant, isLoading } = useTenant();
  if (isLoading || !tenant?.subscription_ends_at) return null;

  const endsAt = new Date(tenant.subscription_ends_at);
  const now    = Date.now();
  const diffMs = endsAt.getTime() - now;
  const daysLeft = Math.ceil(diffMs / DAY_MS);

  if (daysLeft > WARN_THRESHOLD_DAYS) return null;

  const expired = daysLeft <= 0;
  const bg = expired
    ? 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-900/60'
    : 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-900/60';
  const text = expired
    ? 'text-red-800 dark:text-red-300'
    : 'text-amber-800 dark:text-amber-300';
  const icon = expired
    ? 'text-red-600 dark:text-red-400'
    : 'text-amber-600 dark:text-amber-400';

  const message = expired
    ? 'انتهى اشتراكك. جدّد الآن لاستعادة الوصول الكامل.'
    : daysLeft === 1
    ? 'اشتراكك ينتهي غداً!'
    : `يتبقى ${daysLeft} أيام على انتهاء اشتراكك`;

  return (
    <div className={`border-b ${bg}`}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className={`flex items-center gap-2 text-sm ${text}`}>
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${icon}`} />
          <span className="font-medium">{message}</span>
        </div>
        <Link
          href="/billing"
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
            expired
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {expired ? 'جدد الاشتراك' : 'ترقية الباقة'}
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
