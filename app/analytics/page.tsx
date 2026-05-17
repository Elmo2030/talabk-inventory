'use client';

/**
 * /analytics — thin wrapper that lazy-loads the heavy analytics client.
 *
 * The actual page lives in `components/analytics/AnalyticsClient.tsx`
 * (788 LOC with 9 charts importing ~95 KB of recharts). Splitting it
 * behind `next/dynamic` keeps the route shell + page header rendering
 * instantly while the chart-heavy body streams in below.
 *
 * `loading.tsx` already covers the initial route paint; this dynamic
 * fallback covers the in-page chart-island hydration.
 */

import dynamic from 'next/dynamic';

const AnalyticsClient = dynamic(
  () => import('@/components/analytics/AnalyticsClient'),
  {
    ssr: false,
    loading: () => (
      <div dir="rtl" className="space-y-5">
        <div className="h-8 w-48 bg-slate-200 dark:bg-[#27272A] rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-[280px] bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-[280px] bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl animate-pulse" />
          <div className="h-[280px] bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl animate-pulse" />
        </div>
      </div>
    ),
  },
);

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
