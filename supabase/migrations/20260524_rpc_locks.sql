-- ─────────────────────────────────────────────────────────────────────────────
-- RPC concurrency hardening
--
-- Two correctness bugs flagged by the DBA audit:
--
--   1. place_sales_order had no row lock + no stock availability check.
--      Two concurrent orders for the last unit both succeeded → oversell.
--
--   2. receive_purchase_invoice trusted the client-computed `newMAC` without
--      locking the item row. Two concurrent invoices touching the same item
--      both read the stale MAC, wrote different "new" values → MAC drift.
--
-- Both functions are recreated below with:
--   • Per-item SELECT … FOR UPDATE inside the loop (orders rows in a
--     stable order to avoid deadlocks between concurrent transactions
--     that touch the same set of items).
--   • Order: place_sales_order verifies available balance from
--     current_stock_view *under the lock*. If insufficient → RAISE.
--   • Receive:    MAC is recomputed inside the function from the now-locked
--     item row + the incoming quantity/unit-cost, ignoring the client's
--     `newMAC` (the client value is kept in the JSONB blob as an audit
--     trail but never authoritative).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ============================================================================
-- 1. place_sales_order — locks items, checks stock, prevents oversell
-- ============================================================================
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
BEGIN
  v_tenant_id := get_current_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context';
  END IF;

  -- ── Pass 1: lock every cart item in deterministic order ──────────────────
  -- We sort by item_id so two concurrent transactions touching items {A,B}
  -- always acquire locks in the same order — no AB/BA deadlock cycles.
  -- Each lock also lets us read the freshest balance for the availability
  -- check below.
  FOR v_item IN
    SELECT value
      FROM jsonb_array_elements(p_order->'items') x(value)
     ORDER BY (value->>'itemId')::uuid
  LOOP
    v_item_id := (v_item->>'itemId')::uuid;
    v_qty     := (v_item->>'quantity')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', v_item_id;
    END IF;

    -- Lock the item row (FOR UPDATE) — serializes concurrent sales
    -- of the same item even though current_stock_view itself is unlockable.
    SELECT name INTO v_item_name
      FROM items
     WHERE id = v_item_id
       AND tenant_id = v_tenant_id
       FOR UPDATE;

    IF v_item_name IS NULL THEN
      RAISE EXCEPTION 'Item % not found in this tenant', v_item_id;
    END IF;

    -- Availability check: balance from the view (recomputed at read time
    -- so it reflects every committed movement up to this point).
    SELECT current_balance INTO v_available
      FROM current_stock_view
     WHERE item_id = v_item_id;

    IF COALESCE(v_available, 0) < v_qty THEN
      RAISE EXCEPTION 'الرصيد غير كافٍ للصنف "%": المتاح % والمطلوب %',
        v_item_name, COALESCE(v_available, 0), v_qty;
    END IF;
  END LOOP;

  -- ── Atomic order number under the same transaction ──────────────────────
  SELECT next_order_number(v_tenant_id, 'SO', EXTRACT(YEAR FROM now())::int)
    INTO v_order_num;

  -- ── Insert sales_order header ───────────────────────────────────────────
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

  -- ── Pass 2: insert stock-out rows. The locks from pass 1 still hold. ────
  FOR v_item IN
    SELECT value
      FROM jsonb_array_elements(p_order->'items') x(value)
     ORDER BY (value->>'itemId')::uuid
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

-- ============================================================================
-- 2. receive_purchase_invoice — locks items, recomputes MAC server-side
-- ============================================================================
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
  v_tenant_id   uuid;
  v_item        jsonb;
  v_result      jsonb;
  v_sup_id      uuid;
  v_item_id     uuid;
  v_qty         numeric;
  v_unit_cost   numeric;
  v_old_mac     numeric;
  v_balance     numeric;
  v_new_mac     numeric;
  v_final_items jsonb := '[]'::jsonb;
