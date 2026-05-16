-- ============================================================
-- Fix 1: Inject tenant_slug into JWT claims
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  profile_rec RECORD;
  claims      JSONB;
BEGIN
  -- Get role, tenant_id, AND the tenant slug in one query
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

-- Preserve grants
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;

-- ============================================================
-- Fix 2: Plan limits — items
-- ============================================================

-- Returns true if the tenant can add more items (or if max_items is 0 = unlimited)
CREATE OR REPLACE FUNCTION check_item_limit(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_max   int;
  v_count int;
BEGIN
  SELECT max_items INTO v_max FROM tenants WHERE id = p_tenant_id;
  IF v_max IS NULL OR v_max = 0 THEN
    RETURN true; -- unlimited
  END IF;
  SELECT COUNT(*) INTO v_count FROM items WHERE tenant_id = p_tenant_id;
  RETURN v_count < v_max;
END;
$$;

GRANT EXECUTE ON FUNCTION check_item_limit(uuid) TO authenticated;

-- Trigger function: block insert when item limit exceeded
CREATE OR REPLACE FUNCTION enforce_item_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max   int;
  v_count int;
  v_tid   uuid;
BEGIN
  -- Use the DEFAULT expression for tenant_id if not set
  v_tid := COALESCE(NEW.tenant_id, (get_current_tenant_id())::uuid);

  SELECT max_items INTO v_max FROM tenants WHERE id = v_tid;

  -- 0 or NULL means unlimited
  IF v_max IS NULL OR v_max = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count FROM items WHERE tenant_id = v_tid;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'تجاوزت الحد الأقصى لعدد الأصناف في خطتك (%). يرجى الترقية لخطة أعلى.', v_max
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_item_limit
  BEFORE INSERT ON items
  FOR EACH ROW EXECUTE FUNCTION enforce_item_limit();

-- ============================================================
-- Fix 2: Plan limits — sales_orders (monthly cap)
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_order_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max   int;
  v_count int;
  v_tid   uuid;
BEGIN
  v_tid := COALESCE(NEW.tenant_id, (get_current_tenant_id())::uuid);

  SELECT max_orders_per_month INTO v_max FROM tenants WHERE id = v_tid;

  IF v_max IS NULL OR v_max = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM sales_orders
  WHERE tenant_id = v_tid
    AND created_at >= date_trunc('month', now());

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'تجاوزت الحد الأقصى لعدد الطلبات هذا الشهر (%). يرجى الترقية لخطة أعلى.', v_max
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_order_limit
  BEFORE INSERT ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION enforce_order_limit();
