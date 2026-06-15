-- ─────────────────────────────────────────────────────────────────────────────
-- Public Storefront RLS — anon-readable rows for /s/[slug]
--
-- The public-facing storefront at /s/<slug> needs to read a narrow slice of
-- tenants + items as the `anon` role. RLS is already enabled on both tables;
-- this migration adds explicit anon-SELECT policies that expose ONLY:
--
--   tenants : rows where status='active'   (no payment data, no secrets)
--   items   : rows where status='ACTIVE' AND tenant.status='active'
--
-- Sensitive columns (subscription_payments, user_profiles, audit_log, etc.)
-- have no anon policy → remain invisible.
--
-- Idempotent (DROP IF EXISTS before CREATE) so re-running is safe.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── tenants: anon can read active stores only ───────────────────────────────
DROP POLICY IF EXISTS "anon_read_active_tenants" ON tenants;
CREATE POLICY "anon_read_active_tenants"
  ON tenants
  FOR SELECT
  TO anon
  USING (status = 'active');

-- ── items: anon can read ACTIVE items of active tenants ─────────────────────
-- The join via EXISTS keeps the policy fast (uses the index on tenants.id).
DROP POLICY IF EXISTS "anon_read_storefront_items" ON items;
CREATE POLICY "anon_read_storefront_items"
  ON items
  FOR SELECT
  TO anon
  USING (
    status = 'ACTIVE'
    AND EXISTS (
      SELECT 1 FROM tenants t
       WHERE t.id = items.tenant_id
         AND t.status = 'active'
    )
  );

-- ── Audit trail ─────────────────────────────────────────────────────────────
-- Document this policy in audit_log so super_admins can see it was applied.
-- The migration metadata table is the source of truth, but a manual marker
-- here makes "which policies allow anon?" trivially answerable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    INSERT INTO audit_log (actor_id, actor_role, action, target_type, payload)
    VALUES (
      NULL,
      'system',
      'migration.public_storefront_rls_applied',
      'rls_policies',
      jsonb_build_object(
        'policies', jsonb_build_array(
          'anon_read_active_tenants',
          'anon_read_storefront_items'
        ),
        'applied_at', NOW()
      )
    );
  END IF;
END $$;

COMMIT;

-- ── Verification (run manually after applying) ─────────────────────────────
-- SET ROLE anon;
-- SELECT COUNT(*) FROM tenants;                      -- only active rows
-- SELECT COUNT(*) FROM items;                        -- only ACTIVE rows of active tenants
-- SELECT COUNT(*) FROM subscription_payments;        -- expect 0 rows / error
-- RESET ROLE;
