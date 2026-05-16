-- ============================================================
-- Subscription Payments Table — Cash / USDT Manual Payments
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  plan            text NOT NULL,
  billing_months  int  NOT NULL DEFAULT 1,
  amount          numeric(10,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'USD',
  payment_method  text NOT NULL DEFAULT 'usdt'
                    CHECK (payment_method IN ('cash','usdt')),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  -- Evidence submitted by tenant
  tx_hash         text,          -- USDT transaction hash
  proof_notes     text,          -- tenant's freetext notes / cash receipt ref
  -- Admin review
  admin_notes     text,          -- rejection reason or approval note
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON subscription_payments(tenant_id);
CREATE INDEX ON subscription_payments(status);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Tenant sees own payments
CREATE POLICY "tenant_own_payments" ON subscription_payments
  FOR SELECT TO authenticated
  USING (
    tenant_id = (get_current_tenant_id())::uuid
    OR get_current_user_role() = 'super_admin'
  );

-- Tenants can submit payment requests
CREATE POLICY "tenant_insert_payments" ON subscription_payments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (get_current_tenant_id())::uuid);

-- Only super_admin can UPDATE (approve/reject)
CREATE POLICY "sa_review_payments" ON subscription_payments
  FOR UPDATE TO authenticated
  USING (get_current_user_role() = 'super_admin');
