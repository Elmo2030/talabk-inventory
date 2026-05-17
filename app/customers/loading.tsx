import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export default function CustomersLoading() {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-60" />
      </div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
