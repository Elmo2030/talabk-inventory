-- ============================================================
-- Security hardening (audit 2026-09-28)
--
-- 1. vw_tenant_stats was readable by every signed-in user: all tenants'
--    user counts, order counts and GMV. Only get_tenant_stats() (super_admin
--    check, SECURITY DEFINER) may read it now.
-- 2. Tenants could INSERT a subscription_payments row with any amount, any
--    status (e.g. 'approved') and filled review fields. Inserts must now be a
--    pending request with the server-computed price and empty review fields.
-- 3. next_order_number(p_tenant_id, ...) is SECURITY DEFINER and callable by
--    any signed-in user for any tenant (burns another tenant's numbers).
--    It now refuses a tenant that is not the caller's own.
-- 4. plan_limits had no RLS: with default grants anyone could rewrite prices.
--
-- Idempotent. Apply on a branch/staging project first, then production.
-- ============================================================

-- ── 1. Tenant stats view: no direct reads ──────────────────────────────────
REVOKE ALL ON vw_tenant_stats FROM anon, authenticated;

-- ── 2. Payment requests: pending only, server price only ───────────────────
-- Mirrors calcAmount() in app/api/billing/submit/route.ts and BILLING_PERIODS
-- in app/billing/page.tsx; prices come from plan_limits.monthly_fee.
CREATE OR REPLACE FUNCTION expected_subscription_amount(p_plan text, p_months int)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT round(
           pl.monthly_fee * p_months *
           (1 - CASE p_months WHEN 1 THEN 0 WHEN 3 THEN 5 WHEN 6 THEN 10 WHEN 12 THEN 20 END / 100.0),
           2)
  FROM plan_limits pl
  WHERE pl.plan::text = p_plan
    AND p_plan IN ('starter', 'pro', 'enterprise')
    AND p_months IN (1, 3, 6, 12);
$$;

REVOKE ALL ON FUNCTION expected_subscription_amount(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION expected_subscription_amount(text, int) TO authenticated;

DROP POLICY IF EXISTS "tenant_insert_payments" ON subscription_payments;
CREATE POLICY "tenant_insert_payments" ON subscription_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (get_current_tenant_id())::uuid
    AND status = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND admin_notes IS NULL
    AND currency = 'LYD'
    AND amount = expected_subscription_amount(plan, billing_months)
  );

-- Review policy: super_admin may update, and the row must stay valid after.
DROP POLICY IF EXISTS "sa_review_payments" ON subscription_payments;
CREATE POLICY "sa_review_payments" ON subscription_payments
  FOR UPDATE TO authenticated
  USING (get_current_user_role() = 'super_admin')
  WITH CHECK (get_current_user_role() = 'super_admin');

-- ── 3. Order numbers: own tenant only ──────────────────────────────────────
CREATE OR REPLACE FUNCTION next_order_number(
  p_tenant_id uuid,
  p_prefix    text,
  p_year      int DEFAULT EXTRACT(YEAR FROM now())::int
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
BEGIN
  -- Signed-in callers (directly or through other RPCs) may only number their
  -- own tenant. service_role and postgres (no JWT) are trusted server code.
  IF auth.role() = 'authenticated'
     AND COALESCE(get_current_user_role(), '') <> 'super_admin'
     AND p_tenant_id IS DISTINCT FROM (get_current_tenant_id())::uuid THEN
    RAISE EXCEPTION 'next_order_number: tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF p_prefix NOT IN ('SO', 'PO') THEN
    RAISE EXCEPTION 'next_order_number: bad prefix %', p_prefix USING ERRCODE = '22023';
  END IF;

  INSERT INTO order_counters (tenant_id, prefix, year, last_value)
  VALUES (p_tenant_id, p_prefix, p_year, 1)
  ON CONFLICT (tenant_id, prefix, year)
  DO UPDATE SET last_value = order_counters.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN p_prefix || '-' || p_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION next_order_number(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_order_number(uuid, text, int) TO authenticated, service_role;

-- ── 4. Plan limits: public read, no client writes ──────────────────────────
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_limits_read" ON plan_limits;
CREATE POLICY "plan_limits_read" ON plan_limits
  FOR SELECT TO anon, authenticated
  USING (true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON plan_limits FROM anon, authenticated;

-- ── Verification (run as a normal tenant user after applying) ──────────────
-- SELECT * FROM vw_tenant_stats;                         -- expect: permission denied
-- INSERT INTO subscription_payments (tenant_id, plan, billing_months, amount, status)
--   VALUES (<own tenant>, 'pro', 1, 1, 'approved');     -- expect: RLS violation
-- SELECT next_order_number(<other tenant>, 'SO');        -- expect: tenant mismatch
-- UPDATE plan_limits SET monthly_fee = 0;                -- expect: permission denied
