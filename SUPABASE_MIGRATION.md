# دليل الترحيل إلى Supabase

## نظرة عامة

هذا الدليل يشرح كيفية ترحيل نظام المخازن 2026 من Supabase (الحالة الراهنة) إلى أي بنية أخرى، أو كيفية استبدال طبقة التخزين كلياً. يعتمد النظام على **نمط Storage Adapter** الموثق في `lib/storage/storageAdapter.ts`.

---

## البنية الحالية

```
lib/
├── services/              ← طبقة الخدمات (Supabase)
│   ├── itemsService.ts
│   ├── suppliersService.ts
│   ├── stockInService.ts
│   ├── stockOutService.ts
│   └── currentStockService.ts
├── storage/
│   ├── storageAdapter.ts  ← الواجهة (Interface)
│   └── mockStorage.ts     ← التنفيذ بـ localStorage
├── supabase/
│   ├── client.ts          ← Supabase browser client
│   ├── server.ts          ← Supabase server client (SSR)
│   └── database.types.ts  ← أنواع TypeScript المولّدة
└── StockContext.tsx        ← React Context يستخدم الخدمات
```

---

## مخطط قاعدة البيانات (Supabase)

### جدول `suppliers`

```sql
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  product_type  TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  contact_person TEXT,
  payment_terms INTEGER DEFAULT 30,
  rating        INTEGER DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  is_active     BOOLEAN DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### جدول `items`

```sql
CREATE TABLE items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  unit            TEXT NOT NULL,
  supplier_id     UUID REFERENCES suppliers(id),
  purchase_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  opening_qty     INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 0,
  reorder_level   INTEGER NOT NULL DEFAULT 0,
  location        TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','UNDER_REVIEW')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### جدول `stock_in_movements`

```sql
CREATE TABLE stock_in_movements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_code       TEXT UNIQUE,
  date                 DATE NOT NULL,
  invoice_no           TEXT NOT NULL,
  item_id              UUID NOT NULL REFERENCES items(id),
  supplier_id          UUID NOT NULL REFERENCES suppliers(id),
  quantity             INTEGER NOT NULL CHECK (quantity > 0),
  unit_price           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost           NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  responsible_employee TEXT NOT NULL,
  notes                TEXT,
  created_by           UUID,
  created_at           TIMESTAMPTZ DEFAULT now()
);
```

### جدول `stock_out_movements`

```sql
CREATE TABLE stock_out_movements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_code       TEXT UNIQUE,
  date                 DATE NOT NULL,
  item_id              UUID NOT NULL REFERENCES items(id),
  recipient_dept       TEXT NOT NULL,
  quantity             INTEGER NOT NULL CHECK (quantity > 0),
  unit_price           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_value          NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  reason               TEXT NOT NULL,
  responsible_employee TEXT NOT NULL,
  notes                TEXT,
  created_by           UUID,
  created_at           TIMESTAMPTZ DEFAULT now()
);
```

### View `current_stock_view`

```sql
CREATE OR REPLACE VIEW current_stock_view AS
SELECT
  i.id           AS item_id,
  i.code         AS item_code,
  i.name         AS item_name,
  i.category,
  i.unit,
  i.opening_qty,
  COALESCE(SUM(si.quantity), 0)                         AS total_in,
  COALESCE(SUM(so.quantity), 0)                         AS total_out,
  i.opening_qty
    + COALESCE(SUM(si.quantity), 0)
    - COALESCE(SUM(so.quantity), 0)                     AS current_balance,
  i.min_stock_level,
  i.reorder_level,
  CASE
    WHEN (i.opening_qty + COALESCE(SUM(si.quantity),0) - COALESCE(SUM(so.quantity),0)) <= 0
      THEN 'OUT_OF_STOCK'
    WHEN (i.opening_qty + COALESCE(SUM(si.quantity),0) - COALESCE(SUM(so.quantity),0)) <= i.min_stock_level
      THEN 'NEEDS_REORDER'
    WHEN (i.opening_qty + COALESCE(SUM(si.quantity),0) - COALESCE(SUM(so.quantity),0)) <= i.reorder_level
      THEN 'LOW'
    ELSE 'AVAILABLE'
  END                                                   AS status,
  (i.opening_qty
    + COALESCE(SUM(si.quantity), 0)
    - COALESCE(SUM(so.quantity), 0)) * i.purchase_price AS stock_value
FROM items i
LEFT JOIN stock_in_movements  si ON si.item_id = i.id
LEFT JOIN stock_out_movements so ON so.item_id = i.id
GROUP BY i.id;
```

