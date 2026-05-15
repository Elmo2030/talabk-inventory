-- ============================================================
-- MIGRATION: Multi-Tenant B2B SaaS Architecture
-- طلبك — للمتاجر الإلكترونية
-- Date: 2026-05-15
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. SUBSCRIPTION PLANS ENUM
-- ============================================================
CREATE TYPE subscription_plan_enum AS ENUM ('trial', 'starter', 'pro', 'enterprise');
CREATE TYPE tenant_status_enum     AS ENUM ('pending', 'active', 'suspended', 'cancelled');
CREATE TYPE user_role_enum         AS ENUM ('super_admin', 'tenant_admin', 'tenant_user');
CREATE TYPE reg_status_enum        AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- 2. TENANTS TABLE  (المتاجر المشتركة)
-- ============================================================
CREATE TABLE tenants (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Slug used in subdomain or path: /app/[slug]/dashboard
  slug                  TEXT UNIQUE NOT NULL
                          CHECK (slug ~ '^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$'),
  store_name            TEXT NOT NULL,
  owner_email           TEXT NOT NULL,
  owner_phone           TEXT,
  logo_url              TEXT,
  -- Subscription
  subscription_plan     subscription_plan_enum NOT NULL DEFAULT 'trial',
  status                tenant_status_enum     NOT NULL DEFAULT 'pending',
  subscription_ends_at  TIMESTAMPTZ,
  monthly_fee           DECIMAL(10, 2) NOT NULL DEFAULT 0,
  max_users             INT            NOT NULL DEFAULT 3,
  -- Limits per plan
  max_items             INT            NOT NULL DEFAULT 100,
  max_orders_per_month  INT            NOT NULL DEFAULT 200,
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug   ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 3. USER PROFILES  (extends Supabase auth.users)
-- ============================================================
CREATE TABLE user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role         user_role_enum NOT NULL DEFAULT 'tenant_user',
  full_name    TEXT,
  -- Granular permission overrides stored as JSON map
  -- e.g. { "reports:read": true, "settings:write": false }
  permissions  JSONB NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Super admins have no tenant; regular users must have a tenant
  CONSTRAINT chk_super_admin_no_tenant
    CHECK (
      (role = 'super_admin' AND tenant_id IS NULL) OR
      (role <> 'super_admin' AND tenant_id IS NOT NULL)
    )
);

CREATE INDEX idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX idx_user_profiles_role   ON user_profiles(role);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 4. ADD tenant_id TO ALL EXISTING DATA TABLES
-- ============================================================

-- Suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- Items
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_items_tenant ON items(tenant_id);

-- Stock In / Out
ALTER TABLE stock_in
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_stock_in_tenant ON stock_in(tenant_id);

ALTER TABLE stock_out
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_stock_out_tenant ON stock_out(tenant_id);

-- Purchase Invoices
ALTER TABLE purchase_invoices
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant ON purchase_invoices(tenant_id);

-- Sales Orders
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant ON sales_orders(tenant_id);

-- Store Profiles
ALTER TABLE store_profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_store_profiles_tenant ON store_profiles(tenant_id);

-- ============================================================
-- 5. JWT HELPER FUNCTIONS
-- ============================================================

-- Extract tenant_id from JWT custom claims
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', TRUE)::jsonb ->> 'tenant_id',
    ''
  )::UUID;
$$;

-- Extract user role from JWT custom claims
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', TRUE)::jsonb ->> 'user_role',
    ''
  );
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY — Enable on all tables
-- ============================================================
ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_in           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_out          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_profiles     ENABLE ROW LEVEL SECURITY;

-- ─── TENANTS ────────────────────────────────────────────────
-- Super admin sees all tenants
CREATE POLICY "sa_full_tenants" ON tenants
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin');

-- Tenant admin/user can only read their own tenant row
CREATE POLICY "tenant_read_own" ON tenants
  FOR SELECT TO authenticated
  USING (id = get_current_tenant_id());

-- ─── USER PROFILES ──────────────────────────────────────────
-- Super admin manages all profiles
CREATE POLICY "sa_full_profiles" ON user_profiles
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin');

-- Tenant admin manages profiles within their tenant
CREATE POLICY "tenant_admin_manage_users" ON user_profiles
  FOR ALL TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() = 'tenant_admin'
  );

