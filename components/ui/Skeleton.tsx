'use client';

// Base pulsing skeleton
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#E5E5EA] dark:bg-[#27272A] ${className}`}
    />
  );
}

// Skeleton for a full table row (n columns)
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-[#E5E5EA] dark:border-[#27272A]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-24'}`} />
        </td>
      ))}
    </tr>
  );
}

// Skeleton for a full table (header + n rows)
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl overflow-hidden">
      {/* Header skeleton */}
      <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#27272A] flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      {/* Search bar skeleton */}
      <div className="px-5 py-3 border-b border-[#E5E5EA] dark:border-[#27272A]">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-[#F2F2F7] dark:bg-[#27272A]/50 border-b border-[#E5E5EA] dark:border-[#27272A]">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Skeleton for a KPI card
export function SkeletonKPICard() {
  return (
    <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-28" />
    </div>
  );
}

// Skeleton for a single card/form
export function SkeletonCard({ lines = 4 }: { lines?: number }) {
  return (
    <div className="bg-white dark:bg-[#18181B] border border-[#E5E5EA] dark:border-[#27272A] rounded-2xl p-5 space-y-3">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-4/5' : 'w-3/5'}`} />
      ))}
    </div>
  );
}
