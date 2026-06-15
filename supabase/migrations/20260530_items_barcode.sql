-- ─────────────────────────────────────────────────────────────────────────────
-- items.barcode — Wave G #4
--
-- Until now Talabk overloaded `items.code` for both human-friendly SKU and
-- scanner barcode. The Excel-template gap surfaced "barcode" as a
-- separate field merchants expect, and it's a prerequisite for any
-- mobile/HID-scanner checkout flow.
--
-- This migration:
--   • Adds nullable `barcode TEXT` column (existing rows untouched).
--   • Adds a UNIQUE partial index on (tenant_id, barcode) so the same
--     barcode can repeat across tenants but is unique within one. The
--     partial WHERE keeps NULL out of the constraint — items without
--     a barcode don't collide with each other.
--   • Adds a btree index on (tenant_id, barcode) for the scan-lookup
--     path used by /orders/new (cashier scans → exact-match query).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Column ───────────────────────────────────────────────────────────────
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- ── 2. Uniqueness (per tenant, when present) ────────────────────────────────
-- Partial unique constraint: NULL is permitted any number of times.
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_tenant_barcode_unique
  ON items (tenant_id, barcode)
  WHERE barcode IS NOT NULL;

-- ── 3. Audit ────────────────────────────────────────────────────────────────
INSERT INTO audit_log (actor_id, actor_role, action, target_type, payload)
VALUES (
  NULL, 'system',
  'migration.items_barcode_added',
  'schema',
  jsonb_build_object(
    'columns_added', jsonb_build_object('items', jsonb_build_array('barcode')),
    'indexes_added', jsonb_build_array('idx_items_tenant_barcode_unique'),
    'applied_at', now()
  )
);

COMMIT;
