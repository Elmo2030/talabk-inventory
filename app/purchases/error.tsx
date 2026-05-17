'use client';
import RouteErrorBoundary from '@/components/ui/RouteErrorBoundary';

export default function PurchasesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} route="/purchases" title="تعذّر تحميل فواتير الشراء" />;
}
