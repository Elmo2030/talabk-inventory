-- ─────────────────────────────────────────────────────────────────────────────
-- Customers + Credit + A/R — Wave G #2
--
-- Until now Talabk treated customers as a derived concept: every
-- sales_orders row carries customer_name/phone/city, and /customers
-- aggregated those at read time. That works for retail walk-in flows but
-- blocks the wholesale/B2B use case where merchants need:
--
--   • A persistent customer record with credit terms
--   • A running outstanding balance (A/R)
--   • A hard credit-limit check at order placement
--
-- This migration:
--   1. Creates `customers` as a real table (tenant-scoped)
--   2. Adds `sales_orders.customer_id` as a nullable FK so walk-ins stay
--      possible and existing rows keep working
--   3. Builds `vw_customer_balance` — outstanding per customer, derived
--      from sales_orders (no denormalized counter that could drift)
--   4. Extends `place_sales_order` with a credit-limit check when a
--      customer_id is supplied
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. customers table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  -- retail / wholesale / vip — used later by Wave G #3 to auto-pick a tier.
  customer_type   TEXT NOT NULL DEFAULT 'retail'
                    CHECK (customer_type IN ('retail', 'wholesale', 'vip')),
  -- Credit cap in tenant's primary currency (د.ل). 0 = cash-only.
  credit_limit    NUMERIC(12, 2) NOT NULL DEFAULT 0
                    CHECK (credit_limit >= 0),
  -- Opening balance: pre-existing A/R brought in when the customer is
  -- onboarded. Added to vw_customer_balance.outstanding.
  opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- code unique per tenant. phone unique-when-present per tenant so the
  -- sales-rep flow can pick a customer by phone without ambiguity.
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_status
  ON customers (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone
  ON customers (tenant_id, phone)
  WHERE phone IS NOT NULL;

-- Same DEFAULT trick as other tables in 20260519.
ALTER TABLE customers
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- updated_at trigger uses the function created in 20260528.
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sa_full_customers" ON customers;
CREATE POLICY "sa_full_customers" ON customers
  FOR ALL TO authenticated
  USING ((SELECT get_current_user_role()) = 'super_admin')
  WITH CHECK (
    (SELECT get_current_user_role()) = 'super_admin'
    AND tenant_id IS NOT NULL
  );

DROP POLICY IF EXISTS "tenant_isolation_customers_select" ON customers;
CREATE POLICY "tenant_isolation_customers_select" ON customers
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    OR (SELECT get_current_user_role()) = 'super_admin'
  );

DROP POLICY IF EXISTS "tenant_isolation_customers_insert" ON customers;
CREATE POLICY "tenant_isolation_customers_insert" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

DROP POLICY IF EXISTS "tenant_isolation_customers_update" ON customers;
CREATE POLICY "tenant_isolation_customers_update" ON customers
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_current_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

DROP POLICY IF EXISTS "tenant_isolation_customers_delete" ON customers;
CREATE POLICY "tenant_isolation_customers_delete" ON customers
  FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    OR (SELECT get_current_user_role()) = 'super_admin'
  );

