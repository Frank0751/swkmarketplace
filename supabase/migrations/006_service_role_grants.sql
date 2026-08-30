-- ─── 006: Service-role grants + first admin ───────────────────────────────────
--
-- Migration 005 granted table privileges to `anon` and `authenticated` but not
-- to `service_role`. Ten API routes use createAdminClient(), which authenticates
-- as service_role: vendor approve/reject, product approve/reject, order status
-- updates, payout release, review creation, order creation, and both Paystack
-- endpoints. Without these grants every one of those fails with
-- "permission denied for table ...", so admin actions and the payment webhook
-- would break even though the UI looks fine.
--
-- service_role also bypasses RLS by design; these are the underlying table
-- privileges that must exist before RLS is even consulted.

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Keep future tables working without another migration
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;


-- ─── Promote the first admin ──────────────────────────────────────────────────
--
-- There is no way to become an admin through the app: the signup form only
-- offers buyer and vendor, and the handle_new_user trigger in migration 004
-- deliberately coerces any other requested role to 'buyer' so nobody can make
-- themselves an admin by tampering with the signup payload. The first admin
-- therefore has to be promoted here.
--
-- HOW TO USE:
--   1. Sign up normally at /signup with the email you want to be the admin,
--      and click the confirmation link so the account is active.
--   2. Replace the address below with that email.
--   3. Run this statement.
--
-- Re-running is harmless; it simply updates the same row again.

update public.users
set role = 'admin'
where email = 'REPLACE-WITH-YOUR-ADMIN-EMAIL@swkghana.org';

-- Check it worked. This should list your admin account.
-- select email, role, status from public.users where role = 'admin';
