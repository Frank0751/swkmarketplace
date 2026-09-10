-- ─── 007: Pre-launch hardening ─────────────────────────────────────────────────
--
-- Until now the database trusted the browser. The API routes check roles and
-- compute prices properly, but every signed-in user also holds a Supabase
-- session that can write to tables directly, and the policies from 001 let
-- people edit ANY column of a row they own. Tested against 001-006, a
-- signed-in user could:
--   - make themselves an admin (users.role) or lift their own suspension
--   - approve their own vendor application, or fake their rating and sales
--   - publish a listing without review, or swap its photos after approval
--   - create an order already marked 'paid', or change an unpaid order's total
--
-- This migration closes those holes without breaking the pages that write from
-- the browser on purpose (sign-up, settings, vendor application, store profile,
-- listing forms):
--   1. Guard triggers on users, vendor_profiles and products let owners edit
--      their own content but never the fields SWK Ghana controls.
--   2. Orders and payouts become read-only from the browser. Every legitimate
--      change already goes through an API route using the service role.
--   3. Stock, order counts, fulfilled-order counts and live-listing counts are
--      now maintained by the database; previously nothing updated them.
--   4. New: a delivery phone on orders, private vendor payout details, private
--      vendor verification documents, and the product view counter that the
--      product page was already calling.
--
-- Safe to run more than once. Everything runs in one transaction, so it either
-- applies completely or not at all.

begin;

-- A payout for an order that was refunded must never be released
alter type public.payout_status add value if not exists 'cancelled';

-- ─── Who may write the fields SWK Ghana controls ──────────────────────────────
--
-- Deliberately NOT security definer: current_user must be the caller's role.
-- postgres        = SQL editor, migrations, and security-definer internals
-- service_role    = the app's API routes (createAdminClient)
-- is_admin()      = an SWK Ghana admin signed in to the app

create or replace function public.is_privileged_writer()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin')
      or coalesce(public.is_admin(), false)
$$;

-- ─── users: nobody promotes themselves ────────────────────────────────────────

create or replace function public.guard_users_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Same rule as handle_new_user(): buyer or vendor are the only choices
    if new.role is distinct from 'buyer' and new.role is distinct from 'vendor' then
      new.role := 'buyer';
    end if;
    new.status := 'active';
    return new;
  end if;

  if new.email is distinct from old.email or new.status is distinct from old.status then
    raise exception 'You can''t change your email or account status here'
      using errcode = '42501';
  end if;

  -- The one self-service role change: a buyer applying to sell. Approval is
  -- still gated on vendor_profiles.status, which only SWK Ghana can set.
  if new.role is distinct from old.role
     and not (old.role = 'buyer' and new.role = 'vendor') then
    raise exception 'You can''t change your own role'
      using errcode = '42501';
  end if;

  return new;
end
$$;

drop trigger if exists users_guard on public.users;
create trigger users_guard
  before insert or update on public.users
  for each row execute function public.guard_users_write();

-- ─── vendor_profiles: only SWK Ghana approves ─────────────────────────────────

create or replace function public.guard_vendor_profiles_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status           := 'pending';
    new.rejection_reason := null;
    new.approved_at      := null;
    new.total_sales      := 0;
    new.total_products   := 0;
    new.rating           := 0;
    new.review_count     := 0;
    return new;
  end if;

  -- A rejected applicant may resubmit. Nothing else moves the status.
  if new.status is distinct from old.status
     and not (old.status = 'rejected' and new.status = 'pending') then
    raise exception 'Only SWK Ghana can change a vendor''s approval status'
      using errcode = '42501';
  end if;

  if new.user_id          is distinct from old.user_id
     or new.approved_at      is distinct from old.approved_at
     or new.rejection_reason is distinct from old.rejection_reason
     or new.total_sales      is distinct from old.total_sales
     or new.total_products   is distinct from old.total_products
     or new.rating           is distinct from old.rating
     or new.review_count     is distinct from old.review_count then
    raise exception 'These fields are managed by SWK Ghana'
      using errcode = '42501';
  end if;

  return new;
end
$$;

drop trigger if exists vendor_profiles_guard on public.vendor_profiles;
create trigger vendor_profiles_guard
  before insert or update on public.vendor_profiles
  for each row execute function public.guard_vendor_profiles_write();

-- ─── products: only SWK Ghana reviews ─────────────────────────────────────────

