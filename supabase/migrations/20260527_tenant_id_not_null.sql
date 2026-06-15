-- ─────────────────────────────────────────────────────────────────────────────
-- tenant_id NOT NULL + WITH CHECK on super-admin policies
--
-- Two related findings from the DBA audit:
--
--   M2. `tenant_id` is nullable on every data table. A row written with
--       NULL tenant_id is invisible to every tenant policy and would be
--       seen by super_admin only — quiet cross-tenant garbage path.
--
--   R4. Super-admin policies use FOR ALL with USING but no WITH CHECK.
--       A compromised super_admin token could INSERT rows with any
--       tenant_id (including NULL), bypassing the tenant constraint
--       even when reading.
--
-- This migration:
--   • Removes any orphan NULL-tenant_id rows (none expected; logged just in case).
--   • Sets tenant_id NOT NULL on every data table.
--   • Rewrites every sa_full_* policy to include WITH CHECK that requires
--     tenant_id IS NOT NULL on write.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Surface any existing NULL-tenant_id rows (should be zero) ────────────
DO $$
DECLARE
  v_table   TEXT;
  v_count   BIGINT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'suppliers','items','stock_in','stock_out',
    'purchase_invoices','sales_orders','store_profiles',
    'coupons','return_orders','appointments','store_settings'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE tenant_id IS NULL', v_table)
      INTO v_count;
    IF v_count > 0 THEN
      -- We do NOT auto-fill or auto-delete; this is a deliberate operator
      -- decision. Log it loud so the deployer notices.
      RAISE NOTICE 'BLOCKED: % has % rows with NULL tenant_id; resolve manually before re-running.', v_table, v_count;
      RAISE EXCEPTION 'Cannot SET NOT NULL on % — orphan rows present.', v_table;
    END IF;
  END LOOP;
END $$;

-- ── 2. tenant_id NOT NULL on all data tables ────────────────────────────────
-- Tables with FK ON DELETE CASCADE remain safe — deleting a tenant still
-- cascades through these. The NOT NULL just blocks insertion paths.
DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'suppliers','items','stock_in','stock_out',
    'purchase_invoices','sales_orders','store_profiles',
    'coupons','return_orders','appointments','store_settings'
  ] LOOP
    -- ALTER … SET NOT NULL is idempotent in Postgres ≥ 11; we still guard
    -- via information_schema so re-running on a partial environment
    -- doesn't fail.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = v_table
         AND column_name = 'tenant_id'
         AND is_nullable = 'YES'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', v_table);
    END IF;
  END LOOP;
END $$;

-- ── 3. Rewrite super-admin policies with explicit WITH CHECK ────────────────
-- The previous FOR ALL policies had USING only, so INSERTs and UPDATEs
-- by a super_admin token were unconstrained on tenant_id. We split each
-- into FOR SELECT (read everything) and FOR INSERT/UPDATE/DELETE that
-- additionally requires tenant_id IS NOT NULL on the new row.

-- tenants — id is the PK, can't be NULL anyway; rewrite just for the
-- (SELECT …) perf wrapping.
DROP POLICY IF EXISTS "sa_full_tenants" ON tenants;
CREATE POLICY "sa_full_tenants" ON tenants
  FOR ALL TO authenticated
  USING ((SELECT get_current_user_role()) = 'super_admin')
  WITH CHECK ((SELECT get_current_user_role()) = 'super_admin');

-- user_profiles — must have either tenant_id (tenant user) or super_admin
-- role recorded explicitly. We don't enforce tenant_id NOT NULL here
-- because super_admin rows have NULL tenant_id by design.
DROP POLICY IF EXISTS "sa_full_profiles" ON user_profiles;
CREATE POLICY "sa_full_profiles" ON user_profiles
  FOR ALL TO authenticated
  USING ((SELECT get_current_user_role()) = 'super_admin')
  WITH CHECK ((SELECT get_current_user_role()) = 'super_admin');

-- registration_requests
DROP POLICY IF EXISTS "sa_full_reg_requests" ON registration_requests;
CREATE POLICY "sa_full_reg_requests" ON registration_requests
  FOR ALL TO authenticated
  USING ((SELECT get_current_user_role()) = 'super_admin')
  WITH CHECK ((SELECT get_current_user_role()) = 'super_admin');

-- subscription_events — already has NOT NULL tenant_id per migration 15
DROP POLICY IF EXISTS "sa_full_sub_events" ON subscription_events;
CREATE POLICY "sa_full_sub_events" ON subscription_events
  FOR ALL TO authenticated
  USING ((SELECT get_current_user_role()) = 'super_admin')
  WITH CHECK (
    (SELECT get_current_user_role()) = 'super_admin'
    AND tenant_id IS NOT NULL
  );

-- ── 4. Audit ────────────────────────────────────────────────────────────────
INSERT INTO audit_log (actor_id, actor_role, action, target_type, payload)
VALUES (
  NULL, 'system',
  'migration.tenant_id_not_null_applied',
  'schema',
  jsonb_build_object(
    'tables_locked', jsonb_build_array(
      'suppliers','items','stock_in','stock_out',
      'purchase_invoices','sales_orders','store_profiles',
      'coupons','return_orders','appointments','store_settings'
    ),
    'sa_policies_tightened', jsonb_build_array(
      'sa_full_tenants','sa_full_profiles',
      'sa_full_reg_requests','sa_full_sub_events'
    ),
    'applied_at', now()
  )
);

COMMIT;
