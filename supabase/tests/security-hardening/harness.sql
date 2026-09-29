-- Minimal Supabase-like harness (local only, fake data).
DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;
DROP SCHEMA IF EXISTS auth CASCADE; CREATE SCHEMA auth;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'role' $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid $$;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

CREATE TYPE subscription_plan_enum AS ENUM ('trial', 'starter', 'pro', 'enterprise');
CREATE TABLE tenants (id uuid PRIMARY KEY, store_name text, created_at timestamptz DEFAULT now());
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE TABLE sales_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid, customer_total numeric, created_at timestamptz DEFAULT now());
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::jsonb ->> 'tenant_id', '')::UUID; $$;
CREATE OR REPLACE FUNCTION get_current_user_role() RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', TRUE)::jsonb ->> 'user_role', ''); $$;

-- vulnerable originals (copied from the repo migrations)
CREATE OR REPLACE VIEW vw_tenant_stats AS
SELECT t.id, t.store_name, t.created_at, COUNT(so.id) AS total_orders, COALESCE(SUM(so.customer_total),0) AS gmv
FROM tenants t LEFT JOIN sales_orders so ON so.tenant_id = t.id GROUP BY t.id;
GRANT SELECT ON vw_tenant_stats TO authenticated;
CREATE OR REPLACE FUNCTION get_tenant_stats() RETURNS SETOF vw_tenant_stats LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF get_current_user_role() <> 'super_admin' THEN RAISE EXCEPTION 'Access denied: super_admin role required'; END IF;
  RETURN QUERY SELECT * FROM vw_tenant_stats ORDER BY created_at DESC;
END; $$;

CREATE TABLE plan_limits (plan subscription_plan_enum PRIMARY KEY, display_name TEXT NOT NULL, monthly_fee DECIMAL(10,2) NOT NULL,
  max_users INT NOT NULL, max_items INT NOT NULL, max_orders_mo INT NOT NULL, has_api_access BOOLEAN NOT NULL DEFAULT FALSE, has_multi_store BOOLEAN NOT NULL DEFAULT FALSE);
INSERT INTO plan_limits VALUES ('trial','t',0,2,50,100,false,false),('starter','s',99,5,500,500,false,false),('pro','p',249,15,5000,5000,true,false),('enterprise','e',599,100,-1,-1,true,true);
CREATE TABLE IF NOT EXISTS subscription_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  plan            text NOT NULL,
  billing_months  int  NOT NULL DEFAULT 1,
  amount          numeric(10,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'USD',
  payment_method  text NOT NULL DEFAULT 'usdt'
                    CHECK (payment_method IN ('cash','usdt')),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  -- Evidence submitted by tenant
  tx_hash         text,          -- USDT transaction hash
  proof_notes     text,          -- tenant's freetext notes / cash receipt ref
  -- Admin review
  admin_notes     text,          -- rejection reason or approval note
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON subscription_payments(tenant_id);
CREATE INDEX ON subscription_payments(status);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Tenant sees own payments
CREATE POLICY "tenant_own_payments" ON subscription_payments
  FOR SELECT TO authenticated
  USING (
    tenant_id = (get_current_tenant_id())::uuid
    OR get_current_user_role() = 'super_admin'
  );

-- Tenants can submit payment requests
CREATE POLICY "tenant_insert_payments" ON subscription_payments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (get_current_tenant_id())::uuid);

-- Only super_admin can UPDATE (approve/reject)
CREATE POLICY "sa_review_payments" ON subscription_payments
  FOR UPDATE TO authenticated
  USING (get_current_user_role() = 'super_admin');
CREATE TABLE IF NOT EXISTS order_counters (
  tenant_id  uuid    REFERENCES tenants(id) ON DELETE CASCADE,
  prefix     text,   -- 'SO' or 'PO'
  year       int,
  last_value int     NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, prefix, year)
);

-- Allow authenticated users to use this table (RLS not needed — function is security definer)
ALTER TABLE order_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on order_counters"
  ON order_counters FOR ALL TO service_role USING (true);

-- Atomic increment function — called from application layer
-- Returns the next formatted number e.g. "SO-2026-0042"
CREATE OR REPLACE FUNCTION next_order_number(
  p_tenant_id uuid,
  p_prefix    text,
  p_year      int DEFAULT EXTRACT(YEAR FROM now())::int
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next int;
BEGIN
  INSERT INTO order_counters (tenant_id, prefix, year, last_value)
  VALUES (p_tenant_id, p_prefix, p_year, 1)
  ON CONFLICT (tenant_id, prefix, year)
  DO UPDATE SET last_value = order_counters.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN p_prefix || '-' || p_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;
INSERT INTO tenants (id, store_name) VALUES ('11111111-1111-1111-1111-111111111111','Shop A'),('22222222-2222-2222-2222-222222222222','Shop B');
INSERT INTO sales_orders (tenant_id, customer_total) VALUES ('22222222-2222-2222-2222-222222222222', 5000);
