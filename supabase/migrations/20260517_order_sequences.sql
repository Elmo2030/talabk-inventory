-- Atomic per-tenant, per-year counters for human-readable numbers
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
