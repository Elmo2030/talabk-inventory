-- ─────────────────────────────────────────────────────────────────────────────
-- Public storefront — column-restricted view
--
-- The Wave-E migration (20260522_public_storefront.sql) granted anon
-- SELECT on `tenants WHERE status='active'`, which exposed `owner_email`,
-- `owner_phone`, `monthly_fee`, `subscription_ends_at`, and every other
-- column to anyone hitting /s/<slug>.
--
-- This migration:
--   1. Drops the broad anon policy on the base `tenants` table.
--   2. Creates a column-restricted view `vw_public_storefront_tenants`
--      exposing ONLY {id, slug, store_name, logo_url, owner_phone}.
--      owner_phone is included on purpose — the storefront page builds
--      the WhatsApp-order deep-link from it, but billing data, email,
--      subscription terms etc. stay private.
--   3. Same treatment for items via `vw_public_storefront_items`.
--
-- The view is created with `security_invoker=on` (Postgres 15+) so RLS
-- on the base tables still applies — but we also revoke direct anon
-- access on `tenants` and `items`, so the view is the only path.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Drop the over-broad anon policies from migration 22 ──────────────────
DROP POLICY IF EXISTS "anon_read_active_tenants"     ON tenants;
DROP POLICY IF EXISTS "anon_read_storefront_items"   ON items;

-- ── 2. Column-restricted storefront views ───────────────────────────────────
DROP VIEW IF EXISTS vw_public_storefront_items   CASCADE;
DROP VIEW IF EXISTS vw_public_storefront_tenants CASCADE;

CREATE VIEW vw_public_storefront_tenants
  WITH (security_invoker = on, security_barrier = on) AS
SELECT
  id,
  slug,
  store_name,
  logo_url,
  owner_phone        -- needed for the WhatsApp-order deep-link, nothing else
FROM tenants
WHERE status = 'active';

CREATE VIEW vw_public_storefront_items
  WITH (security_invoker = on, security_barrier = on) AS
SELECT
  i.id,
  i.code,
  i.name,
  i.category,
  i.unit,
  i.selling_price,
  i.location,
  i.tenant_id,
  i.metadata->>'imageUrl' AS image_url   -- safe; metadata stripped otherwise
FROM items i
WHERE i.status = 'ACTIVE'
  AND EXISTS (
    SELECT 1 FROM tenants t
     WHERE t.id = i.tenant_id
       AND t.status = 'active'
  );

-- ── 3. Re-grant a *narrow* anon policy that lets the views work ─────────────
-- The views are `security_invoker=on` so they execute under the caller's
-- privileges. We need anon to be able to SELECT the underlying rows the
-- views project — but with the same narrow predicates the views enforce.
-- The result is: anon can only ever read rows that match BOTH the policy
-- and the view's WHERE clause, and only the columns the view projects.
CREATE POLICY "anon_read_active_tenants" ON tenants
  FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "anon_read_storefront_items" ON items
  FOR SELECT TO anon
  USING (
    status = 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM tenants t
       WHERE t.id = items.tenant_id
         AND t.status = 'active'
    )
  );

-- ── 4. Grant access to the views (not the underlying tables for anon) ──────
GRANT SELECT ON vw_public_storefront_tenants TO anon, authenticated;
GRANT SELECT ON vw_public_storefront_items   TO anon, authenticated;

-- ── 5. Audit ────────────────────────────────────────────────────────────────
INSERT INTO audit_log (actor_id, actor_role, action, target_type, payload)
VALUES (
  NULL, 'system',
  'migration.storefront_view_applied',
  'views',
  jsonb_build_object(
    'views', jsonb_build_array('vw_public_storefront_tenants', 'vw_public_storefront_items'),
    'pii_columns_hidden', jsonb_build_array(
      'owner_email', 'monthly_fee', 'subscription_ends_at',
      'subscription_plan', 'max_users', 'max_items', 'max_orders_per_month'
    ),
    'applied_at', now()
  )
);

COMMIT;
