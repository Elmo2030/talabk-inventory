-- ============================================================
-- FULL MIGRATION — Safe to re-run (handles existing objects)
-- ============================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. ENUMS (safe wrappers)
DO $$ BEGIN
  CREATE TYPE item_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'UNDER_REVIEW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_status_enum AS ENUM ('OUT_OF_STOCK', 'NEEDS_REORDER', 'LOW', 'AVAILABLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan_enum AS ENUM ('trial', 'starter', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tenant_status_enum AS ENUM ('pending', 'active', 'suspended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('super_admin', 'tenant_admin', 'tenant_user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reg_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT UNIQUE NOT NULL
                          CHECK (slug ~ '^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$'),
  store_name            TEXT NOT NULL,
  owner_email           TEXT NOT NULL,
  owner_phone           TEXT,
  logo_url              TEXT,
  subscription_plan     subscription_plan_enum NOT NULL DEFAULT 'trial',
  status                tenant_status_enum     NOT NULL DEFAULT 'pending',
  subscription_ends_at  TIMESTAMPTZ,
  monthly_fee           DECIMAL(10, 2) NOT NULL DEFAULT 0,
  max_users             INT            NOT NULL DEFAULT 3,
  max_items             INT            NOT NULL DEFAULT 100,
  max_orders_per_month  INT            NOT NULL DEFAULT 200,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenants_slug   ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 3. USER PROFILES
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role         user_role_enum NOT NULL DEFAULT 'tenant_user',
  full_name    TEXT,
  permissions  JSONB NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_super_admin_no_tenant
    CHECK (
      (role = 'super_admin' AND tenant_id IS NULL) OR
      (role <> 'super_admin' AND tenant_id IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role   ON user_profiles(role);

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 4. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                VARCHAR(20) UNIQUE NOT NULL,
  name                VARCHAR(200) NOT NULL,
  product_type        VARCHAR(150),
  phone               VARCHAR(20),
  email               VARCHAR(100),
  address             TEXT,
  contact_person      VARCHAR(100),
  payment_terms       INTEGER DEFAULT 0,
  rating              INTEGER DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  is_active           BOOLEAN DEFAULT TRUE,
  notes               TEXT,
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_code   ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- 5. ITEMS
CREATE TABLE IF NOT EXISTS items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                VARCHAR(50) UNIQUE NOT NULL,
  name                VARCHAR(200) NOT NULL,
  category            VARCHAR(100) NOT NULL,
  unit                VARCHAR(20) DEFAULT 'قطعة',
  supplier_id         UUID REFERENCES suppliers(id),
  purchase_price      DECIMAL(15, 2) DEFAULT 0,
  selling_price       DECIMAL(15, 2) DEFAULT 0,
  opening_qty         DECIMAL(15, 3) DEFAULT 0,
  min_stock_level     DECIMAL(15, 3) DEFAULT 0,
  reorder_level       DECIMAL(15, 3) DEFAULT 0,
  location            VARCHAR(100),
  status              item_status_enum DEFAULT 'ACTIVE',
  moving_average_cost NUMERIC(12,4),
  metadata            JSONB DEFAULT '{}',
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_items_code     ON items(code);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_supplier ON items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_items_tenant   ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_name_search ON items USING gin (name gin_trgm_ops);

-- 6. STOCK IN MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_in_movements (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_code          VARCHAR(20) UNIQUE NOT NULL,
  date                    DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_no              VARCHAR(50),
  item_id                 UUID NOT NULL REFERENCES items(id),
  supplier_id             UUID REFERENCES suppliers(id),
  quantity                DECIMAL(15, 3) NOT NULL CHECK (quantity > 0),
  unit_price              DECIMAL(15, 2) NOT NULL,
  total_cost              DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  responsible_employee    VARCHAR(100) NOT NULL,
  notes                   TEXT,
  tenant_id               UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  created_by              UUID
);
CREATE INDEX IF NOT EXISTS idx_stockin_date   ON stock_in_movements(date DESC);
CREATE INDEX IF NOT EXISTS idx_stockin_item   ON stock_in_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stockin_tenant ON stock_in_movements(tenant_id);

-- 7. STOCK OUT MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_out_movements (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_code          VARCHAR(20) UNIQUE NOT NULL,
  date                    DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id                 UUID NOT NULL REFERENCES items(id),
  recipient_dept          VARCHAR(150) NOT NULL,
  quantity                DECIMAL(15, 3) NOT NULL CHECK (quantity > 0),
  unit_price              DECIMAL(15, 2) NOT NULL,
  total_value             DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  reason                  VARCHAR(100) NOT NULL,
  responsible_employee    VARCHAR(100) NOT NULL,
  notes                   TEXT,
  tenant_id               UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  created_by              UUID
);
CREATE INDEX IF NOT EXISTS idx_stockout_date   ON stock_out_movements(date DESC);
CREATE INDEX IF NOT EXISTS idx_stockout_item   ON stock_out_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stockout_tenant ON stock_out_movements(tenant_id);

-- 8. AUTO-NUMBERING
CREATE SEQUENCE IF NOT EXISTS stock_in_seq START 1;
CREATE SEQUENCE IF NOT EXISTS stock_out_seq START 1;

CREATE OR REPLACE FUNCTION generate_stock_in_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.operation_code IS NULL OR NEW.operation_code = '' THEN
    NEW.operation_code := 'IN' || LPAD(nextval('stock_in_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_in_code ON stock_in_movements;
CREATE TRIGGER trg_stock_in_code
BEFORE INSERT ON stock_in_movements
FOR EACH ROW EXECUTE FUNCTION generate_stock_in_code();

CREATE OR REPLACE FUNCTION generate_stock_out_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.operation_code IS NULL OR NEW.operation_code = '' THEN
    NEW.operation_code := 'OUT' || LPAD(nextval('stock_out_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_out_code ON stock_out_movements;
CREATE TRIGGER trg_stock_out_code
BEFORE INSERT ON stock_out_movements
FOR EACH ROW EXECUTE FUNCTION generate_stock_out_code();

-- 9. PREVENT NEGATIVE STOCK
CREATE OR REPLACE FUNCTION check_stock_availability() RETURNS TRIGGER AS $$
DECLARE
  current_balance DECIMAL;
  item_opening DECIMAL;
  total_in DECIMAL;
  total_out DECIMAL;
BEGIN
  SELECT opening_qty INTO item_opening FROM items WHERE id = NEW.item_id;
  SELECT COALESCE(SUM(quantity), 0) INTO total_in FROM stock_in_movements WHERE item_id = NEW.item_id;
  SELECT COALESCE(SUM(quantity), 0) INTO total_out FROM stock_out_movements WHERE item_id = NEW.item_id;
  current_balance := item_opening + total_in - total_out;
  IF NEW.quantity > current_balance THEN
    RAISE EXCEPTION 'الرصيد غير كافٍ. المتاح: %, المطلوب: %', current_balance, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_stock_availability ON stock_out_movements;
CREATE TRIGGER trg_check_stock_availability
BEFORE INSERT ON stock_out_movements
FOR EACH ROW EXECUTE FUNCTION check_stock_availability();

-- 10. UPDATED_AT
CREATE OR REPLACE FUNCTION update_modified_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suppliers_updated ON suppliers;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS trg_items_updated ON items;
CREATE TRIGGER trg_items_updated BEFORE UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 11. CURRENT STOCK VIEW
CREATE OR REPLACE VIEW current_stock_view AS
SELECT
  i.id AS item_id, i.code AS item_code, i.name AS item_name, i.category, i.unit,
  i.opening_qty,
  COALESCE(sin.total_in, 0) AS total_in,
  COALESCE(sout.total_out, 0) AS total_out,
  i.opening_qty + COALESCE(sin.total_in, 0) - COALESCE(sout.total_out, 0) AS current_balance,
  i.min_stock_level, i.reorder_level, i.purchase_price, i.selling_price,
  (i.opening_qty + COALESCE(sin.total_in, 0) - COALESCE(sout.total_out, 0)) * i.purchase_price AS stock_value,
  CASE
    WHEN (i.opening_qty + COALESCE(sin.total_in, 0) - COALESCE(sout.total_out, 0)) = 0 THEN 'OUT_OF_STOCK'
    WHEN (i.opening_qty + COALESCE(sin.total_in, 0) - COALESCE(sout.total_out, 0)) <= i.min_stock_level THEN 'NEEDS_REORDER'
    WHEN (i.opening_qty + COALESCE(sin.total_in, 0) - COALESCE(sout.total_out, 0)) <= i.reorder_level THEN 'LOW'
    ELSE 'AVAILABLE'
  END AS status,
  i.location, i.status AS item_status
FROM items i
LEFT JOIN (SELECT item_id, SUM(quantity) AS total_in  FROM stock_in_movements  GROUP BY item_id) sin  ON sin.item_id  = i.id
LEFT JOIN (SELECT item_id, SUM(quantity) AS total_out FROM stock_out_movements GROUP BY item_id) sout ON sout.item_id = i.id
WHERE i.status = 'ACTIVE';

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

-- ============================================================
-- 22. JWT HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', TRUE)::jsonb ->> 'tenant_id', '');
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', TRUE)::jsonb ->> 'user_role', '');
$$;

-- ============================================================
-- 23. RLS POLICIES
-- ============================================================

-- Tenants
DROP POLICY IF EXISTS "sa_full_tenants"  ON tenants;
DROP POLICY IF EXISTS "tenant_read_own"  ON tenants;
CREATE POLICY "sa_full_tenants" ON tenants FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin');
CREATE POLICY "tenant_read_own" ON tenants FOR SELECT TO authenticated
  USING (id::text = get_current_tenant_id());

-- User profiles
DROP POLICY IF EXISTS "sa_full_profiles"            ON user_profiles;
DROP POLICY IF EXISTS "tenant_admin_manage_users"   ON user_profiles;
DROP POLICY IF EXISTS "user_read_own_profile"       ON user_profiles;
CREATE POLICY "sa_full_profiles" ON user_profiles FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin');
CREATE POLICY "tenant_admin_manage_users" ON user_profiles FOR ALL TO authenticated
  USING (tenant_id::text = get_current_tenant_id() AND get_current_user_role() = 'tenant_admin');
CREATE POLICY "user_read_own_profile" ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Data tables — tenant isolation macro
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'suppliers','items','stock_in_movements','stock_out_movements',
    'purchase_invoices','sales_orders','coupons','return_orders',
    'appointments','store_settings'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "ti_%1$s_sel" ON %1$s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "ti_%1$s_ins" ON %1$s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "ti_%1$s_upd" ON %1$s', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "ti_%1$s_del" ON %1$s', tbl);
    EXECUTE format($p$
      CREATE POLICY "ti_%1$s_sel" ON %1$s FOR SELECT TO authenticated
        USING (tenant_id::text = get_current_tenant_id() OR get_current_user_role() = 'super_admin');
      CREATE POLICY "ti_%1$s_ins" ON %1$s FOR INSERT TO authenticated
        WITH CHECK (tenant_id::text = get_current_tenant_id());
      CREATE POLICY "ti_%1$s_upd" ON %1$s FOR UPDATE TO authenticated
        USING (tenant_id::text = get_current_tenant_id())
        WITH CHECK (tenant_id::text = get_current_tenant_id());
      CREATE POLICY "ti_%1$s_del" ON %1$s FOR DELETE TO authenticated
        USING (tenant_id::text = get_current_tenant_id() OR get_current_user_role() = 'super_admin');
    $p$, tbl);
  END LOOP;
END;
$$;

-- Order counters (service role only)
DROP POLICY IF EXISTS "order_counters_srole" ON order_counters;
CREATE POLICY "order_counters_srole" ON order_counters FOR ALL TO service_role USING (true);

-- Registration requests
DROP POLICY IF EXISTS "sa_full_reg_requests"     ON registration_requests;
DROP POLICY IF EXISTS "public_insert_reg_request" ON registration_requests;
CREATE POLICY "sa_full_reg_requests" ON registration_requests FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin');
CREATE POLICY "public_insert_reg_request" ON registration_requests FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

-- Subscription payments
DROP POLICY IF EXISTS "tenant_own_payments"  ON subscription_payments;
DROP POLICY IF EXISTS "tenant_insert_payments" ON subscription_payments;
DROP POLICY IF EXISTS "sa_review_payments"   ON subscription_payments;
CREATE POLICY "tenant_own_payments" ON subscription_payments FOR SELECT TO authenticated
  USING (tenant_id::text = get_current_tenant_id() OR get_current_user_role() = 'super_admin');
CREATE POLICY "tenant_insert_payments" ON subscription_payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id::text = get_current_tenant_id());
CREATE POLICY "sa_review_payments" ON subscription_payments FOR UPDATE TO authenticated
  USING (get_current_user_role() = 'super_admin');

-- ============================================================
-- 24. TENANT_ID DEFAULTS (auto-set from JWT)
-- ============================================================
ALTER TABLE suppliers          ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;
ALTER TABLE items              ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;
ALTER TABLE stock_in_movements ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;
ALTER TABLE stock_out_movements ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;
ALTER TABLE purchase_invoices  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;
ALTER TABLE sales_orders       ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;
ALTER TABLE coupons            ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;
ALTER TABLE return_orders      ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;
ALTER TABLE appointments       ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- ============================================================
-- 25. PLAN LIMIT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_item_limit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_max int; v_count int; v_tid uuid;
BEGIN
  v_tid := COALESCE(NEW.tenant_id, (get_current_tenant_id())::uuid);
  SELECT max_items INTO v_max FROM tenants WHERE id = v_tid;
  IF v_max IS NULL OR v_max = 0 THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count FROM items WHERE tenant_id = v_tid;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'تجاوزت الحد الأقصى لعدد الأصناف في خطتك (%). يرجى الترقية لخطة أعلى.', v_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_item_limit ON items;
CREATE TRIGGER trg_enforce_item_limit BEFORE INSERT ON items
  FOR EACH ROW EXECUTE FUNCTION enforce_item_limit();

CREATE OR REPLACE FUNCTION enforce_order_limit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_max int; v_count int; v_tid uuid;
BEGIN
  v_tid := COALESCE(NEW.tenant_id, (get_current_tenant_id())::uuid);
  SELECT max_orders_per_month INTO v_max FROM tenants WHERE id = v_tid;
  IF v_max IS NULL OR v_max = 0 THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count FROM sales_orders
    WHERE tenant_id = v_tid AND created_at >= date_trunc('month', now());
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'تجاوزت الحد الأقصى لعدد الطلبات هذا الشهر (%). يرجى الترقية لخطة أعلى.', v_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_order_limit ON sales_orders;
CREATE TRIGGER trg_enforce_order_limit BEFORE INSERT ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION enforce_order_limit();

-- ============================================================
-- 26. ATOMIC RPC FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION place_sales_order(p_order jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_order_id  uuid;
  v_order_num text;
  v_tenant_id uuid;
  v_item      jsonb;
  v_result    jsonb;
BEGIN
  v_tenant_id := (get_current_tenant_id())::uuid;
  SELECT next_order_number(v_tenant_id, 'SO', EXTRACT(YEAR FROM now())::int) INTO v_order_num;
  INSERT INTO sales_orders (
    tenant_id, order_number, customer_name, customer_phone, customer_city,
    delivery_type, items, shipping_cost, shipping_on_store, subtotal,
    discount_amount, discount_type, discount_value, coupon_code,
    customer_total, total_cogs, gross_profit, net_profit, profit_margin,
    vat_rate, vat_amount, status, tracking_number, shipping_carrier, notes,
    customer_payment_status, customer_paid_amount, customer_payments, shipped_at
  ) VALUES (
    v_tenant_id, v_order_num,
    p_order->>'customerName', p_order->>'customerPhone', p_order->>'customerCity',
    COALESCE(p_order->>'deliveryType','home'),
    COALESCE(p_order->'items','[]'::jsonb),
    COALESCE((p_order->>'shippingCost')::numeric,0),
    COALESCE((p_order->>'shippingOnStore')::boolean,false),
    COALESCE((p_order->>'subtotalProducts')::numeric,0),
    COALESCE((p_order->>'discountAmount')::numeric,0),
    NULLIF(p_order->>'discountType',''),
    (p_order->>'discountValue')::numeric,
    NULLIF(p_order->>'couponCode',''),
    COALESCE((p_order->>'customerTotal')::numeric,0),
    COALESCE((p_order->>'totalCOGS')::numeric,0),
    COALESCE((p_order->>'grossProfit')::numeric,0),
    COALESCE((p_order->>'netProfit')::numeric,0),
    COALESCE((p_order->>'profitMargin')::numeric,0),
    (p_order->>'vatRate')::numeric,
    (p_order->>'vatAmount')::numeric,
    COALESCE(NULLIF(p_order->>'status',''),'PENDING'),
    NULLIF(p_order->>'trackingNumber',''),
    NULLIF(p_order->>'shippingCarrier',''),
    COALESCE(p_order->>'notes',''),
    NULLIF(p_order->>'customerPaymentStatus',''),
    (p_order->>'customerPaidAmount')::numeric,
    COALESCE(p_order->'customerPayments','[]'::jsonb),
    (p_order->>'shippedAt')::timestamptz
  ) RETURNING id INTO v_order_id;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_order->'items') LOOP
    INSERT INTO stock_out_movements (
      tenant_id, date, item_id, recipient_dept, quantity, unit_price,
      reason, responsible_employee, notes
    ) VALUES (
      v_tenant_id, CURRENT_DATE,
      (v_item->>'itemId')::uuid, p_order->>'customerName',
      (v_item->>'quantity')::numeric, (v_item->>'sellingPrice')::numeric,
      'بيع', 'نظام المبيعات', 'طلب مبيعات ' || v_order_num
    );
  END LOOP;
  SELECT row_to_json(so)::jsonb INTO v_result FROM sales_orders so WHERE id = v_order_id;
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION place_sales_order(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION receive_purchase_invoice(
  p_invoice_id uuid, p_computed_items jsonb,
  p_invoice_number text, p_supplier_id text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_tenant_id uuid; v_item jsonb; v_result jsonb; v_sup_id uuid;
BEGIN
  v_tenant_id := (get_current_tenant_id())::uuid;
  IF NOT EXISTS (
    SELECT 1 FROM purchase_invoices
    WHERE id = p_invoice_id AND tenant_id = v_tenant_id AND status <> 'RECEIVED'
  ) THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة أو تم استلامها مسبقاً';
  END IF;
  v_sup_id := NULLIF(p_supplier_id,'')::uuid;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_computed_items) LOOP
    INSERT INTO stock_in_movements (
      tenant_id, date, invoice_no, item_id, supplier_id,
      quantity, unit_price, responsible_employee, notes
    ) VALUES (
      v_tenant_id, CURRENT_DATE, p_invoice_number,
      (v_item->>'itemId')::uuid, v_sup_id,
      (v_item->>'quantity')::numeric, (v_item->>'totalUnitCost')::numeric,
      'نظام المشتريات',
      'فاتورة ' || p_invoice_number || ' — ' || round((v_item->>'totalUnitCost')::numeric,2)
    );
    UPDATE items SET moving_average_cost = (v_item->>'newMAC')::numeric
      WHERE id = (v_item->>'itemId')::uuid AND tenant_id = v_tenant_id;
  END LOOP;
  UPDATE purchase_invoices
    SET status='RECEIVED', received_at=now(), items=p_computed_items
    WHERE id=p_invoice_id AND tenant_id=v_tenant_id;
  SELECT row_to_json(pi)::jsonb INTO v_result FROM purchase_invoices pi WHERE id=p_invoice_id;
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION receive_purchase_invoice(uuid,jsonb,text,text) TO authenticated;

-- ============================================================
-- 27. CUSTOM ACCESS TOKEN HOOK (JWT injection)
-- ============================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  profile_rec RECORD;
  claims      JSONB;
BEGIN
  SELECT up.tenant_id, up.role, t.slug AS tenant_slug
  INTO   profile_rec
  FROM   user_profiles up
  LEFT   JOIN tenants t ON t.id = up.tenant_id
  WHERE  up.id = (event ->> 'user_id')::UUID;

  claims := event -> 'claims';
  IF profile_rec.tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}',   to_jsonb(profile_rec.tenant_id::TEXT));
    claims := jsonb_set(claims, '{tenant_slug}', to_jsonb(profile_rec.tenant_slug::TEXT));
  END IF;
  IF profile_rec.role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(profile_rec.role::TEXT));
  END IF;
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;

-- ============================================================
SELECT 'Migration complete ✓' AS status,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables_count;
