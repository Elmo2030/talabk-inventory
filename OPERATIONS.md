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

Migration files live in `supabase/part1.sql`, `part2.sql`, `part3.sql`.

Apply via Supabase Management API (works for any size):

```bash
QUERY=$(jq -Rs . < supabase/part1.sql)
curl -X POST "https://api.supabase.com/v1/projects/bleezrdtmthhvsrsvfmp/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $QUERY}"
```

Use `IF NOT EXISTS` / `OR REPLACE` everywhere to keep migrations idempotent.

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
