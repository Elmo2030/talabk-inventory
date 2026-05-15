/**
 * Tenant Dashboard — /app/[tenantSlug]/dashboard
 *
 * Re-exports the existing dashboard page so all tenant paths resolve
 * to the same component.  The TenantContext in the layout already
 * scopes every Supabase query to the correct tenant via RLS.
 */

export { default } from '@/app/page';
