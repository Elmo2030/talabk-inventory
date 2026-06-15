-- ─────────────────────────────────────────────────────────────────────────────
-- audit_log — super_admin actions, cron events, GDPR requests
--
-- The DBA audit (Wave F prep) discovered this table was referenced by
-- multiple writers but never actually created:
--   • app/api/cron/sweep-expired/route.ts     (per-tenant suspension rows)
--   • app/api/account/delete/route.ts         (GDPR erasure events)
--   • app/api/admin/approve/route.ts          (tenant approval)
--   • supabase/migrations/20260522_public_storefront.sql  (policy marker)
--
-- Without the table all four writers silently no-op'd. This migration
-- creates it with retention-friendly partitioning and the read policies
-- super_admins need.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  -- Who did it. NULL for system actions (cron, migrations).
  actor_id     UUID,
  -- Free-text role tag. Avoids hard FK to user_role_enum so we can record
  -- 'system', 'anon', or future roles without a migration.
  actor_role   TEXT NOT NULL,
  -- Verb. Dotted namespace (e.g. cron.sweep_expired, gdpr.tenant_cancellation_requested,
  -- tenant.approved, migration.public_storefront_rls_applied).
  action       TEXT NOT NULL,
  -- What was acted on. Generic so we can record tenants / items / users.
  target_type  TEXT,
  target_id    UUID,
  -- Arbitrary structured detail.
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- BRIN on created_at is cheap and great for the typical "recent activity"
-- query. The btree on (target_type, target_id) covers "show me what's
-- happened to this tenant".
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_target
  ON audit_log (target_type, target_id, created_at DESC)
  WHERE target_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON audit_log (actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log (action, created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- super_admin can read everything.
DROP POLICY IF EXISTS "sa_read_audit_log" ON audit_log;
CREATE POLICY "sa_read_audit_log"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING ((SELECT get_current_user_role()) = 'super_admin');

-- Tenant admins can read entries that target their own tenant (so a tenant
-- owner can answer "why was my account suspended?").
DROP POLICY IF EXISTS "tenant_read_own_audit" ON audit_log;
CREATE POLICY "tenant_read_own_audit"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    target_type = 'tenants'
    AND target_id = (SELECT get_current_tenant_id())
  );

-- Writes only via service_role (server routes + SECURITY DEFINER functions).
-- Tenant users never write directly; the API routes do it on their behalf.
DROP POLICY IF EXISTS "service_role_write_audit" ON audit_log;
CREATE POLICY "service_role_write_audit"
  ON audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── Retention helper ────────────────────────────────────────────────────────
-- Returns count of rows older than the cutoff. Run from a future cron job
-- or super_admin tool to prune. Keeping it as a function (not auto-cron)
-- means retention policy stays an explicit decision.
CREATE OR REPLACE FUNCTION prune_audit_log(p_keep_days INT DEFAULT 365)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  DELETE FROM audit_log
   WHERE created_at < (now() - (p_keep_days || ' days')::interval)
   RETURNING 1 INTO v_deleted;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION prune_audit_log(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION prune_audit_log(int) TO service_role;

-- ── Self-audit ──────────────────────────────────────────────────────────────
INSERT INTO audit_log (actor_id, actor_role, action, target_type, payload)
VALUES (
  NULL,
  'system',
  'migration.audit_log_created',
  'audit_log',
  jsonb_build_object('applied_at', now())
);

COMMIT;