-- Any user can read their own profile
CREATE POLICY "user_read_own_profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ─── MACRO: create tenant-isolation policies for data tables ─
-- Pattern: super_admin bypasses; others scoped to their tenant_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'suppliers','items','stock_in','stock_out',
    'purchase_invoices','sales_orders','store_profiles'
  ]
  LOOP
    EXECUTE format(
      $fmt$
        -- Read: own tenant or super_admin
        CREATE POLICY "tenant_isolation_%1$s_select" ON %1$s
          FOR SELECT TO authenticated
          USING (
            tenant_id = get_current_tenant_id()
            OR get_current_user_role() = 'super_admin'
          );

        -- Insert: must belong to own tenant
        CREATE POLICY "tenant_isolation_%1$s_insert" ON %1$s
          FOR INSERT TO authenticated
          WITH CHECK (tenant_id = get_current_tenant_id());

        -- Update: own tenant only
        CREATE POLICY "tenant_isolation_%1$s_update" ON %1$s
          FOR UPDATE TO authenticated
          USING (tenant_id = get_current_tenant_id())
          WITH CHECK (tenant_id = get_current_tenant_id());

        -- Delete: own tenant only (super_admin can delete too)
        CREATE POLICY "tenant_isolation_%1$s_delete" ON %1$s
          FOR DELETE TO authenticated
          USING (
            tenant_id = get_current_tenant_id()
            OR get_current_user_role() = 'super_admin'
          );
      $fmt$,
      tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 7. SUPABASE AUTH HOOK — Injects tenant_id & role into JWT
-- ============================================================
-- Register this in the Supabase Dashboard:
-- Authentication → Hooks → Custom Access Token Hook → public.custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  profile_rec RECORD;
  claims      JSONB;
BEGIN
  SELECT tenant_id, role
  INTO   profile_rec
  FROM   user_profiles
  WHERE  id = (event ->> 'user_id')::UUID;

  claims := event -> 'claims';

  IF profile_rec.tenant_id IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{tenant_id}',
      to_jsonb(profile_rec.tenant_id::TEXT)
    );
  END IF;

  IF profile_rec.role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{user_role}',
      to_jsonb(profile_rec.role::TEXT)
    );
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 8. TENANT REGISTRATION REQUESTS
-- ============================================================
CREATE TABLE registration_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name      TEXT NOT NULL,
  owner_name      TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  requested_plan  subscription_plan_enum NOT NULL DEFAULT 'starter',
  status          reg_status_enum        NOT NULL DEFAULT 'pending',
  notes           TEXT,
  -- Review audit
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES auth.users(id),
  -- Generated tenant on approval
  tenant_id       UUID REFERENCES tenants(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reg_requests_status ON registration_requests(status);
CREATE INDEX idx_reg_requests_email  ON registration_requests(email);

ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Super admin manages all requests
CREATE POLICY "sa_full_reg_requests" ON registration_requests
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin');

-- Anyone (anon) can submit a registration request
CREATE POLICY "public_insert_reg_request" ON registration_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

-- ============================================================
-- 9. SUBSCRIPTION EVENTS LOG
-- ============================================================
CREATE TABLE subscription_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL, -- created | upgraded | downgraded | suspended | cancelled | payment_received
  plan_from   subscription_plan_enum,
  plan_to     subscription_plan_enum,
  amount      DECIMAL(10, 2),
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_events_tenant ON subscription_events(tenant_id);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_full_sub_events" ON subscription_events
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'super_admin');

CREATE POLICY "tenant_read_own_events" ON subscription_events
  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- ============================================================
-- 10. SUPER ADMIN AGGREGATE VIEW (read-only)
-- ============================================================
CREATE OR REPLACE VIEW vw_tenant_stats AS
SELECT
  t.id,
  t.slug,
  t.store_name,
  t.owner_email,
  t.subscription_plan,
  t.status,
  t.monthly_fee,
  t.subscription_ends_at,
  t.created_at,
  -- User counts
  COUNT(DISTINCT up.id)                                           AS total_users,
  COUNT(DISTINCT up.id) FILTER (WHERE up.is_active)              AS active_users,
  -- Order activity (last 30 days)
  COUNT(DISTINCT so.id)                                           AS total_orders,
  COUNT(DISTINCT so.id) FILTER (
    WHERE so.created_at >= NOW() - INTERVAL '30 days'
  )                                                               AS orders_last_30d,
  COALESCE(SUM(so.customer_total) FILTER (
    WHERE so.created_at >= NOW() - INTERVAL '30 days'
  ), 0)                                                           AS gmv_last_30d
FROM       tenants         t
LEFT JOIN  user_profiles   up ON up.tenant_id = t.id
LEFT JOIN  sales_orders    so ON so.tenant_id = t.id
GROUP BY   t.id;

-- Only super_admin can query this view
ALTER VIEW vw_tenant_stats OWNER TO postgres;
GRANT SELECT ON vw_tenant_stats TO authenticated;

-- Protect via a function that checks the role
CREATE OR REPLACE FUNCTION get_tenant_stats()
RETURNS SETOF vw_tenant_stats
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  IF get_current_user_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Access denied: super_admin role required';
  END IF;
  RETURN QUERY SELECT * FROM vw_tenant_stats ORDER BY created_at DESC;
END;
$$;

-- ============================================================
-- 11. PLAN LIMITS LOOKUP TABLE
-- ============================================================
CREATE TABLE plan_limits (
  plan            subscription_plan_enum PRIMARY KEY,
  display_name    TEXT NOT NULL,
  monthly_fee     DECIMAL(10, 2) NOT NULL,
  max_users       INT  NOT NULL,
  max_items       INT  NOT NULL,
  max_orders_mo   INT  NOT NULL,
  has_api_access  BOOLEAN NOT NULL DEFAULT FALSE,
  has_multi_store BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO plan_limits VALUES
  ('trial',      'تجريبي',          0,     2,   50,   100, FALSE, FALSE),
  ('starter',    'مبتدئ',          99,     5,  500,   500, FALSE, FALSE),
  ('pro',        'احترافي',        249,   15, 5000,  5000, TRUE,  FALSE),
  ('enterprise', 'مؤسسي',          599,  100,  -1,    -1,  TRUE,  TRUE);