create or replace function public.guard_products_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Every new listing waits for review
    if new.status is distinct from 'draft' then
      new.status := 'pending_review';
    end if;
    new.rejection_reason := null;
    new.views            := 0;
    new.order_count      := 0;
    return new;
  end if;

  if new.vendor_id      is distinct from old.vendor_id
     or new.views       is distinct from old.views
     or new.order_count is distinct from old.order_count then
    raise exception 'These listing fields are managed by SWK Ghana'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    raise exception 'Only SWK Ghana can approve or reject a listing'
      using errcode = '42501';
  end if;

  -- Buyers must see what was reviewed: changing the words, photos or category
  -- of a live listing sends it back for review. Price and stock stay live.
  if old.status = 'approved' and new.status = 'approved' and (
       new.title             is distinct from old.title
    or new.description       is distinct from old.description
    or new.short_description is distinct from old.short_description
    or new.images            is distinct from old.images
    or new.category          is distinct from old.category
  ) then
    new.status := 'pending_review';
  end if;

  if old.status = 'rejected' and new.status = 'pending_review' then
    -- Resubmitting a rejected listing starts from a clean slate
    new.rejection_reason := null;
  elsif new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Only SWK Ghana can set a rejection reason'
      using errcode = '42501';
  end if;

  return new;
end
$$;

drop trigger if exists products_guard on public.products;
create trigger products_guard
  before insert or update on public.products
  for each row execute function public.guard_products_write();

-- ─── Orders and payouts: read-only from the browser ───────────────────────────

revoke insert, update, delete on public.orders from authenticated, anon;
drop policy if exists "orders_insert_buyer"   on public.orders;
drop policy if exists "orders_update_parties" on public.orders;

revoke insert, update, delete on public.payouts from authenticated, anon;
drop policy if exists "payouts_update_admin" on public.payouts;

-- Buyers give a number the vendor can call to arrange delivery
alter table public.orders add column if not exists delivery_phone text;

-- ─── Counters the database now keeps honest ───────────────────────────────────
--
-- Security definer so the bookkeeping runs no matter who changed the order.
-- The guards above treat these internal writes as privileged (postgres).

create or replace function public.apply_order_effects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- Payment received: take the stock and count the order
  if new.status = 'paid' and old.status = 'pending' then
    update public.products
       set stock_quantity = greatest(stock_quantity - new.quantity, 0),
           order_count    = order_count + 1
     where id = new.product_id;
  end if;

  -- Money went back to the buyer: return the stock and cancel the held payout
  if new.status in ('refunded', 'cancelled')
     and old.status in ('paid', 'confirmed', 'dispatched', 'disputed') then
    update public.products
       set stock_quantity = stock_quantity + new.quantity,
           order_count    = greatest(order_count - 1, 0)
     where id = new.product_id;
    update public.payouts
       set status = 'cancelled'
     where order_id = new.id
       and status in ('held', 'pending_release');
  end if;

  -- A fulfilled order counts once toward the vendor's public track record
  -- (shown on the store page as "Orders fulfilled")
  if (new.status = 'delivered' and old.status <> 'delivered')
     or (new.status = 'released' and old.status not in ('delivered', 'released')) then
    update public.vendor_profiles
       set total_sales = total_sales + 1
     where id = new.vendor_id;
  end if;

  return new;
end
$$;

drop trigger if exists orders_apply_effects on public.orders;
create trigger orders_apply_effects
  after update of status on public.orders
  for each row execute function public.apply_order_effects();

