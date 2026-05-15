'use client';

import { ReactNode } from 'react';
import { useStock } from '@/lib/StockContext';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton, SkeletonKPICard } from '@/components/ui/Skeleton';

export default function LoadingGate({ children }: { children: ReactNode }) {
  const { loading, error, refresh } = useStock();

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        {/* Page header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonKPICard key={i} />)}
        </div>
        {/* Table skeleton */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#27272A]">
            <Skeleton className="h-9 w-full max-w-xs rounded-xl" />
          </div>
          <div className="divide-y divide-[#F2F2F7] dark:divide-[#27272A]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white dark:bg-[#18181B] border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-[#1C1C1E] dark:text-[#F4F4F5] mb-1">فشل تحميل البيانات</h2>
          <p className="text-xs text-[#6C6C70] dark:text-[#A1A1AA] mb-5 font-mono break-all">{error}</p>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E5302A] hover:bg-[#C42B24] text-white font-semibold text-sm rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
