import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div dir="rtl" className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <SkeletonCard lines={6} />
      <SkeletonCard lines={4} />
    </div>
  );
}
