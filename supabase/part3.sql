
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