BEGIN
  v_tenant_id := get_current_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context';
  END IF;

  -- Invoice must exist, belong to this tenant, and not be RECEIVED yet.
  -- Locking the invoice row prevents two concurrent /receive calls.
  PERFORM 1 FROM purchase_invoices
   WHERE id = p_invoice_id
     AND tenant_id = v_tenant_id
     AND status <> 'RECEIVED'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة أو تم استلامها مسبقاً';
  END IF;

  v_sup_id := NULLIF(p_supplier_id, '')::uuid;

  -- Iterate in deterministic order (matches place_sales_order convention).
  FOR v_item IN
    SELECT value
      FROM jsonb_array_elements(p_computed_items) x(value)
     ORDER BY (value->>'itemId')::uuid
  LOOP
    v_item_id   := (v_item->>'itemId')::uuid;
    v_qty       := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'totalUnitCost')::numeric;

    -- Lock the item row and read the current MAC under that lock.
    SELECT moving_average_cost INTO v_old_mac
      FROM items
     WHERE id = v_item_id
       AND tenant_id = v_tenant_id
       FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item % not found in this tenant', v_item_id;
    END IF;

    -- Current balance — used as the weight for the weighted average.
    SELECT COALESCE(current_balance, 0) INTO v_balance
      FROM current_stock_view
     WHERE item_id = v_item_id;

    -- Server-side MAC: weighted average of existing balance @ old MAC
    -- and incoming quantity @ this invoice's landed unit cost.
    -- For brand-new items (no prior balance) the new MAC is just the
    -- incoming unit cost.
    IF v_balance + v_qty <= 0 THEN
      v_new_mac := v_unit_cost;
    ELSIF v_old_mac IS NULL THEN
      v_new_mac := v_unit_cost;
    ELSE
      v_new_mac := ((v_balance * v_old_mac) + (v_qty * v_unit_cost))
                   / (v_balance + v_qty);
    END IF;

    -- Stock-in movement (creates a row in stock_in_movements; the view
    -- will pick it up immediately for the next iteration in this txn).
    INSERT INTO stock_in_movements (
      tenant_id, date, invoice_no, item_id, supplier_id,
      quantity, unit_price, responsible_employee, notes
    ) VALUES (
      v_tenant_id, CURRENT_DATE, p_invoice_number,
      v_item_id, v_sup_id, v_qty, v_unit_cost,
      'نظام المشتريات',
      'فاتورة مشتريات ' || p_invoice_number ||
        ' — تكلفة استيرادية: ' || round(v_unit_cost, 2)
    );

    -- Authoritative MAC update.
    UPDATE items
       SET moving_average_cost = v_new_mac
     WHERE id = v_item_id
       AND tenant_id = v_tenant_id;

    -- Preserve client's row but overwrite newMAC with server-authoritative
    -- value so the audit trail stays honest.
    v_final_items := v_final_items || jsonb_build_object(
      'id',                v_item->>'id',
      'itemId',            v_item->>'itemId',
      'itemName',          v_item->>'itemName',
      'itemCode',          v_item->>'itemCode',
      'quantity',          v_qty,
      'unitPrice',         v_item->>'unitPrice',
      'allocatedLandedCost', v_item->>'allocatedLandedCost',
      'landedCostPerUnit', v_item->>'landedCostPerUnit',
      'totalUnitCost',     v_unit_cost,
      'previousMAC',       v_old_mac,
      'newMAC',            v_new_mac
    );
  END LOOP;

  -- Final invoice update.
  UPDATE purchase_invoices
     SET status      = 'RECEIVED',
         received_at = now(),
         items       = v_final_items
   WHERE id = p_invoice_id
     AND tenant_id = v_tenant_id;

  SELECT row_to_json(pi)::jsonb INTO v_result
    FROM purchase_invoices pi WHERE id = p_invoice_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION receive_purchase_invoice(uuid, jsonb, text, text) TO authenticated;

-- ── Audit ───────────────────────────────────────────────────────────────────
INSERT INTO audit_log (actor_id, actor_role, action, target_type, payload)
VALUES (
  NULL, 'system',
  'migration.rpc_locks_applied',
  'rpc',
  jsonb_build_object(
    'rpcs', jsonb_build_array('place_sales_order', 'receive_purchase_invoice'),
    'applied_at', now()
  )
);

COMMIT;
