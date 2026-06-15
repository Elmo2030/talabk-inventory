# Archive — superseded SQL bundles

These files are historical snapshots from before the project adopted
sequenced `supabase/migrations/*.sql`. They are kept here for audit
trail but **must not** be re-applied to a live database — the
`migrations/` directory is the single source of truth.

| File | What it was | Replaced by |
|------|-------------|-------------|
| `ALL_MIGRATIONS.sql` | Full schema dump from May 16 | `migrations/20260515_*.sql` through `20260521_*.sql` |
| `migration.sql` | Earliest single-file migration | `migrations/20260515_multi_tenant.sql` |
| `part1.sql` / `part2.sql` / `part3.sql` | Three-part bundle for manual application | The eight timestamped files in `migrations/` |

The `OPERATIONS.md` runbook references the Supabase Management API
workflow for applying `migrations/` files going forward.
