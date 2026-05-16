-- ============================================================
-- MIGRATION: Tenant defaults, moving_average_cost, and atomic RPCs
-- Date: 2026-05-19
-- ============================================================

-- ============================================================
-- 1. ADD tenant_id TO stock_in_movements / stock_out_movements
--    (the 20260515 migration used wrong names: stock_in / stock_out)
-- ============================================================

ALTER TABLE stock_in_movements
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_stock_in_movements_tenant ON stock_in_movements(tenant_id);

ALTER TABLE stock_out_movements
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_stock_out_movements_tenant ON stock_out_movements(tenant_id);

-- ============================================================
-- 2. RLS for stock_in_movements
-- ============================================================

ALTER TABLE stock_in_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_stock_in_movements_select" ON stock_in_movements
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR get_current_user_role() = 'super_admin'
  );

CREATE POLICY "tenant_isolation_stock_in_movements_insert" ON stock_in_movements
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "tenant_isolation_stock_in_movements_update" ON stock_in_movements
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "tenant_isolation_stock_in_movements_delete" ON stock_in_movements
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- ============================================================
-- 3. RLS for stock_out_movements
-- ============================================================

ALTER TABLE stock_out_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_stock_out_movements_select" ON stock_out_movements
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR get_current_user_role() = 'super_admin'
  );

CREATE POLICY "tenant_isolation_stock_out_movements_insert" ON stock_out_movements
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "tenant_isolation_stock_out_movements_update" ON stock_out_movements
  FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "tenant_isolation_stock_out_movements_delete" ON stock_out_movements
  FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- ============================================================
-- 4. DEFAULT get_current_tenant_id() on ALL data tables
-- ============================================================

-- suppliers
ALTER TABLE suppliers
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- items
ALTER TABLE items
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- stock_in_movements
ALTER TABLE stock_in_movements
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- stock_out_movements
ALTER TABLE stock_out_movements
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- purchase_invoices
ALTER TABLE purchase_invoices
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- sales_orders
ALTER TABLE sales_orders
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- newer tables from later migrations
ALTER TABLE coupons
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

ALTER TABLE return_orders
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

ALTER TABLE appointments
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

ALTER TABLE store_settings
  ALTER COLUMN tenant_id SET DEFAULT (get_current_tenant_id())::uuid;

-- ============================================================
-- 5. ADD moving_average_cost TO items  (Bug 2)
-- ============================================================

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS moving_average_cost NUMERIC(12, 4);

-- ============================================================
-- 6. ATOMIC FUNCTION: place_sales_order  (Bug 3)
-- Inserts sales_order + all stock_out_movements in one transaction.
-- p_order: JSONB with camelCase keys matching the SalesOrder TS type.
-- ============================================================

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
BEGIN
  v_tenant_id := get_current_tenant_id();

  -- Atomic order-number generation
  SELECT next_order_number(v_tenant_id, 'SO', EXTRACT(YEAR FROM now())::int)
    INTO v_order_num;

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
    (p_order->>'shippedAt')::timestamptz
  )
  RETURNING id INTO v_order_id;

  -- Insert stock-out for each cart item
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_order->'items')
  LOOP
    INSERT INTO stock_out_movements (
      tenant_id, date, item_id, recipient_dept, quantity, unit_price,
      reason, responsible_employee, notes
    ) VALUES (
      v_tenant_id,
      CURRENT_DATE,
      (v_item->>'itemId')::uuid,
      p_order->>'customerName',
      (v_item->>'quantity')::numeric,
      (v_item->>'sellingPrice')::numeric,
      'بيع',
      'نظام المبيعات',
      'طلب مبيعات ' || v_order_num
    );
  END LOOP;

  SELECT row_to_json(so)::jsonb INTO v_result
  FROM sales_orders so WHERE id = v_order_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION place_sales_order(jsonb) TO authenticated;

-- ============================================================
-- 7. ATOMIC FUNCTION: receive_purchase_invoice  (Bug 3)
-- Creates stock-in movements + updates MACs + marks invoice RECEIVED.
-- p_invoice_id:      UUID of the purchase_invoice
-- p_computed_items:  JSONB array of PurchaseInvoiceItem with:
--                    id, itemId, quantity, totalUnitCost, newMAC, invoiceNumber
-- p_invoice_number:  text (for notes)
-- p_supplier_id:     text (can be null / empty string)
-- ============================================================

CREATE OR REPLACE FUNCTION receive_purchase_invoice(
  p_invoice_id     uuid,
  p_computed_items jsonb,
  p_invoice_number text,
  p_supplier_id    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_tenant_id  uuid;
  v_item       jsonb;
  v_result     jsonb;
  v_sup_id     uuid;
BEGIN
  v_tenant_id := get_current_tenant_id();

  -- Validate invoice exists, belongs to tenant, and is not yet RECEIVED
  IF NOT EXISTS (
    SELECT 1 FROM purchase_invoices
    WHERE id = p_invoice_id
      AND tenant_id = v_tenant_id
      AND status <> 'RECEIVED'
  ) THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة أو تم استلامها مسبقاً';
  END IF;

  -- NULL-safe supplier id
  v_sup_id := NULLIF(p_supplier_id, '')::uuid;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_computed_items)
  LOOP
    -- Create stock-in movement
    INSERT INTO stock_in_movements (
      tenant_id, date, invoice_no, item_id, supplier_id,
      quantity, unit_price, responsible_employee, notes
    ) VALUES (
      v_tenant_id,
      CURRENT_DATE,
      p_invoice_number,
      (v_item->>'itemId')::uuid,
      v_sup_id,
      (v_item->>'quantity')::numeric,
      (v_item->>'totalUnitCost')::numeric,
      'نظام المشتريات',
      'فاتورة مشتريات ' || p_invoice_number || ' — تكلفة استيرادية: '
        || round((v_item->>'totalUnitCost')::numeric, 2)
    );

    -- Update item's moving_average_cost
    UPDATE items
    SET moving_average_cost = (v_item->>'newMAC')::numeric
    WHERE id = (v_item->>'itemId')::uuid
      AND tenant_id = v_tenant_id;
  END LOOP;

  -- Mark invoice as RECEIVED with final computed items
  UPDATE purchase_invoices
  SET status      = 'RECEIVED',
      received_at = now(),
      items       = p_computed_items
  WHERE id = p_invoice_id
    AND tenant_id = v_tenant_id;

  SELECT row_to_json(pi)::jsonb INTO v_result
  FROM purchase_invoices pi WHERE id = p_invoice_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION receive_purchase_invoice(uuid, jsonb, text, text) TO authenticated;
