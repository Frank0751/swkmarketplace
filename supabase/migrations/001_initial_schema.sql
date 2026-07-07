-- ═══════════════════════════════════════════════════════════════
-- SWK Marketplace — Full Database Schema
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search

-- ─── ENUMS ───────────────────────────────────────────────────────

create type user_role    as enum ('buyer', 'vendor', 'admin');
create type user_status  as enum ('active', 'suspended', 'pending');
create type vendor_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type product_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'paused', 'sold_out');
create type order_status as enum (
  'pending', 'paid', 'confirmed', 'dispatched',
  'delivered', 'released', 'disputed', 'refunded', 'cancelled'
);
create type payout_status as enum ('held', 'pending_release', 'released', 'failed');
create type product_category as enum (
  'agribusiness', 'recycled_upcycled', 'handmade_crafts', 'organic_produce'
);
create type ghana_region as enum (
  'Greater Accra', 'Ashanti', 'Eastern', 'Western', 'Central',
  'Volta', 'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo',
  'Oti', 'Savannah', 'North East', 'Western North', 'Ahafo', 'Bono East'
);

-- ─── USERS ───────────────────────────────────────────────────────

create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text not null,
  avatar_url    text,
  phone         text,
  role          user_role not null default 'buyer',
  status        user_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── VENDOR PROFILES ─────────────────────────────────────────────

create table public.vendor_profiles (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.users(id) on delete cascade,
  business_name           text not null,
  business_description    text not null,
  category                product_category not null,
  location                text not null,
  region                  ghana_region not null,
  phone                   text not null,
  social_links            jsonb default '{}',
  sustainability_statement text not null,
  proof_documents         text[] default '{}',
  logo_url                text,
  banner_url              text,
  status                  vendor_status not null default 'pending',
  rejection_reason        text,
  total_sales             numeric(12,2) not null default 0,
  total_products          integer not null default 0,
  rating                  numeric(3,2) not null default 0,
  review_count            integer not null default 0,
  approved_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique(user_id)
);

-- ─── PRODUCTS ────────────────────────────────────────────────────

