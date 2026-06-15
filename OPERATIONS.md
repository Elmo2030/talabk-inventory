# Operations Runbook — Talabk Inventory SaaS

> Reference for day-2 ops. Keep up to date when infra changes.

## Stack

| Layer | Service | Plan | Notes |
|---|---|---|---|
| Frontend | Vercel (Next.js 14) | Hobby | Auto-deploy from `main` branch |
| Database | Supabase (Postgres 17) | Free | EU-West-1 (Ireland). Upgrade to Pro for PITR. |
| Auth | Supabase Auth | Free | Custom access token hook injects `user_role` into JWT |
| Error tracking | Sentry | Free | `faras-zv/inventory-app` |

## Critical environment variables (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, safe in browser
- `SUPABASE_SERVICE_ROLE_KEY` — **secret**, server-only, rotate quarterly
- `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_*` — error tracking
- `NEXT_PUBLIC_ROOT_DOMAIN` — used by middleware for subdomain detection
- `NEXT_PUBLIC_USDT_WALLET` — TRC-20 address. **Empty → USDT payment hidden**
- `CRON_SECRET` — protects `/api/cron/*` endpoints

## Daily operations

### Adding a new super_admin

```sql
-- 1. Invite via Supabase Auth dashboard, get the user UUID
-- 2. Create user_profile + set JWT claim metadata:
INSERT INTO user_profiles (id, role, full_name, is_active)
VALUES ('<NEW_USER_UUID>', 'super_admin', 'الاسم الكامل', TRUE);

UPDATE auth.users
   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}')
       || '{"user_role": "super_admin"}'::jsonb
 WHERE id = '<NEW_USER_UUID>';
```

### Approving a new tenant registration

1. Open `/superadmin/tenants` → review pending request.
2. Click "موافقة" → `app/api/admin/approve` creates the tenant + invites the user.
3. User receives email → clicks invite → sets password → lands in `/app/<slug>/dashboard`.

### Reviewing a payment

1. Open `/superadmin/payments` → "قيد المراجعة" tab.
2. Verify TX hash on TRONScan (for USDT) or cash receipt (for cash).
3. Approve → atomic RPC `approve_subscription_payment` activates tenant.

## Backups

While on the Free plan there is **no PITR**. Run a manual nightly backup:

```bash
export SUPABASE_DB_URL='postgresql://postgres:PASSWORD@db.bleezrdtmthhvsrsvfmp.supabase.co:5432/postgres'
./scripts/backup-db.sh
```

Better: add to GitHub Actions:

```yaml
# .github/workflows/backup.yml
on: { schedule: [{ cron: '0 2 * * *' }] }
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get install -y postgresql-client
      - env: { SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }} }
        run: ./scripts/backup-db.sh
      - uses: actions/upload-artifact@v4
        with: { name: db-backup, path: backups/*.sql.gz, retention-days: 30 }
```

**Upgrade to Pro ($25/mo) → automatic daily PITR, retention 7 days.**

## Cron jobs

`vercel.json` declares one cron:

| Schedule | Path | Purpose |
|---|---|---|
| `0 3 * * *` (daily 03:00 UTC) | `/api/cron/sweep-expired` | Suspends tenants whose subscription expired |

Vercel sends `Authorization: Bearer $CRON_SECRET` — the route rejects anything else.

## Monitoring

- **Uptime**: hit `GET /api/health` from UptimeRobot / Better Stack. Returns 200 + DB latency.
- **Errors**: Sentry alerts → email. Set up a Slack integration when ready.
- **Audit log**: `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50;` — every super_admin action lands here.

## Incident response

### Site is down

1. Check Vercel dashboard → recent deployments.
2. If a deploy broke prod: **Roll back** via Vercel UI (Deployments → previous READY → "Promote to Production").
3. If Supabase down: check https://status.supabase.com.

### Customer says "I lost my data"

1. `SELECT * FROM audit_log WHERE target_id = '<TENANT_ID>' ORDER BY created_at DESC;`
2. Restore from latest `./backups/*.sql.gz` (selectively for that tenant only — see notes below).
3. If on Pro: restore via PITR from the dashboard.

### Compromised super_admin account

1. Reset password via Admin API immediately.
2. Rotate `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`.
3. Review `audit_log` for last 24h of that actor.

## Key rotation procedure

Run quarterly or after any leak:

```bash
# 1. In Supabase Dashboard → Settings → API → "Reset JWT secret"
#    (this regenerates both anon and service_role keys)
# 2. Copy new values, then:
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# 3. Trigger redeploy
vercel --prod
# 4. Update local .env.local
```

⚠️ All users will be signed out and must log in again.

## DB migrations

Migration files live in `supabase/migrations/*.sql`, applied in
filename order. The older bundled files (`ALL_MIGRATIONS.sql`,
`part1/2/3.sql`, `migration.sql`) have been moved to
`supabase/archive/` and must not be re-applied.

