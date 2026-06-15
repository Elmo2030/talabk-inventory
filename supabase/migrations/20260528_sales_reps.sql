-- ─────────────────────────────────────────────────────────────────────────────
-- Sales Reps (مندوبين) — Wave G #1
--
-- The audit of a competing Excel template surfaced "field sales rep" as the
-- single biggest model gap for Egyptian/Libyan SMBs. Adding it unlocks:
--   • Rep performance reports (who's selling what, monthly commission)
--   • Order attribution (every sales_orders row carries the rep that closed it)
--   • Future commission payouts (commission_pct on the rep row)
--
-- This migration is additive — every existing tenant works unchanged because
-- both new columns are nullable.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. sales_reps table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_reps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  -- Commission percentage applied to net_profit when computing the rep's
  -- monthly payout. Stored as numeric % (e.g. 5.00 = 5%). Optional.
  commission_pct  NUMERIC(5, 2) DEFAULT 0,
  -- Optional descriptive territory (e.g. "طرابلس" / "بنغازي"). Free text;
  -- tenants that want strict territory routing can add validation later.
  territory       TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- code is unique within a tenant — same code can repeat across tenants.
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_sales_reps_tenant_status
  ON sales_reps (tenant_id, status);

-- tenant_id default mirrors the pattern from 20260519
ALTER TABLE sales_reps
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- ── 2. updated_at trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sales_reps_updated_at ON sales_reps;
CREATE TRIGGER trg_sales_reps_updated_at
  BEFORE UPDATE ON sales_reps
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── 3. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE sales_reps ENABLE ROW LEVEL SECURITY;

-- Super admin: full access (FOR ALL with explicit WITH CHECK per Wave-F pattern)
DROP POLICY IF EXISTS "sa_full_sales_reps" ON sales_reps;
CREATE POLICY "sa_full_sales_reps" ON sales_reps
  FOR ALL TO authenticated
  USING ((SELECT get_current_user_role()) = 'super_admin')
  WITH CHECK (
    (SELECT get_current_user_role()) = 'super_admin'
    AND tenant_id IS NOT NULL
  );

-- Tenant users: same scoping pattern as other data tables. Using the
-- (SELECT …) wrapper from Wave F for per-statement evaluation.
DROP POLICY IF EXISTS "tenant_isolation_sales_reps_select" ON sales_reps;
CREATE POLICY "tenant_isolation_sales_reps_select" ON sales_reps
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    OR (SELECT get_current_user_role()) = 'super_admin'
  );

DROP POLICY IF EXISTS "tenant_isolation_sales_reps_insert" ON sales_reps;
CREATE POLICY "tenant_isolation_sales_reps_insert" ON sales_reps
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

DROP POLICY IF EXISTS "tenant_isolation_sales_reps_update" ON sales_reps;
CREATE POLICY "tenant_isolation_sales_reps_update" ON sales_reps
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_current_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

DROP POLICY IF EXISTS "tenant_isolation_sales_reps_delete" ON sales_reps;
CREATE POLICY "tenant_isolation_sales_reps_delete" ON sales_reps
  FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    OR (SELECT get_current_user_role()) = 'super_admin'
  );

-- ── 4. sales_orders.rep_id ──────────────────────────────────────────────────
-- Nullable so existing rows + orders placed without a rep selection keep
-- working. ON DELETE SET NULL → deleting a rep doesn't lose historic
-- attribution (we'd rather show a tombstone than fail the foreign key).
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS rep_id UUID REFERENCES sales_reps(id) ON DELETE SET NULL;

-- Composite index covers the "rep performance for the last 30 days" query
-- (rep_id + created_at) that's the basis of the new report tab.
CREATE INDEX IF NOT EXISTS idx_sales_orders_rep_created
  ON sales_orders (rep_id, created_at DESC)
  WHERE rep_id IS NOT NULL;

-- ── 5. RPC update: place_sales_order accepts repId ──────────────────────────
-- We extend the existing function by passing p_order->>'repId' into the
-- INSERT. The function stays SECURITY INVOKER so RLS still scopes everything;
-- the new column is in the existing tenant_isolation policies.
--
-- Note: this REPLACES the function created in 20260524_rpc_locks.sql.
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
BEGIN
  v_tenant_id := get_current_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context';
  END IF;

  -- Optional rep_id. We validate it belongs to this tenant (cheap join)
  -- rather than trusting the client. Empty string treated as NULL.
  v_rep_id := NULLIF(p_order->>'repId', '')::uuid;
  IF v_rep_id IS NOT NULL THEN
    PERFORM 1 FROM sales_reps
     WHERE id = v_rep_id AND tenant_id = v_tenant_id AND status = 'ACTIVE';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sales rep % not found or inactive for this tenant', v_rep_id;
    END IF;
  END IF;

  -- ── Lock + stock check (same as Wave F) ─────────────────────────────────
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
    rep_id
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
    v_rep_id
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

-- ── 6. Audit ────────────────────────────────────────────────────────────────
INSERT INTO audit_log (actor_id, actor_role, action, target_type, payload)
VALUES (
  NULL, 'system',
  'migration.sales_reps_added',
  'schema',
  jsonb_build_object(
    'tables', jsonb_build_array('sales_reps'),
    'columns_added', jsonb_build_object('sales_orders', jsonb_build_array('rep_id')),
    'rpcs_replaced', jsonb_build_array('place_sales_order'),
    'applied_at', now()
  )
);

COMMIT;
