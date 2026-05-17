import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export default function OrdersLoading() {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <SkeletonTable rows={6} cols={7} />
    </div>
  );
}
