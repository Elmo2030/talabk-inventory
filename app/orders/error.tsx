'use client';
import RouteErrorBoundary from '@/components/ui/RouteErrorBoundary';

export default function OrdersError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} route="/orders" title="تعذّر تحميل قائمة الطلبات" />;
}
