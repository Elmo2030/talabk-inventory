-- ============================================================
-- Subscription Payments Table — Moyasar Integration
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  amount            numeric(10,2) NOT NULL,
  currency          text NOT NULL DEFAULT 'SAR',
  moyasar_id        text UNIQUE,            -- Moyasar payment ID
  moyasar_status    text,                   -- initiated / paid / failed / authorized
  plan              text NOT NULL,          -- starter / pro / enterprise
  billing_months    int  NOT NULL DEFAULT 1,
  description       text,
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  confirmed_at      timestamptz,
  confirmed_by      uuid REFERENCES auth.users(id)  -- superadmin who confirmed
);

CREATE INDEX ON subscription_payments(tenant_id);
CREATE INDEX ON subscription_payments(moyasar_id);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Tenant sees own payments; super_admin sees all
CREATE POLICY "tenant_own_payments" ON subscription_payments FOR SELECT TO authenticated
  USING (tenant_id = (get_current_tenant_id())::uuid OR get_current_user_role() = 'super_admin');

-- Only super_admin can INSERT/UPDATE (confirmations and webhook writes via service role bypass RLS)
CREATE POLICY "sa_manage_payments" ON subscription_payments FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin')
  WITH CHECK (get_current_user_role() = 'super_admin');
