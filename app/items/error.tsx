'use client';
import RouteErrorBoundary from '@/components/ui/RouteErrorBoundary';

export default function ItemsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} route="/items" title="تعذّر تحميل قائمة الأصناف" />;
}
