-- ============================================
-- Inventory Management System 2026
-- Supabase Migration - Updated to Match Code
-- ============================================

-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUMS
-- ============================================
CREATE TYPE item_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'UNDER_REVIEW');
CREATE TYPE stock_status_enum AS ENUM ('OUT_OF_STOCK', 'NEEDS_REORDER', 'LOW', 'AVAILABLE');

-- 3. SUPPLIERS TABLE
-- ============================================
CREATE TABLE suppliers (
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
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- 4. ITEMS TABLE
-- ============================================
CREATE TABLE items (
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
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_code ON items(code);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_supplier ON items(supplier_id);
CREATE INDEX idx_items_name_search ON items USING gin (name gin_trgm_ops);

-- 5. STOCK IN MOVEMENTS
-- ============================================
CREATE TABLE stock_in_movements (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_code          VARCHAR(20) UNIQUE NOT NULL,
  date                    DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_no              VARCHAR(50),
  item_id                 UUID NOT NULL REFERENCES items(id),
  supplier_id             UUID NOT NULL REFERENCES suppliers(id),
  quantity                DECIMAL(15, 3) NOT NULL CHECK (quantity > 0),
  unit_price              DECIMAL(15, 2) NOT NULL,
  total_cost              DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  responsible_employee    VARCHAR(100) NOT NULL,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  created_by              UUID
);

CREATE INDEX idx_stockin_date ON stock_in_movements(date DESC);
CREATE INDEX idx_stockin_item ON stock_in_movements(item_id);
CREATE INDEX idx_stockin_supplier ON stock_in_movements(supplier_id);

-- 6. STOCK OUT MOVEMENTS
-- ============================================
CREATE TABLE stock_out_movements (
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
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  created_by              UUID
);

CREATE INDEX idx_stockout_date ON stock_out_movements(date DESC);
CREATE INDEX idx_stockout_item ON stock_out_movements(item_id);
CREATE INDEX idx_stockout_reason ON stock_out_movements(reason);

-- ============================================
-- 7. AUTO-NUMBERING SEQUENCES & TRIGGERS
-- ============================================
CREATE SEQUENCE stock_in_seq START 1;
CREATE SEQUENCE stock_out_seq START 1;

CREATE OR REPLACE FUNCTION generate_stock_in_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.operation_code IS NULL OR NEW.operation_code = '' THEN
    NEW.operation_code := 'IN' || LPAD(nextval('stock_in_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trg_stock_out_code
BEFORE INSERT ON stock_out_movements
FOR EACH ROW EXECUTE FUNCTION generate_stock_out_code();

-- ============================================
-- 8. CRITICAL: Prevent Negative Stock
-- ============================================
CREATE OR REPLACE FUNCTION check_stock_availability() RETURNS TRIGGER AS $$
DECLARE
  current_balance DECIMAL;
  item_opening DECIMAL;
  total_in DECIMAL;
  total_out DECIMAL;
BEGIN
  SELECT opening_qty INTO item_opening FROM items WHERE id = NEW.item_id;

  SELECT COALESCE(SUM(quantity), 0) INTO total_in
  FROM stock_in_movements WHERE item_id = NEW.item_id;

  SELECT COALESCE(SUM(quantity), 0) INTO total_out
  FROM stock_out_movements WHERE item_id = NEW.item_id;

  current_balance := item_opening + total_in - total_out;

  IF NEW.quantity > current_balance THEN
    RAISE EXCEPTION 'الرصيد غير كافٍ. المتاح: %, المطلوب: %', current_balance, NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_stock_availability
BEFORE INSERT ON stock_out_movements
FOR EACH ROW EXECUTE FUNCTION check_stock_availability();

-- ============================================
-- 9. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_modified_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_items_updated BEFORE UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================
-- 10. CURRENT STOCK VIEW (Real-time)
-- ============================================
CREATE OR REPLACE VIEW current_stock_view AS
SELECT
  i.id AS item_id,
  i.code AS item_code,
  i.name AS item_name,
  i.category,
  i.unit,
  i.opening_qty,
  COALESCE(stock_in.total_in, 0) AS total_in,
  COALESCE(stock_out.total_out, 0) AS total_out,
  i.opening_qty + COALESCE(stock_in.total_in, 0) - COALESCE(stock_out.total_out, 0) AS current_balance,
  i.min_stock_level,
  i.reorder_level,
  i.purchase_price,
  i.selling_price,
  (i.opening_qty + COALESCE(stock_in.total_in, 0) - COALESCE(stock_out.total_out, 0)) * i.purchase_price AS stock_value,
  CASE
    WHEN (i.opening_qty + COALESCE(stock_in.total_in, 0) - COALESCE(stock_out.total_out, 0)) = 0 THEN 'OUT_OF_STOCK'
    WHEN (i.opening_qty + COALESCE(stock_in.total_in, 0) - COALESCE(stock_out.total_out, 0)) <= i.min_stock_level THEN 'NEEDS_REORDER'
    WHEN (i.opening_qty + COALESCE(stock_in.total_in, 0) - COALESCE(stock_out.total_out, 0)) <= i.reorder_level THEN 'LOW'
    ELSE 'AVAILABLE'
  END AS status,
  i.location,
  i.status AS item_status
FROM items i
LEFT JOIN (
  SELECT item_id, SUM(quantity) AS total_in
  FROM stock_in_movements
  GROUP BY item_id
) stock_in ON stock_in.item_id = i.id
LEFT JOIN (
  SELECT item_id, SUM(quantity) AS total_out
  FROM stock_out_movements
  GROUP BY item_id
) stock_out ON stock_out.item_id = i.id
WHERE i.status = 'ACTIVE';

-- ============================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_out_movements ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users (refine later)
CREATE POLICY "Auth users full access on suppliers"
ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users full access on items"
ON items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users full access on stock_in"
ON stock_in_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users full access on stock_out"
ON stock_out_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 12. SEED DATA - مطابق لـ Excel الأصلي
-- ============================================
INSERT INTO suppliers (code, name, product_type, phone, email, address, contact_person, payment_terms, rating) VALUES
('SUP001', 'شركة النور للتوريدات', 'إلكترونيات وأجهزة', '0501234567', 'alnour@email.com', 'الرياض - شارع الملك فهد', 'محمد الحارثي', 30, 5),
('SUP002', 'مؤسسة الخليج التجارية', 'مستلزمات مكتبية', '0557654321', 'gulf@email.com', 'جدة - حي البلد', 'سعد العمري', 0, 4),
('SUP003', 'شركة الأمل للاستيراد', 'أثاث ومفروشات', '0509876543', 'alamal@email.com', 'الدمام - المنطقة الصناعية', 'نورة السالم', 15, 4),
('SUP004', 'مصنع القمة الصناعي', 'مواد خام', '0531122334', 'qimma@email.com', 'الرياض - المدينة الصناعية', 'خالد المطيري', 45, 3),
('SUP005', 'شركة الرائد للتجارة', 'أجهزة كهربائية', '0566778899', 'alraed@email.com', 'مكة المكرمة - الزاهر', 'عبدالله الغامدي', 30, 5);

-- Insert items (using a CTE to map supplier codes to IDs)
WITH sup AS (SELECT id, code FROM suppliers)
INSERT INTO items (code, name, category, unit, supplier_id, purchase_price, selling_price, opening_qty, min_stock_level, reorder_level, location, status)
SELECT * FROM (VALUES
  ('ITM001', 'Dell i7 لاب توب', 'إلكترونيات', 'قطعة', (SELECT id FROM sup WHERE code = 'SUP001'), 3500.0, 4200.0, 10, 3, 5, 'مستودع A', 'ACTIVE'::item_status_enum),
  ('ITM002', 'HP LaserJet طابعة', 'إلكترونيات', 'قطعة', (SELECT id FROM sup WHERE code = 'SUP001'), 1200.0, 1500.0, 5, 2, 3, 'مستودع A', 'ACTIVE'::item_status_enum),
  ('ITM003', 'A4 ورق (رزمة)', 'مستلزمات مكتبية', 'كرتون', (SELECT id FROM sup WHERE code = 'SUP002'), 45.0, 60.0, 100, 20, 40, 'الرف 1', 'ACTIVE'::item_status_enum),
  ('ITM004', 'كرسي مكتبي', 'أثاث', 'قطعة', (SELECT id FROM sup WHERE code = 'SUP003'), 350.0, 500.0, 20, 5, 8, 'المستودع الرئيسي', 'ACTIVE'::item_status_enum),
  ('ITM005', 'مكيف سبليت 1.5 طن', 'أجهزة كهربائية', 'قطعة', (SELECT id FROM sup WHERE code = 'SUP005'), 2800.0, 3500.0, 8, 2, 4, 'مستودع B', 'ACTIVE'::item_status_enum),
  ('ITM006', 'قلم جاف (علبة)', 'مستلزمات مكتبية', 'صندوق', (SELECT id FROM sup WHERE code = 'SUP002'), 15.0, 25.0, 50, 10, 20, 'الرف 2', 'ACTIVE'::item_status_enum),
  ('ITM007', 'جهاز بروجكتر', 'إلكترونيات', 'قطعة', (SELECT id FROM sup WHERE code = 'SUP001'), 1800.0, 2200.0, 3, 1, 2, 'مستودع A', 'ACTIVE'::item_status_enum),
  ('ITM008', 'خزانة ملفات', 'أثاث', 'قطعة', (SELECT id FROM sup WHERE code = 'SUP003'), 400.0, 580.0, 12, 3, 5, 'المستودع الرئيسي', 'ACTIVE'::item_status_enum),
  ('ITM009', 'ماوس لاسلكي', 'إلكترونيات', 'قطعة', (SELECT id FROM sup WHERE code = 'SUP001'), 85.0, 130.0, 30, 10, 15, 'الرف 1', 'ACTIVE'::item_status_enum),
  ('ITM010', 'حبر طابعة (طقم)', 'مستلزمات مكتبية', 'قطعة', (SELECT id FROM sup WHERE code = 'SUP002'), 120.0, 170.0, 25, 8, 12, 'الرف 2', 'ACTIVE'::item_status_enum)
) AS data(code, name, category, unit, supplier_id, purchase_price, selling_price, opening_qty, min_stock_level, reorder_level, location, status);

-- ============================================
-- DONE! Migration complete
-- ============================================
SELECT 'Migration successful ✓' AS status,
       (SELECT COUNT(*) FROM suppliers) AS suppliers_count,
       (SELECT COUNT(*) FROM items) AS items_count;
