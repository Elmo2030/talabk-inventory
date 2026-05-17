/**
 * /items route-level loading skeleton — Next 14 streams this in instantly
 * while the page bundle resolves, so users see the page shape (not a global
 * spinner) the moment they click the nav item.
 */
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export default function ItemsLoading() {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}