### Trigger: منع الرصيد السالب

```sql
CREATE OR REPLACE FUNCTION check_stock_before_out()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  available_qty INTEGER;
BEGIN
  SELECT current_balance INTO available_qty
  FROM   current_stock_view
  WHERE  item_id = NEW.item_id;

  IF available_qty IS NULL OR available_qty < NEW.quantity THEN
    RAISE EXCEPTION 'الرصيد غير كافٍ. المتاح: %, المطلوب: %', COALESCE(available_qty, 0), NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_stock_before_out
  BEFORE INSERT ON stock_out_movements
  FOR EACH ROW EXECUTE FUNCTION check_stock_before_out();
```

### Trigger: توليد رقم العملية تلقائياً

```sql
CREATE OR REPLACE FUNCTION generate_operation_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'stock_in_movements' THEN
    prefix := 'IN';
    SELECT COUNT(*) + 1 INTO next_num FROM stock_in_movements;
  ELSE
    prefix := 'OUT';
    SELECT COUNT(*) + 1 INTO next_num FROM stock_out_movements;
  END IF;

  NEW.operation_code := prefix || '-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gen_in_code  BEFORE INSERT ON stock_in_movements  FOR EACH ROW EXECUTE FUNCTION generate_operation_code();
CREATE TRIGGER trg_gen_out_code BEFORE INSERT ON stock_out_movements FOR EACH ROW EXECUTE FUNCTION generate_operation_code();
```

---

## Row-Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in_movements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_out_movements   ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read/write
CREATE POLICY "authenticated_access" ON suppliers
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Repeat for other tables...
```

---

## متغيرات البيئة المطلوبة

أنشئ ملف `.env.local` في جذر المشروع:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

للحصول على هذه القيم: **Supabase Dashboard → Project Settings → API**.

---

## خطوات الترحيل من localStorage إلى Supabase

النظام يستخدم Supabase **حالياً** عبر `lib/services/`. إذا أردت العودة لـ localStorage أو الاختبار بدون Supabase:

### 1. تشغيل وضع Mock (localStorage)

افتح `lib/StockContext.tsx` واستبدل:

```typescript
// الحالي:
import { itemsService }    from '@/lib/services/itemsService';
import { suppliersService } from '@/lib/services/suppliersService';
// ...

// البديل (mock):
import { mockStorageAdapter } from '@/lib/storage/mockStorage';
const itemsService    = mockStorageAdapter.items;
const suppliersService = mockStorageAdapter.suppliers;
const stockInService  = mockStorageAdapter.stockIn;
const stockOutService = mockStorageAdapter.stockOut;
const currentStockService = mockStorageAdapter.currentStock;
```

### 2. تهيئة بيانات أولية في localStorage

```typescript
// في _app.tsx أو layout.tsx (مرة واحدة عند أول تشغيل)
import { mockStorageAdapter } from '@/lib/storage/mockStorage';
// استيراد البيانات التجريبية وإدخالها عبر mockStorageAdapter.items.create(...)
```

### 3. تصدير البيانات من localStorage إلى Supabase

```typescript
// سكريبت ترحيل:
const items = JSON.parse(localStorage.getItem('mock_items') ?? '[]');
for (const item of items) {
  await supabase.from('items').insert({ /* map camelCase → snake_case */ });
}
```

---

## أسئلة شائعة

**لماذا نمط delete+create بدلاً من UPDATE للحركات؟**
تعتمد `current_stock_view` على مجموع INSERT/DELETE للحركات. إذا عدّلنا حركة بـ UPDATE مباشرة، لن يُعاد حساب الرصيد تلقائياً لأن الـ trigger يعمل على INSERT/DELETE فقط. الحل: حذف الحركة القديمة (يُفعّل trigger حذف) ثم إنشاء جديدة (يُفعّل trigger إدراج).

**كيف أُولّد أنواع TypeScript من Supabase؟**
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
```
ثم أضف يدوياً `Relationships: []` لكل جدول و `Functions/Enums/CompositeTypes: Record<string, never>` في نهاية الـ schema (مطلوب لتجنب خطأ `never[]`).

**ما الفرق بين `client.ts` و `server.ts`؟**
- `client.ts`: يُستخدم في مكونات `'use client'` (المتصفح). يعتمد على `createClient` من `@supabase/supabase-js`.
- `server.ts`: يُستخدم في Server Components وRoute Handlers. يعتمد على `createServerClient` من `@supabase/ssr` ويمرر cookies.
