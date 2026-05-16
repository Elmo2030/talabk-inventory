-- ── Coupons ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL,
  type            text NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed','percentage')),
  value           numeric(12,3) NOT NULL,
  min_order_value numeric(12,3) NOT NULL DEFAULT 0,
  max_uses        int NOT NULL DEFAULT 0,
  used_count      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_tenant ON coupons(UPPER(code), tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation on coupons" ON coupons FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

-- ── Return Orders ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS return_orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number         text NOT NULL,
  original_order_id     text NOT NULL,
  original_order_number text NOT NULL,
  customer_name         text NOT NULL,
  customer_phone        text NOT NULL DEFAULT '',
  items                 jsonb NOT NULL DEFAULT '[]',
  reason                text NOT NULL DEFAULT '',
  refund_amount         numeric(12,3) NOT NULL DEFAULT 0,
  restock_items         boolean NOT NULL DEFAULT false,
  status                text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  notes                 text NOT NULL DEFAULT '',
  created_at            timestamptz NOT NULL DEFAULT now(),
  tenant_id             uuid REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_return_orders_tenant ON return_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_return_orders_status ON return_orders(status);
ALTER TABLE return_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation on return_orders" ON return_orders FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());