-- ── 3. sales_orders.customer_id ─────────────────────────────────────────────
-- Nullable so walk-in sales without a registered customer keep working.
-- ON DELETE SET NULL preserves historic attribution if a customer is purged.
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS customer_id UUID
    REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_created
  ON sales_orders (customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

-- ── 4. Balance view ─────────────────────────────────────────────────────────
-- One row per registered customer with their running outstanding.
-- Derived from sales_orders to avoid the denormalized-counter drift class
-- of bugs. For the order volumes we target (hundreds per customer per
-- year) the aggregate is comfortably fast under the composite index.
--
-- outstanding = opening_balance
--             + Σ (customer_total) for non-cancelled orders
--             − Σ (customer_paid_amount)
DROP VIEW IF EXISTS vw_customer_balance CASCADE;
CREATE VIEW vw_customer_balance
  WITH (security_invoker = on, security_barrier = on) AS
SELECT
  c.id                                  AS customer_id,
  c.tenant_id,
  c.code,
  c.name,
  c.credit_limit,
  c.opening_balance,
  COALESCE(s.total_invoiced, 0)         AS total_invoiced,
  COALESCE(s.total_paid, 0)             AS total_paid,
  c.opening_balance
    + COALESCE(s.total_invoiced, 0)
    - COALESCE(s.total_paid, 0)         AS outstanding,
  s.last_order_at
FROM customers c
LEFT JOIN LATERAL (
  SELECT
    SUM(so.customer_total)                            AS total_invoiced,
    SUM(COALESCE(so.customer_paid_amount, 0))         AS total_paid,
    MAX(so.created_at)                                AS last_order_at
  FROM sales_orders so
  WHERE so.customer_id = c.id
    AND so.status <> 'CANCELLED'
) s ON true;

GRANT SELECT ON vw_customer_balance TO authenticated;

-- ── 5. Credit check helper (used by RPC, callable from app for previews) ──
CREATE OR REPLACE FUNCTION get_customer_outstanding(p_customer_id uuid)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
DECLARE
  v_out NUMERIC;
BEGIN
  SELECT outstanding INTO v_out FROM vw_customer_balance
   WHERE customer_id = p_customer_id;
  RETURN COALESCE(v_out, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_customer_outstanding(uuid) TO authenticated;

-- ── 6. Extend place_sales_order with credit check ──────────────────────────
-- Replaces the version from 20260528 (which added rep_id). When
-- p_order->>'customerId' is present and non-empty we look up the customer,
-- check it belongs to this tenant, and raise if (outstanding + new total)
-- exceeds credit_limit. Customers with credit_limit = 0 are cash-only and
-- any non-prepaid order triggers the cap.
CREATE OR REPLACE FUNCTION place_sales_order(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_order_id    uuid;
  v_order_num   text;
  v_tenant_id   uuid;
  v_item        jsonb;
  v_result      jsonb;
  v_item_id     uuid;
  v_qty         numeric;
  v_available   numeric;
  v_item_name   text;
  v_rep_id      uuid;
  v_customer_id uuid;
  v_credit_lim  numeric;
  v_outstanding numeric;
  v_new_total   numeric;
  v_paid        numeric;
  v_customer_nm text;
BEGIN
  v_tenant_id := get_current_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context';
  END IF;

  -- Sales rep (from 20260528)
  v_rep_id := NULLIF(p_order->>'repId', '')::uuid;
  IF v_rep_id IS NOT NULL THEN
    PERFORM 1 FROM sales_reps
     WHERE id = v_rep_id AND tenant_id = v_tenant_id AND status = 'ACTIVE';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sales rep % not found or inactive for this tenant', v_rep_id;
    END IF;
  END IF;

  -- Customer + credit gate. We FOR UPDATE the customers row so concurrent
  -- orders for the same customer serialize on the credit check.
  v_customer_id := NULLIF(p_order->>'customerId', '')::uuid;
  IF v_customer_id IS NOT NULL THEN
    SELECT credit_limit, name INTO v_credit_lim, v_customer_nm
      FROM customers
     WHERE id = v_customer_id
       AND tenant_id = v_tenant_id
       AND status = 'ACTIVE'
       FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer % not found or inactive for this tenant', v_customer_id;
    END IF;

    -- A credit_limit of 0 means cash-only — any unpaid balance from
    -- this order trips the cap. We compute "new outstanding" as
    -- (existing outstanding) + (this order's unpaid portion).
    v_new_total := COALESCE((p_order->>'customerTotal')::numeric, 0);
    v_paid      := COALESCE((p_order->>'customerPaidAmount')::numeric, 0);
    v_outstanding := get_customer_outstanding(v_customer_id);

    IF v_outstanding + (v_new_total - v_paid) > v_credit_lim THEN
      RAISE EXCEPTION
        'تجاوز الحد الائتماني للعميل "%": الحد %, المستحق %, الطلب الجديد %',
        v_customer_nm, v_credit_lim, v_outstanding, (v_new_total - v_paid);
    END IF;
  END IF;

  -- Stock check (unchanged)
  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_order->'items') x(value)
     ORDER BY (value->>'itemId')::uuid
  LOOP
    v_item_id := (v_item->>'itemId')::uuid;
    v_qty     := (v_item->>'quantity')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', v_item_id;
    END IF;

    SELECT name INTO v_item_name FROM items
      WHERE id = v_item_id AND tenant_id = v_tenant_id
      FOR UPDATE;
    IF v_item_name IS NULL THEN
      RAISE EXCEPTION 'Item % not found in this tenant', v_item_id;
    END IF;

    SELECT current_balance INTO v_available FROM current_stock_view
      WHERE item_id = v_item_id;
    IF COALESCE(v_available, 0) < v_qty THEN
      RAISE EXCEPTION 'الرصيد غير كافٍ للصنف "%": المتاح % والمطلوب %',
        v_item_name, COALESCE(v_available, 0), v_qty;
    END IF;
  END LOOP;

  SELECT next_order_number(v_tenant_id, 'SO', EXTRACT(YEAR FROM now())::int)
    INTO v_order_num;

  INSERT INTO sales_orders (
    tenant_id, order_number, customer_name, customer_phone, customer_city,
    delivery_type, items, shipping_cost, shipping_on_store, subtotal,
    discount_amount, discount_type, discount_value, coupon_code,
    customer_total, total_cogs, gross_profit, net_profit, profit_margin,
    vat_rate, vat_amount, status, tracking_number, shipping_carrier, notes,
    customer_payment_status, customer_paid_amount, customer_payments, shipped_at,
    rep_id, customer_id
  ) VALUES (
    v_tenant_id, v_order_num,
    p_order->>'customerName', p_order->>'customerPhone', p_order->>'customerCity',
    COALESCE(p_order->>'deliveryType', 'home'),
    COALESCE(p_order->'items', '[]'::jsonb),
    COALESCE((p_order->>'shippingCost')::numeric, 0),
    COALESCE((p_order->>'shippingOnStore')::boolean, false),
    COALESCE((p_order->>'subtotalProducts')::numeric, 0),
    COALESCE((p_order->>'discountAmount')::numeric, 0),
    NULLIF(p_order->>'discountType', ''),
    (p_order->>'discountValue')::numeric,
    NULLIF(p_order->>'couponCode', ''),
    COALESCE((p_order->>'customerTotal')::numeric, 0),
    COALESCE((p_order->>'totalCOGS')::numeric, 0),
    COALESCE((p_order->>'grossProfit')::numeric, 0),
    COALESCE((p_order->>'netProfit')::numeric, 0),
    COALESCE((p_order->>'profitMargin')::numeric, 0),
    (p_order->>'vatRate')::numeric,
    (p_order->>'vatAmount')::numeric,
    COALESCE(NULLIF(p_order->>'status', ''), 'PENDING'),
    NULLIF(p_order->>'trackingNumber', ''),
    NULLIF(p_order->>'shippingCarrier', ''),
    COALESCE(p_order->>'notes', ''),
    NULLIF(p_order->>'customerPaymentStatus', ''),
    (p_order->>'customerPaidAmount')::numeric,
    COALESCE(p_order->'customerPayments', '[]'::jsonb),
    (p_order->>'shippedAt')::timestamptz,
    v_rep_id,
    v_customer_id
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_order->'items') x(value)
     ORDER BY (value->>'itemId')::uuid
  LOOP
    INSERT INTO stock_out_movements (
      tenant_id, date, item_id, recipient_dept, quantity, unit_price,
      reason, responsible_employee, notes
    ) VALUES (
      v_tenant_id, CURRENT_DATE, (v_item->>'itemId')::uuid,
      p_order->>'customerName', (v_item->>'quantity')::numeric,
      (v_item->>'sellingPrice')::numeric, 'بيع',
      'نظام المبيعات', 'طلب مبيعات ' || v_order_num
    );
  END LOOP;

  SELECT row_to_json(so)::jsonb INTO v_result
    FROM sales_orders so WHERE id = v_order_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION place_sales_order(jsonb) TO authenticated;

-- ── 7. Audit ────────────────────────────────────────────────────────────────
INSERT INTO audit_log (actor_id, actor_role, action, target_type, payload)
VALUES (
  NULL, 'system',
  'migration.customers_and_credit_added',
  'schema',
  jsonb_build_object(
    'tables',         jsonb_build_array('customers'),
    'columns_added',  jsonb_build_object('sales_orders', jsonb_build_array('customer_id')),
    'views_added',    jsonb_build_array('vw_customer_balance'),
    'rpcs_replaced',  jsonb_build_array('place_sales_order'),
    'applied_at',     now()
  )
);

COMMIT;
