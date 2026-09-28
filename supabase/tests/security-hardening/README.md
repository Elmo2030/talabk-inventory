# Security hardening check (migration 20260601)

Local-only check with fake tenants. It never touches the real project.

```bash
createdb talabk_t
psql -d talabk_t -f harness.sql        # minimal Supabase-like schema + the original (vulnerable) objects
psql -d talabk_t -f attacks.sql        # before: #1, #2, #5, #7, #12 succeed (vulnerable)
psql -d talabk_t -f ../../migrations/20260601_security_hardening.sql
psql -d talabk_t -f attacks.sql        # after: every line matches its "want:" note
```
