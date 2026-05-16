-- ============================================================
-- Migration: Create purchase_invoices and sales_orders tables
-- These were previously stored in localStorage; now persisted in Supabase
-- ============================================================

-- ── purchase_invoices ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number      text NOT NULL,
  supplier_id         uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name       text NOT NULL DEFAULT '',
  invoice_date        date NOT NULL,
  currency            text NOT NULL DEFAULT 'LYD',
  exchange_rate       numeric(10,4) NOT NULL DEFAULT 1,
  -- Landed cost fields
  intl_shipping       numeric(12,3) NOT NULL DEFAULT 0,
  local_shipping      numeric(12,3) NOT NULL DEFAULT 0,
  customs_duties      numeric(12,3) NOT NULL DEFAULT 0,
  clearance_fees      numeric(12,3) NOT NULL DEFAULT 0,
  other_expenses      numeric(12,3) NOT NULL DEFAULT 0,
  allocation_method   text NOT NULL DEFAULT 'VALUE' CHECK (allocation_method IN ('VALUE','QUANTITY','EQUAL')),
  -- Complex fields stored as JSONB
  items               jsonb NOT NULL DEFAULT '[]',
  -- Computed totals
  subtotal            numeric(12,3) NOT NULL DEFAULT 0,
  total_landed_costs  numeric(12,3) NOT NULL DEFAULT 0,
  grand_total         numeric(12,3) NOT NULL DEFAULT 0,
  -- Meta
  status              text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','RECEIVED')),
  notes               text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  received_at         timestamptz,
  -- Payment tracking
  payment_status      text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid')),
  paid_amount         numeric(12,3) NOT NULL DEFAULT 0,
  due_date            date,
  payments            jsonb NOT NULL DEFAULT '[]',
  -- Multi-tenant
  tenant_id           uuid REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant    ON purchase_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier  ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status    ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date      ON purchase_invoices(invoice_date DESC);

-- ── sales_orders ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_orders (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number             text NOT NULL,
  -- Customer
  customer_name            text NOT NULL,
  customer_phone           text NOT NULL DEFAULT '',
  customer_city            text NOT NULL DEFAULT '',
  customer_address         text NOT NULL DEFAULT '',
  delivery_type            text NOT NULL DEFAULT 'home' CHECK (delivery_type IN ('home','office','female')),
  -- Cart
  items                    jsonb NOT NULL DEFAULT '[]',
  -- Financial
  shipping_cost            numeric(12,3) NOT NULL DEFAULT 0,
  shipping_on_store        boolean NOT NULL DEFAULT false,
  subtotal                 numeric(12,3) NOT NULL DEFAULT 0,
  discount_amount          numeric(12,3) NOT NULL DEFAULT 0,
  discount_type            text,
  discount_value           numeric(12,3),
  coupon_code              text,
  customer_total           numeric(12,3) NOT NULL DEFAULT 0,
  total_cogs               numeric(12,3) NOT NULL DEFAULT 0,
  gross_profit             numeric(12,3) NOT NULL DEFAULT 0,
  net_profit               numeric(12,3) NOT NULL DEFAULT 0,
  profit_margin            numeric(8,4) NOT NULL DEFAULT 0,
  vat_rate                 numeric(8,4),
  vat_amount               numeric(12,3),
  -- Status
  status                   text NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
  tracking_number          text,
  shipping_carrier         text,
  notes                    text NOT NULL DEFAULT '',
  -- Customer payment tracking
  customer_payment_status  text CHECK (customer_payment_status IN ('unpaid','partial','paid')),
  customer_paid_amount     numeric(12,3),
  customer_payments        jsonb NOT NULL DEFAULT '[]',
  -- Timestamps
  created_at               timestamptz NOT NULL DEFAULT now(),
  shipped_at               timestamptz,
  delivered_at             timestamptz,
  -- Multi-tenant
  tenant_id                uuid REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_number_tenant
  ON sales_orders(order_number, tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant   ON sales_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status   ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date     ON sales_orders(created_at DESC);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders      ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies (same pattern as other tables)
CREATE POLICY "Tenant isolation on purchase_invoices"
  ON purchase_invoices FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Tenant isolation on sales_orders"
  ON sales_orders FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Super admin bypass (can see all tenants)
CREATE POLICY "Super admin bypass on purchase_invoices"
  ON purchase_invoices FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin');

CREATE POLICY "Super admin bypass on sales_orders"
  ON sales_orders FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin');
