import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
