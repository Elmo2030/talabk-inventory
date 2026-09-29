\unset QUIET
\set ON_ERROR_STOP off
\set VERBOSITY terse
-- Tenant A user (fake account)
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","tenant_id":"11111111-1111-1111-1111-111111111111","user_role":"tenant_admin"}',false);
\echo '#1 read other tenants stats (want: denied)'
SELECT store_name, gmv FROM vw_tenant_stats;
\echo '#2 insert approved payment with amount 1 (want: RLS violation)'
INSERT INTO subscription_payments (tenant_id, plan, billing_months, amount, currency, status) VALUES ('11111111-1111-1111-1111-111111111111','pro',1,1,'LYD','approved');
\echo '#3 insert pending payment with wrong amount (want: RLS violation)'
INSERT INTO subscription_payments (tenant_id, plan, billing_months, amount, currency, status) VALUES ('11111111-1111-1111-1111-111111111111','pro',1,1,'LYD','pending');
\echo '#4 legit request pro x3 = 709.65 (want: INSERT 0 1)'
INSERT INTO subscription_payments (tenant_id, plan, billing_months, amount, currency, status) VALUES ('11111111-1111-1111-1111-111111111111','pro',3,709.65,'LYD','pending');
\echo '#5 burn tenant B order numbers (want: tenant mismatch)'
SELECT next_order_number('22222222-2222-2222-2222-222222222222','SO');
\echo '#6 own order number (want: SO-yyyy-0001)'
SELECT next_order_number('11111111-1111-1111-1111-111111111111','SO');
\echo '#7 rewrite plan prices (want: denied)'
UPDATE plan_limits SET monthly_fee = 0;
\echo '#8 read plan prices (want: 4 rows)'
SELECT count(*) FROM plan_limits;
\echo '#9 tenant calls get_tenant_stats (want: Access denied)'
SELECT count(*) FROM get_tenant_stats();
RESET ROLE;
-- Super admin
SET ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000009","user_role":"super_admin"}',false);
\echo '#10 super admin stats via function (want: 2)'
SELECT count(*) FROM get_tenant_stats();
\echo '#11 super admin approves (want: UPDATE 1)'
UPDATE subscription_payments SET status='approved', reviewed_at=now() WHERE plan='pro' AND billing_months=3;
RESET ROLE;
\echo '#12 anon cannot call next_order_number (want: denied)'
SET ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',false);
SELECT next_order_number('11111111-1111-1111-1111-111111111111','SO');
RESET ROLE;
