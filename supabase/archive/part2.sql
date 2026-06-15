-- 12. PURCHASE INVOICES
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number      text NOT NULL,
  supplier_id         uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name       text NOT NULL DEFAULT '',
  invoice_date        date NOT NULL,
  currency            text NOT NULL DEFAULT 'LYD',
  exchange_rate       numeric(10,4) NOT NULL DEFAULT 1,
  intl_shipping       numeric(12,3) NOT NULL DEFAULT 0,
  local_shipping      numeric(12,3) NOT NULL DEFAULT 0,
  customs_duties      numeric(12,3) NOT NULL DEFAULT 0,
  clearance_fees      numeric(12,3) NOT NULL DEFAULT 0,
  other_expenses      numeric(12,3) NOT NULL DEFAULT 0,
  allocation_method   text NOT NULL DEFAULT 'VALUE' CHECK (allocation_method IN ('VALUE','QUANTITY','EQUAL')),
  items               jsonb NOT NULL DEFAULT '[]',
  subtotal            numeric(12,3) NOT NULL DEFAULT 0,
  total_landed_costs  numeric(12,3) NOT NULL DEFAULT 0,
  grand_total         numeric(12,3) NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','RECEIVED')),
  notes               text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  received_at         timestamptz,
  payment_status      text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid')),
  paid_amount         numeric(12,3) NOT NULL DEFAULT 0,
  due_date            date,
  payments            jsonb NOT NULL DEFAULT '[]',
  tenant_id           uuid REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant   ON purchase_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status   ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date     ON purchase_invoices(invoice_date DESC);

-- 13. SALES ORDERS
CREATE TABLE IF NOT EXISTS sales_orders (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number             text NOT NULL,
  customer_name            text NOT NULL,
  customer_phone           text NOT NULL DEFAULT '',
  customer_city            text NOT NULL DEFAULT '',
  customer_address         text NOT NULL DEFAULT '',
  delivery_type            text NOT NULL DEFAULT 'home' CHECK (delivery_type IN ('home','office','female')),
  items                    jsonb NOT NULL DEFAULT '[]',
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
  status                   text NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
  tracking_number          text,
  shipping_carrier         text,
  notes                    text NOT NULL DEFAULT '',
  customer_payment_status  text CHECK (customer_payment_status IN ('unpaid','partial','paid')),
  customer_paid_amount     numeric(12,3),
  customer_payments        jsonb NOT NULL DEFAULT '[]',
  created_at               timestamptz NOT NULL DEFAULT now(),
  shipped_at               timestamptz,
  delivered_at             timestamptz,
  tenant_id                uuid REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_number_tenant ON sales_orders(order_number, tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant   ON sales_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status   ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date     ON sales_orders(created_at DESC);

-- 14. COUPONS
CREATE TABLE IF NOT EXISTS coupons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  type        text NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed','percentage')),
  value       numeric(12,3) NOT NULL DEFAULT 0,
  min_order   numeric(12,3) NOT NULL DEFAULT 0,
  max_uses    int NOT NULL DEFAULT 0,
  used_count  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_tenant ON coupons(code, tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id);

-- 15. RETURN ORDERS
CREATE TABLE IF NOT EXISTS return_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number  text NOT NULL,
  order_id       uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
  order_number   text NOT NULL DEFAULT '',
  customer_name  text NOT NULL DEFAULT '',
  reason         text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')),
  items          jsonb NOT NULL DEFAULT '[]',
  refund_amount  numeric(12,3) NOT NULL DEFAULT 0,
  notes          text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  tenant_id      uuid REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_return_orders_tenant ON return_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_return_orders_order  ON return_orders(order_id);

-- 16. ORDER COUNTERS (atomic sequences)
CREATE TABLE IF NOT EXISTS order_counters (
  tenant_id  uuid REFERENCES tenants(id) ON DELETE CASCADE,
  prefix     text,
  year       int,
  last_value int NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, prefix, year)
);

CREATE OR REPLACE FUNCTION next_order_number(p_tenant_id uuid, p_prefix text, p_year int)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_next int;
BEGIN
  INSERT INTO order_counters(tenant_id, prefix, year, last_value)
    VALUES (p_tenant_id, p_prefix, p_year, 1)
  ON CONFLICT (tenant_id, prefix, year)
    DO UPDATE SET last_value = order_counters.last_value + 1
  RETURNING last_value INTO v_next;
  RETURN p_prefix || '-' || p_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

-- 17. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  date         date NOT NULL,
  time         text NOT NULL DEFAULT '',
  duration     int NOT NULL DEFAULT 60,
  status       text NOT NULL DEFAULT 'SCHEDULED'
                 CHECK (status IN ('SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW')),
  notes        text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  tenant_id    uuid REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments(date);

-- 18. STORE SETTINGS
CREATE TABLE IF NOT EXISTS store_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  vat_enabled boolean NOT NULL DEFAULT false,
  vat_rate    numeric(8,4) NOT NULL DEFAULT 0,
  vat_number  text,
  store_name  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 19. REGISTRATION REQUESTS
CREATE TABLE IF NOT EXISTS registration_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name      TEXT NOT NULL,
  owner_name      TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  requested_plan  subscription_plan_enum NOT NULL DEFAULT 'starter',
  status          reg_status_enum NOT NULL DEFAULT 'pending',
  notes           TEXT,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES auth.users(id),
  tenant_id       UUID REFERENCES tenants(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_reg_requests_email  ON registration_requests(email);

-- 20. SUBSCRIPTION PAYMENTS
CREATE TABLE IF NOT EXISTS subscription_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  plan            text NOT NULL,
  billing_months  int  NOT NULL DEFAULT 1,
  amount          numeric(10,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'USD',
  payment_method  text NOT NULL DEFAULT 'usdt' CHECK (payment_method IN ('cash','usdt')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  tx_hash         text,
  proof_notes     text,
  admin_notes     text,
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_payments_tenant ON subscription_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_status ON subscription_payments(status);

-- ============================================================
-- 21. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in_movements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_out_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_counters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
