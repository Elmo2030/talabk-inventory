-- ── Appointments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name    text NOT NULL,
  customer_phone   text NOT NULL DEFAULT '',
  service          text NOT NULL,
  staff_name       text,
  date             date NOT NULL,
  time             text NOT NULL,       -- "14:30"
  duration_minutes int  NOT NULL DEFAULT 60,
  notes            text,
  status           text NOT NULL DEFAULT 'SCHEDULED'
                     CHECK (status IN ('SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  tenant_id        uuid REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments(date DESC);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation on appointments" ON appointments FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());

-- ── Store Settings (VAT etc.) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  vat_enabled boolean NOT NULL DEFAULT false,
  vat_rate    numeric(8,4) NOT NULL DEFAULT 15,
  vat_number  text,
  store_name  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation on store_settings" ON store_settings FOR ALL TO authenticated
  USING (tenant_id = get_current_tenant_id()) WITH CHECK (tenant_id = get_current_tenant_id());
