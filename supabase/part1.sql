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

