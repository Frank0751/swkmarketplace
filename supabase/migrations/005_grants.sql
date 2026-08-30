-- ─── 005: Table-level grants for PostgREST roles ───────────────────────────────
--
-- RLS policies only take effect once a role has been granted access to the
-- table at all — without a GRANT, PostgREST's anon/authenticated roles get
-- "permission denied" before RLS is even evaluated. Migration 001 enabled RLS
-- and defined policies for every table but never granted the underlying
-- table privileges, so every query (including public product browsing) was
-- rejected outright. These grants match what each existing policy already
-- intends to allow; RLS continues to enforce row-level access.

-- anon: public, unauthenticated browsing only (products/vendors/reviews)
grant select on public.products        to anon;
grant select on public.vendor_profiles to anon;
grant select on public.product_reviews to anon;

-- authenticated: buyers, vendors, and admins alike (RLS narrows by row)
grant select, insert, update           on public.users           to authenticated;
grant select, insert, update           on public.vendor_profiles  to authenticated;
grant select, insert, update, delete   on public.products         to authenticated;
grant select, insert, update           on public.orders           to authenticated;
grant select, update                   on public.payouts          to authenticated;
grant select                           on public.order_history    to authenticated;
grant select, insert                   on public.product_reviews  to authenticated;