create or replace function public.recount_vendor_products(target uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.vendor_profiles
     set total_products = (
       select count(*) from public.products
        where vendor_id = target and status = 'approved'
     )
   where id = target;
$$;

create or replace function public.refresh_vendor_product_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recount_vendor_products(old.vendor_id);
    return old;
  end if;

  perform public.recount_vendor_products(new.vendor_id);
  if tg_op = 'UPDATE' and old.vendor_id is distinct from new.vendor_id then
    perform public.recount_vendor_products(old.vendor_id);
  end if;
  return new;
end
$$;

drop trigger if exists products_refresh_vendor_count on public.products;
create trigger products_refresh_vendor_count
  after insert or delete or update of status, vendor_id on public.products
  for each row execute function public.refresh_vendor_product_count();

revoke all on function public.recount_vendor_products(uuid) from public, anon, authenticated;

-- Bring existing rows in line with the new rules
update public.vendor_profiles vp
   set total_products = (
         select count(*) from public.products p
          where p.vendor_id = vp.id and p.status = 'approved'),
       total_sales = (
         select count(*) from public.orders o
          where o.vendor_id = vp.id and o.status in ('delivered', 'released'));

-- The product page calls this to count a visit; it can only add one view to a
-- live listing
create or replace function public.increment_product_views(product_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
     set views = views + 1
   where id = product_id
     and status = 'approved';
$$;

revoke all on function public.increment_product_views(uuid) from public;
grant execute on function public.increment_product_views(uuid) to anon, authenticated, service_role;

-- ─── Vendor payout details (private) ──────────────────────────────────────────
--
-- Where SWK Ghana sends a vendor's 85%. Kept out of vendor_profiles because
-- approved vendor profiles are publicly readable.

create table if not exists public.vendor_payout_details (
  vendor_id      uuid primary key references public.vendor_profiles(id) on delete cascade,
  method         text not null check (method in ('momo', 'bank')),
  momo_network   text check (momo_network in ('MTN MoMo', 'Telecel Cash', 'AT Money')),
  bank_name      text,
  account_name   text not null check (length(btrim(account_name)) >= 2),
  account_number text not null check (length(regexp_replace(account_number, '\D', '', 'g')) between 9 and 20),
  updated_at     timestamptz not null default now(),
  check (
    (method = 'momo' and momo_network is not null)
    or (method = 'bank' and bank_name is not null and length(btrim(bank_name)) > 1)
  )
);

alter table public.vendor_payout_details enable row level security;

drop policy if exists "payout_details_select" on public.vendor_payout_details;
drop policy if exists "payout_details_insert" on public.vendor_payout_details;
drop policy if exists "payout_details_update" on public.vendor_payout_details;

create policy "payout_details_select" on public.vendor_payout_details for select
  using (
    vendor_id in (select id from public.vendor_profiles where user_id = auth.uid())
    or public.is_admin()
  );
create policy "payout_details_insert" on public.vendor_payout_details for insert
  with check (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()));
create policy "payout_details_update" on public.vendor_payout_details for update
  using (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()));

revoke all on public.vendor_payout_details from anon, authenticated;
grant select, insert, update on public.vendor_payout_details to authenticated;
grant all on public.vendor_payout_details to service_role;

drop trigger if exists vendor_payout_details_updated_at on public.vendor_payout_details;
create trigger vendor_payout_details_updated_at
  before update on public.vendor_payout_details
  for each row execute function public.update_updated_at();

-- ─── Vendor verification documents (private) ──────────────────────────────────
--
-- Photos an applicant submits as evidence (registration certificate, products,
-- workspace). Stored in Cloudinary as authenticated assets; only the public_id
-- lives here, and viewing one needs a signed URL generated for an admin.

create table if not exists public.vendor_documents (
  id         uuid primary key default uuid_generate_v4(),
  vendor_id  uuid not null references public.vendor_profiles(id) on delete cascade,
  public_id  text not null,
  label      text,
  created_at timestamptz not null default now()
);

create index if not exists vendor_documents_vendor_idx on public.vendor_documents(vendor_id);

alter table public.vendor_documents enable row level security;

drop policy if exists "vendor_documents_select" on public.vendor_documents;
drop policy if exists "vendor_documents_insert" on public.vendor_documents;

create policy "vendor_documents_select" on public.vendor_documents for select
  using (
    vendor_id in (select id from public.vendor_profiles where user_id = auth.uid())
    or public.is_admin()
  );
create policy "vendor_documents_insert" on public.vendor_documents for insert
  with check (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()));

revoke all on public.vendor_documents from anon, authenticated;
grant select, insert on public.vendor_documents to authenticated;
grant all on public.vendor_documents to service_role;

-- ─── Pin search_path on existing functions (Supabase security linter) ─────────

alter function public.get_my_role()               set search_path = public;
alter function public.is_admin()                  set search_path = public;
alter function public.refresh_vendor_rating()     set search_path = public;
alter function public.update_updated_at()         set search_path = public;
alter function public.generate_order_reference()  set search_path = public;
alter function public.create_payout_on_payment()  set search_path = public;
alter function public.log_order_status_change()   set search_path = public;
alter function public.generate_vendor_slug()      set search_path = public;

commit;

-- Expect safeguards_installed = 5
select
  'Migration 007 applied' as status,
  (select count(*) from pg_trigger
    where tgname in ('users_guard', 'vendor_profiles_guard', 'products_guard',
                     'orders_apply_effects', 'products_refresh_vendor_count')) as safeguards_installed;