create table public.products (
  id                uuid primary key default uuid_generate_v4(),
  vendor_id         uuid not null references public.vendor_profiles(id) on delete cascade,
  title             text not null,
  slug              text not null unique,
  description       text not null,
  short_description text not null,
  price_ghs         numeric(10,2) not null check (price_ghs > 0),
  stock_quantity    integer not null default 0 check (stock_quantity >= 0),
  images            text[] not null default '{}',
  category          product_category not null,
  sdg_tags          text[] not null default '{}',
  value_tags        text[] not null default '{}',
  location          text not null,
  region            ghana_region not null,
  unit              text,
  minimum_order     integer default 1,
  status            product_status not null default 'draft',
  rejection_reason  text,
  views             integer not null default 0,
  order_count       integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Full-text search index
create index products_search_idx on public.products
  using gin(to_tsvector('english', title || ' ' || description || ' ' || coalesce(short_description, '')));
create index products_category_idx on public.products(category);
create index products_status_idx on public.products(status);
create index products_vendor_idx on public.products(vendor_id);
create index products_region_idx on public.products(region);

-- ─── ORDERS ──────────────────────────────────────────────────────

create table public.orders (
  id                      uuid primary key default uuid_generate_v4(),
  reference               text not null unique,
  buyer_id                uuid not null references public.users(id),
  vendor_id               uuid not null references public.vendor_profiles(id),
  product_id              uuid not null references public.products(id),
  quantity                integer not null check (quantity > 0),
  unit_price              numeric(10,2) not null,
  subtotal                numeric(10,2) not null,
  delivery_fee            numeric(10,2) not null default 0,
  total_amount            numeric(10,2) not null,
  status                  order_status not null default 'pending',
  delivery_address        text not null,
  delivery_region         ghana_region not null,
  buyer_notes             text,
  vendor_notes            text,
  admin_notes             text,
  paystack_reference      text,
  paystack_transaction_id text,
  dispatched_at           timestamptz,
  delivered_at            timestamptz,
  released_at             timestamptz,
  estimated_delivery      text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index orders_buyer_idx  on public.orders(buyer_id);
create index orders_vendor_idx on public.orders(vendor_id);
create index orders_status_idx on public.orders(status);
create index orders_ref_idx    on public.orders(reference);

-- ─── PAYOUTS ─────────────────────────────────────────────────────

create table public.payouts (
  id                    uuid primary key default uuid_generate_v4(),
  order_id              uuid not null references public.orders(id) on delete cascade,
  vendor_id             uuid not null references public.vendor_profiles(id),
  gross_amount          numeric(10,2) not null,
  commission_rate       numeric(5,2) not null default 15.00,
  commission_amount     numeric(10,2) not null,
  net_amount            numeric(10,2) not null,
  status                payout_status not null default 'held',
  released_at           timestamptz,
  paystack_transfer_id  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(order_id)
);

create index payouts_vendor_idx on public.payouts(vendor_id);
create index payouts_status_idx on public.payouts(status);

-- ─── ORDER STATUS HISTORY ────────────────────────────────────────

create table public.order_history (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      order_status not null,
  note        text,
  created_by  uuid references public.users(id),
  created_at  timestamptz not null default now()
);

-- ─── PRODUCT REVIEWS ─────────────────────────────────────────────

create table public.product_reviews (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id) on delete cascade,
  order_id    uuid not null references public.orders(id),
  buyer_id    uuid not null references public.users(id),
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique(order_id, buyer_id)
);

-- ─── TRIGGERS ────────────────────────────────────────────────────

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at          before update on public.users          for each row execute function update_updated_at();
create trigger vendor_profiles_updated_at before update on public.vendor_profiles for each row execute function update_updated_at();
create trigger products_updated_at       before update on public.products        for each row execute function update_updated_at();
create trigger orders_updated_at         before update on public.orders          for each row execute function update_updated_at();
create trigger payouts_updated_at        before update on public.payouts         for each row execute function update_updated_at();

-- Auto-generate order reference
create or replace function generate_order_reference()
returns trigger as $$
begin
  new.reference = 'SWK-' || upper(substring(md5(new.id::text) from 1 for 8));
  return new;
end;
$$ language plpgsql;

create trigger orders_reference before insert on public.orders
  for each row execute function generate_order_reference();

-- Auto-create payout when order paid
create or replace function create_payout_on_payment()
returns trigger as $$
declare
  commission_rate numeric := 15.00;
  comm_amount numeric;
  net_amount numeric;
begin
  if new.status = 'paid' and old.status = 'pending' then
    comm_amount := round(new.total_amount * commission_rate / 100, 2);
    net_amount  := new.total_amount - comm_amount;
    insert into public.payouts (order_id, vendor_id, gross_amount, commission_rate, commission_amount, net_amount)
    values (new.id, new.vendor_id, new.total_amount, commission_rate, comm_amount, net_amount);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger orders_create_payout after update on public.orders
  for each row execute function create_payout_on_payment();

-- Auto-log order status changes
create or replace function log_order_status_change()
returns trigger as $$
begin
  if new.status <> old.status then
    insert into public.order_history (order_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger orders_log_status after update on public.orders
  for each row execute function log_order_status_change();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────

alter table public.users           enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.products        enable row level security;
alter table public.orders          enable row level security;
alter table public.payouts         enable row level security;
alter table public.order_history   enable row level security;
alter table public.product_reviews enable row level security;

-- Helper: get current user role
create or replace function get_my_role()
returns user_role as $$
  select role from public.users where id = auth.uid();
$$ language sql security definer stable;

-- Helper: is admin?
create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$ language sql security definer stable;

-- USERS policies
create policy "users_select_own"   on public.users for select using (id = auth.uid() or is_admin());
create policy "users_update_own"   on public.users for update using (id = auth.uid());
create policy "users_insert_own"   on public.users for insert with check (id = auth.uid());

-- VENDOR PROFILES policies
create policy "vendors_select_public"  on public.vendor_profiles for select using (status = 'approved' or user_id = auth.uid() or is_admin());
create policy "vendors_insert_own"     on public.vendor_profiles for insert with check (user_id = auth.uid());
create policy "vendors_update_own"     on public.vendor_profiles for update using (user_id = auth.uid() or is_admin());

-- PRODUCTS policies
create policy "products_select_public" on public.products for select using (status = 'approved' or vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()) or is_admin());
create policy "products_insert_vendor" on public.products for insert with check (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid() and status = 'approved'));
create policy "products_update_vendor" on public.products for update using (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()) or is_admin());
create policy "products_delete_vendor" on public.products for delete using (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()) or is_admin());

-- ORDERS policies
create policy "orders_select_parties"  on public.orders for select using (buyer_id = auth.uid() or vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()) or is_admin());
create policy "orders_insert_buyer"    on public.orders for insert with check (buyer_id = auth.uid());
create policy "orders_update_parties"  on public.orders for update using (buyer_id = auth.uid() or vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()) or is_admin());

-- PAYOUTS policies
create policy "payouts_select_vendor"  on public.payouts for select using (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()) or is_admin());
create policy "payouts_update_admin"   on public.payouts for update using (is_admin());

-- ORDER HISTORY policies
create policy "history_select_parties" on public.order_history for select using (
  order_id in (select id from public.orders where buyer_id = auth.uid() or vendor_id in (select id from public.vendor_profiles where user_id = auth.uid())) or is_admin()
);

-- REVIEWS policies
create policy "reviews_select_all"    on public.product_reviews for select using (true);
create policy "reviews_insert_buyer"  on public.product_reviews for insert with check (buyer_id = auth.uid());

-- ─── STORAGE BUCKETS ─────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('vendor-docs', 'vendor-docs', false),
  ('vendor-logos', 'vendor-logos', true),
  ('vendor-banners', 'vendor-banners', true);
