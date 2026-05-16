/**
 * Redirect — the tenant `/app/[slug]/customers` route was an identical
 * duplicate of the flat `/customers` page. Customers data is scoped by
 * RLS on tenant_id rather than the URL, so consolidating to one route
 * removes the maintenance burden of two copies.
 */
import { redirect } from 'next/navigation';

export default function TenantCustomersRedirect() {
  redirect('/customers');
}
