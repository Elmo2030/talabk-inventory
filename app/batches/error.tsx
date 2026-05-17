'use client';
import RouteErrorBoundary from '@/components/ui/RouteErrorBoundary';

export default function ErrorPage(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} route="/batches" title="تعذّر تحميل الدفعات" />;
}
