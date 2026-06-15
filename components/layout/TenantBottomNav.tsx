'use client';

/**
 * Thin client wrapper around BottomNav that the (server) tenant layout
 * can mount. It supplies the tenant-scoped routes and the open-sidebar
 * event dispatcher (window APIs need a client component).
 */

import BottomNav from './BottomNav';

export default function TenantBottomNav({ tenantSlug }: { tenantSlug: string }) {
  return (
    <BottomNav
      newOrderHref={`/app/${tenantSlug}/orders/new`}
      onOpenMore={() => window.dispatchEvent(new Event('talabk:open-sidebar'))}
    />
  );
}