Apply a single migration via Supabase Management API (works for any size):

```bash
FILE=supabase/migrations/20260522_public_storefront.sql
QUERY=$(jq -Rs . < "$FILE")
curl -X POST "https://api.supabase.com/v1/projects/bleezrdtmthhvsrsvfmp/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $QUERY}"
```

Use `IF NOT EXISTS` / `OR REPLACE` everywhere to keep migrations idempotent.

### After a migration that adds tables or columns

Regenerate the typed schema and commit the diff:

```bash
npm run supabase:types
git diff lib/supabase/database.types.ts
```

This keeps RPC signatures, table Row/Insert/Update types, and view rows
in sync with what Postgres actually has. Stale types are the reason a
few call sites still use `as any` casts (e.g. `app/s/[slug]/page.tsx`
filtering by `items.tenant_id`). Once regenerated, search for `as any`
in the codebase and drop the ones the new types make redundant.

### Wave F deploy checklist (DB hardening, 5 migrations)

After Wave F (the SQL pass that closed the DBA-audit findings), apply
the migrations IN ORDER — they have inter-dependencies (the audit_log
table is referenced by all the others' self-audit inserts):

```bash
for f in supabase/migrations/20260523_audit_log.sql \
         supabase/migrations/20260524_rpc_locks.sql \
         supabase/migrations/20260525_rls_perf.sql \
         supabase/migrations/20260526_storefront_view.sql \
         supabase/migrations/20260527_tenant_id_not_null.sql; do
  QUERY=$(jq -Rs . < "$f")
  echo "Applying $f …"
  curl -fsSL -X POST \
    "https://api.supabase.com/v1/projects/bleezrdtmthhvsrsvfmp/database/query" \
    -H "Authorization: Bearer $SUPABASE_PAT" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $QUERY}" || break
done
```

**If `20260527_tenant_id_not_null.sql` aborts** with "orphan rows
present", the migration has surfaced an existing data bug. Find them:

```sql
SELECT 'items' AS t, count(*) FROM items WHERE tenant_id IS NULL
UNION ALL SELECT 'suppliers',  count(*) FROM suppliers  WHERE tenant_id IS NULL
UNION ALL SELECT 'sales_orders', count(*) FROM sales_orders WHERE tenant_id IS NULL
-- … etc
;
```

Either backfill them (preferred) or DELETE them after confirming with
the data owner. Then re-run the migration.

**Post-apply smoke tests:**

```sql
-- 1. audit_log writers work
SELECT count(*) FROM audit_log WHERE action LIKE 'migration.%';   -- ≥ 5

-- 2. Storefront view only exposes safe columns
SET ROLE anon;
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'vw_public_storefront_tenants';
-- expect: id, slug, store_name, logo_url, owner_phone (only)
RESET ROLE;

-- 3. RPC locks: no oversell (manual concurrency test in a staging tenant)
--    Run two psql sessions, BEGIN, both call place_sales_order for the
--    same last-unit item. Second one should RAISE EXCEPTION on stock check.
```

After Wave F applies cleanly, regenerate types:

```bash
npm run supabase:types
git diff lib/supabase/database.types.ts
git commit -am "chore: regenerate Supabase types after Wave F"
```

Then drop the remaining `as any` casts in `app/s/[slug]/page.tsx`
(the new views will be in the types).

### Wave A–E deploy checklist (post-refactor)

After pulling the Wave-E branch into production:

1. **Apply the storefront RLS migration:**
   ```bash
   FILE=supabase/migrations/20260522_public_storefront.sql
   QUERY=$(jq -Rs . < "$FILE")
   curl -X POST \
     "https://api.supabase.com/v1/projects/bleezrdtmthhvsrsvfmp/database/query" \
     -H "Authorization: Bearer $SUPABASE_PAT" \
     -H "Content-Type: application/json" \
     -d "{\"query\": $QUERY}"
   ```
   Verify anon read scope:
   ```sql
   SET ROLE anon;
   SELECT COUNT(*) FROM tenants;                 -- only active rows
   SELECT COUNT(*) FROM items;                   -- only ACTIVE of active tenants
   SELECT COUNT(*) FROM subscription_payments;   -- expect 0 / error
   RESET ROLE;
   ```

2. **Regenerate types:**
   ```bash
   npm run supabase:types
   git diff lib/supabase/database.types.ts
   git commit -am "chore: regenerate Supabase types after storefront RLS"
   ```

3. **Set the new env vars in Vercel** (see `.env.example` for the full list):
   - `NEXT_PUBLIC_PUBLIC_WHATSAPP` — real merchant-facing WhatsApp number
   - `NEXT_PUBLIC_PUBLIC_WHATSAPP_DISPLAY` — display form
   - `NEXT_PUBLIC_DEMO_URL` — point to your real demo tenant (not the
     Vercel preview URL)
   - `NEXT_PUBLIC_FOUNDER_NAME` + `NEXT_PUBLIC_FOUNDER_PHOTO` once the
     PM-audit "trust pack" content lands

4. **Smoke-test the new endpoints:**
   - `GET /api/health` — both `gateway` and `db` probes should be `ok`
   - `GET /api/account/export` (as a real tenant user) — should
     download a JSON snapshot
   - `POST /api/account/delete` with `{ "confirm": "DELETE" }` should
     400 without the body, then succeed with it (use a throwaway test
     account)
   - Visit `/s/<your-test-tenant-slug>` and confirm the public catalog
     renders and the WhatsApp links open the right number

## Plan limits (in `tenants` row)

- `max_users` — enforced by trigger `trg_enforce_user_limit`
- `max_items` — enforced by trigger `trg_enforce_item_limit`
- `max_orders_per_month` — enforced by trigger `trg_enforce_order_limit`

To bump a tenant's limits manually:

```sql
UPDATE tenants
   SET max_users = 10, max_items = 1000, max_orders_per_month = 5000
 WHERE slug = 'mystore';
```

## Deferred refactors (queued for a deliberate session)

### Recharts dynamic import
**Issue:** `recharts` (~95KB gzipped) is statically imported in 3 chart-heavy
pages: `app/app/[tenantSlug]/dashboard/page.tsx`, `app/analytics/page.tsx`,
`app/superadmin/(protected)/page.tsx`. On their own page bundles this isn't
disastrous (Next.js code-splits per-route), but the in-page paint sequence
blocks KPI cards until recharts hydrates.

**Why deferred:** A clean fix requires extracting each chart block into a
separate `'use client'` component and dynamic-importing it. Recharts'
`Tooltip` generic types (Formatter<ValueType, NameType>) lose precision
under `next/dynamic`, so a wrapper-component approach is needed (not
per-component dynamic imports). The chart pages are ~2,000 LOC combined —
this is a 4-6h refactor that needs its own session with full attention.

**Roadmap:**
1. Create `components/dashboard/DashboardCharts.tsx` wrapping all dashboard
   chart blocks; dynamic-import from page.
2. Same for `components/analytics/AnalyticsCharts.tsx`.
3. Same for `components/superadmin/SuperadminCharts.tsx`.

### StockContext split
**Issue:** `lib/StockContext.tsx` holds items, suppliers, stockIn, stockOut,
currentStock, purchaseInvoices, salesOrders in one provider. Its value
memo has 30+ deps; any mutation triggers re-render in every consumer.

**Why deferred:** Splitting it touches dozens of files. The optimistic
mutations + O(1) balance Map already absorbed the worst pain points.

**Roadmap:**
1. Extract `ItemsContext`, `SuppliersContext`, `MovementsContext`,
   `OrdersContext`, `PurchasesContext`.
2. Or migrate to TanStack Query for per-resource cache invalidation.
3. Audit each consumer to subscribe to the minimal slice it needs.

### StockContext split — current state (after Phase 6)
**Status:** Still deferred. Phase 6 successfully cleared the other 3 deferred
items (orders row animations, dashboard recharts lazy, analytics recharts
lazy via whole-page dynamic import), but `lib/StockContext.tsx` remains a
single 800-line provider with 7 state arrays and a 30-dep value memo.

**Current cost:** `useStock()` is consumed by 29 components. Any mutation
that updates one slice (e.g. `addSalesOrder` → `setSalesOrders`) re-renders
all 29 consumers regardless of which slice they actually read.

**Recommended approach for a future session (4-6 hours, isolated branch):**

1. Create 5 leaf contexts inside `StockContext.tsx`:
   - `ItemsCtx` — items + addItem/updateItem/deleteItem
   - `SuppliersCtx` — suppliers + addSupplier/updateSupplier/deleteSupplier
   - `MovementsCtx` — stockIn, stockOut, currentStock + their mutations
   - `OrdersCtx` — salesOrders + add/update/delete
   - `PurchasesCtx` — purchaseInvoices + add/receive/delete

2. Compose them under a single `StockProvider` (no change to root layout).

3. Add per-slice hooks: `useItems()`, `useSuppliers()`, etc. Each returns
   only its slice. Existing `useStock()` becomes a compatibility shim that
   merges all 5 — keep it temporarily so the migration can be incremental.

4. Audit each consumer (29 files) and switch to the narrowest hook. Most
   consumers only need 1-2 slices.

5. Once all consumers are migrated, optionally deprecate `useStock()`.

**Why not done in Phase 6:** Touches 29 files; each consumer destructures
2-7 slices on average; mutations involve cross-slice updates (e.g. a sale
mutates 4 slices). Migrating safely requires per-file verification and is
incompatible with the "ship 3 items + commit" cadence used in Phase 6.

**Tracking:** Cut a `chore/stock-context-split` branch when ready.
