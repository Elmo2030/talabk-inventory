'use client';
import RouteErrorBoundary from '@/components/ui/RouteErrorBoundary';

export default function DashboardError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} route="/dashboard" title="تعذّر تحميل لوحة التحكم" />;
}
