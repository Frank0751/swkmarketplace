-- ─── 008: Cart checkout, saved payment methods, and a real sample catalogue ───
--
-- Until now the sample shops and products lived only inside the app's code, so
-- they could be browsed but never bought: an order has to point at a real
-- product row. This migration:
--   1. Puts the 4 sample shops and 13 sample products into the database,
--      flagged is_demo, so a buyer can add them to a cart and check out. Their
--      orders, escrow payouts, stock and reviews run through exactly the same
--      triggers as real ones. Sample shops have no owner account.
--   2. Adds checkouts: one payment for a whole cart. Each item still becomes
--      its own order (vendors ship separately and each order has its own
--      escrow), created only once the payment succeeds, so an abandoned
--      checkout never leaves unpaid orders behind.
--   3. Adds saved payment methods (cards, mobile money) and saved delivery
--      addresses for faster checkout.
--   4. Gives admins functions to reset the sample data between rehearsals and
--      to hide the sample shops before launch.
--
-- Sample orders are paid with the built-in test payment (no money moves). The
-- database makes sure that can never touch a real product: only SWK Ghana can
-- set is_demo, and a checkout can't mix sample and real items.
--
-- Safe to run more than once. Everything runs in one transaction.

begin;

-- ─── Sample flags ─────────────────────────────────────────────────────────────

alter table public.vendor_profiles add column if not exists is_demo boolean not null default false;
alter table public.products        add column if not exists is_demo boolean not null default false;
alter table public.orders          add column if not exists is_demo boolean not null default false;

-- A sample shop has no owner account; every real shop still needs one
alter table public.vendor_profiles alter column user_id drop not null;
alter table public.vendor_profiles drop constraint if exists vendor_profiles_owner_required;
alter table public.vendor_profiles add constraint vendor_profiles_owner_required
  check (user_id is not null or is_demo);

-- ─── Guards: is_demo is SWK Ghana's to set ────────────────────────────────────
--
-- Same rules as migration 007, plus is_demo. A vendor who could flag their own
-- listing as a sample could have it "paid" with the test payment and then
-- claim a payout for goods nobody paid for.

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
    new.is_demo          := false;
    return new;
  end if;

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
     or new.review_count     is distinct from old.review_count
     or new.is_demo          is distinct from old.is_demo then
    raise exception 'These fields are managed by SWK Ghana'
      using errcode = '42501';
  end if;

  return new;
end
$$;

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
    if new.status is distinct from 'draft' then
      new.status := 'pending_review';
    end if;
    new.rejection_reason := null;
    new.views            := 0;
    new.order_count      := 0;
    new.is_demo          := false;
    return new;
  end if;

  if new.vendor_id      is distinct from old.vendor_id
     or new.views       is distinct from old.views
     or new.order_count is distinct from old.order_count
     or new.is_demo     is distinct from old.is_demo then
    raise exception 'These listing fields are managed by SWK Ghana'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and new.status in ('approved', 'rejected') then
    raise exception 'Only SWK Ghana can approve or reject a listing'
      using errcode = '42501';
  end if;

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
    new.rejection_reason := null;
  elsif new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Only SWK Ghana can set a rejection reason'
      using errcode = '42501';
  end if;

  return new;
end
$$;

-- ─── Saved payment methods ────────────────────────────────────────────────────
--
-- Only what's needed to recognise a method: card brand, last 4 digits and
-- expiry, or a mobile money network and number. Never a full card number or
-- security code. provider 'demo' = saved during a test payment, usable only for
-- sample orders. Written only by the API (service role).

create table if not exists public.payment_methods (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  kind         text not null check (kind in ('card', 'momo')),
  provider     text not null default 'demo' check (provider in ('demo', 'paystack')),
  brand        text check (brand in ('visa', 'mastercard', 'verve')),
  last4        text not null check (last4 ~ '^[0-9]{4}$'),
  exp_month    smallint check (exp_month between 1 and 12),
  exp_year     smallint check (exp_year between 2020 and 2100),
  holder_name  text check (char_length(holder_name) <= 80),
  momo_network text check (momo_network in ('MTN MoMo', 'Telecel Cash', 'AT Money')),
  momo_phone   text check (momo_phone ~ '^\+233[235][0-9]{8}$'),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint payment_methods_card_fields check (
    kind <> 'card' or (brand is not null and exp_month is not null and exp_year is not null)
  ),
  constraint payment_methods_momo_fields check (
    kind <> 'momo' or (momo_network is not null and momo_phone is not null)
  )
);

create index if not exists payment_methods_user_idx on public.payment_methods(user_id);
create unique index if not exists payment_methods_one_default
  on public.payment_methods(user_id) where is_default;

alter table public.payment_methods enable row level security;
drop policy if exists "payment_methods_select_own" on public.payment_methods;
create policy "payment_methods_select_own" on public.payment_methods for select
  using (user_id = auth.uid());

revoke all on public.payment_methods from anon, authenticated;
grant select on public.payment_methods to authenticated;
grant all on public.payment_methods to service_role;

-- ─── Saved delivery addresses ─────────────────────────────────────────────────

create table if not exists public.buyer_addresses (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  label      text check (char_length(label) <= 40),
  phone      text not null check (phone ~ '^\+233[235][0-9]{8}$'),
  region     public.ghana_region not null,
  address    text not null check (char_length(address) between 5 and 300),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_addresses_user_idx on public.buyer_addresses(user_id);
create unique index if not exists buyer_addresses_one_default
  on public.buyer_addresses(user_id) where is_default;

alter table public.buyer_addresses enable row level security;
drop policy if exists "buyer_addresses_select_own" on public.buyer_addresses;
create policy "buyer_addresses_select_own" on public.buyer_addresses for select
  using (user_id = auth.uid());

revoke all on public.buyer_addresses from anon, authenticated;
grant select on public.buyer_addresses to authenticated;
grant all on public.buyer_addresses to service_role;

drop trigger if exists buyer_addresses_updated_at on public.buyer_addresses;
create trigger buyer_addresses_updated_at
  before update on public.buyer_addresses
  for each row execute function public.update_updated_at();

-- ─── Checkouts: one payment for a whole cart ──────────────────────────────────
--
-- items is the priced cart, frozen when the buyer presses Pay: one entry per
-- product with vendor_id, quantity, unit_price, subtotal, delivery_fee and
-- total, plus title/image for receipts. Prices are taken from the database by
-- the API, never from the browser. Read-only from the browser.

create table if not exists public.checkouts (
  id                      uuid primary key default uuid_generate_v4(),
  reference               text unique,
  buyer_id                uuid not null references public.users(id) on delete cascade,
  status                  text not null default 'pending'
                            check (status in ('pending', 'paid', 'cancelled')),
  is_demo                 boolean not null default false,
  items                   jsonb not null check (
                            jsonb_typeof(items) = 'array'
                            and jsonb_array_length(items) between 1 and 30),
  subtotal                numeric(10,2) not null check (subtotal > 0),
  delivery_total          numeric(10,2) not null check (delivery_total >= 0),
  total_amount            numeric(10,2) not null check (total_amount > 0),
  delivery_phone          text not null,
  delivery_region         public.ghana_region not null,
  delivery_address        text not null,
  buyer_notes             text,
  payment_channel         text check (payment_channel in ('card', 'mobile_money')),
  payment_label           text,
  paystack_reference      text unique,
  paystack_transaction_id text,
  attempts                integer not null default 0,
  last_error              text,
  paid_at                 timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists checkouts_buyer_idx on public.checkouts(buyer_id);

create or replace function public.generate_checkout_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reference is null then
    new.reference := 'PAY-' || upper(substring(md5(new.id::text || clock_timestamp()::text) from 1 for 8));
  end if;
  return new;
end
$$;

drop trigger if exists checkouts_reference on public.checkouts;
create trigger checkouts_reference
  before insert on public.checkouts
  for each row execute function public.generate_checkout_reference();

drop trigger if exists checkouts_updated_at on public.checkouts;
create trigger checkouts_updated_at
  before update on public.checkouts
  for each row execute function public.update_updated_at();

alter table public.checkouts enable row level security;
drop policy if exists "checkouts_select_own" on public.checkouts;
create policy "checkouts_select_own" on public.checkouts for select
  using (buyer_id = auth.uid() or public.is_admin());

revoke all on public.checkouts from anon, authenticated;
grant select on public.checkouts to authenticated;
grant all on public.checkouts to service_role;

alter table public.orders add column if not exists checkout_id uuid
  references public.checkouts(id) on delete set null;
create index if not exists orders_checkout_idx on public.orders(checkout_id);

-- ─── Turning a paid checkout into orders ──────────────────────────────────────
--
-- Called by the API once a payment succeeds (the test payment for samples, a
-- verified Paystack transaction for real products). Creates one order per
-- item and moves each from pending to paid, which fires the existing
-- triggers: escrow payout, stock, order count and status history. All or
-- nothing, and safe to call twice: the second call finds the checkout paid
-- and returns the same orders.

create or replace function public.fulfil_checkout(
  p_checkout_id        uuid,
  p_channel            text,
  p_label              text,
  p_paystack_reference text default null,
  p_transaction_id     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  co     public.checkouts%rowtype;
  item   jsonb;
  new_id uuid;
  ids    uuid[] := '{}';
begin
  select * into co from public.checkouts where id = p_checkout_id for update;

  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  if co.status = 'paid' then
    return jsonb_build_object(
      'outcome', 'already_paid',
      'order_ids', (select coalesce(jsonb_agg(o.id order by o.created_at), '[]'::jsonb)
                      from public.orders o where o.checkout_id = co.id));
  end if;

  if co.status <> 'pending' then
    return jsonb_build_object('outcome', 'not_pending', 'status', co.status);
  end if;

  -- Belt and braces: the test payment must never pay for a real product
  if exists (
    select 1
      from jsonb_array_elements(co.items) i
      join public.products p on p.id = (i->>'product_id')::uuid
     where p.is_demo is distinct from co.is_demo
  ) then
    raise exception 'Checkout % mixes sample and real products', co.reference
      using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(co.items) loop
    insert into public.orders (
      buyer_id, vendor_id, product_id, quantity, unit_price, subtotal,
      delivery_fee, total_amount, status, delivery_address, delivery_region,
      delivery_phone, buyer_notes, checkout_id, is_demo
    ) values (
      co.buyer_id,
      (item->>'vendor_id')::uuid,
      (item->>'product_id')::uuid,
      (item->>'quantity')::integer,
      (item->>'unit_price')::numeric,
      (item->>'subtotal')::numeric,
      (item->>'delivery_fee')::numeric,
      (item->>'total')::numeric,
      'pending',
      co.delivery_address,
      co.delivery_region,
      co.delivery_phone,
      co.buyer_notes,
      co.id,
      co.is_demo
    )
    returning id into new_id;
    ids := ids || new_id;
  end loop;

  update public.orders set status = 'paid' where id = any(ids);

  update public.checkouts
     set status                  = 'paid',
         paid_at                 = now(),
         payment_channel         = p_channel,
         payment_label           = p_label,
         paystack_reference      = coalesce(p_paystack_reference, paystack_reference),
         paystack_transaction_id = coalesce(p_transaction_id, paystack_transaction_id),
         last_error              = null
   where id = co.id;

  return jsonb_build_object('outcome', 'paid', 'order_ids', to_jsonb(ids));
end
$$;

revoke all on function public.fulfil_checkout(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.fulfil_checkout(uuid, text, text, text, text) to service_role;

-- ─── The sample catalogue ─────────────────────────────────────────────────────
--
-- One place for the sample data. The migration runs it once; resetting the
-- sample data runs it again to restore stock, counters and text. Fixed ids
-- keep it idempotent. Sample shops have no phone, links or owner.

create or replace function public.seed_sample_catalogue()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v      jsonb;
  p      jsonb;
  v_slug text;
  p_slug text;
begin
  for v in select value from jsonb_array_elements($json$[
    {
      "id": "de000000-0000-4000-a000-000000000001",
      "business_name": "GreenHarvest Farms",
      "slug": "greenharvest-farms",
      "category": "agribusiness",
      "location": "Kumasi",
      "region": "Ashanti",
      "logo_url": "/images/cat-agribusiness.jpg",
      "banner_url": "/images/cat-agribusiness.jpg",
      "business_description": "A youth-run regenerative farm collective producing honey, coffee and organic inputs while restoring degraded farmland in the Ashanti Region.",
      "sustainability_statement": "We practise regenerative agriculture: zero synthetic pesticides, agroforestry intercropping, and beekeeping that pollinates over 40 hectares of smallholder farms around Kumasi.",
      "story": "GreenHarvest Farms began in 2021 when three agricultural science graduates returned to Kumasi and leased two hectares of exhausted farmland. Instead of chemicals, they rebuilt the soil with compost, cover crops and bees. Today the collective works with 35 smallholder farmers, runs a youth-led apiary school, and supplies raw forest honey and specialty coffee to buyers across the country. Every purchase funds a seedling nursery that has already put 12,000 trees in the ground.",
      "founders": [
        {"name": "Kwame Mensah", "role": "Co-founder & Farm Director", "bio": "Agronomist. Leads regenerative farming operations and the farmer training programme."},
        {"name": "Efua Boateng", "role": "Co-founder & Head of Apiary", "bio": "Beekeeper and food scientist. Built the apiary school that has trained 60+ young beekeepers."}
      ],
      "year_founded": 2021, "team_size": 14,
      "rating": 4.9, "review_count": 31, "total_sales": 220
    },
    {
      "id": "de000000-0000-4000-a000-000000000002",
      "business_name": "Adom Organics",
      "slug": "adom-organics",
      "category": "organic_produce",
      "location": "Aburi",
      "region": "Eastern",
      "logo_url": "/images/cat-organic.jpg",
      "banner_url": "/images/hero-market.jpg",
      "business_description": "Chemical-free fruits, vegetables and cold-pressed oils grown on family plots in the Akuapem hills and delivered fresh to Accra.",
      "sustainability_statement": "Organic growing methods, plastic-free crates, and a farm-gate pricing model that pays our 22 partner farmers 30% above market rates.",
      "story": "Adom Organics started as a weekend farmers' stall run by siblings Ama and Kofi Asante. Frustrated that Aburi's best chemical-free produce never reached city buyers, they organised neighbouring family farms into a single delivery network. Adom now delivers over 300 veggie boxes a month in reusable crates, and its cold-pressed baobab and shea oils are stocked by three eco-shops in Accra.",
      "founders": [
        {"name": "Ama Asante", "role": "Co-founder & CEO", "bio": "Former nurse turned farmer-organiser. Handles quality, logistics and the veggie-box programme."},
        {"name": "Kofi Asante", "role": "Co-founder & Farm Relations", "bio": "Works with the 22 partner family farms on organic certification and fair pricing."}
      ],
      "year_founded": 2022, "team_size": 9,
      "rating": 4.8, "review_count": 47, "total_sales": 415
    },
    {
      "id": "de000000-0000-4000-a000-000000000003",
      "business_name": "Sankofa Crafts Collective",
      "slug": "sankofa-crafts-collective",
      "category": "handmade_crafts",
      "location": "Accra",
      "region": "Greater Accra",
      "logo_url": "/images/cat-handmade.jpg",
      "banner_url": "/images/cat-handmade.jpg",
      "business_description": "A women-led artisan collective crafting ceramics, jewellery and home goods from natural and reclaimed materials in Jamestown, Accra.",
      "sustainability_statement": "Local clay, reclaimed glass beads, natural soy wax and zero air-freighted materials. 70% of our makers are young women learning a lifelong craft.",
      "story": "Sankofa, \"go back and get it\", is a Jamestown studio where traditional Ga craftsmanship meets modern design. What began as evening pottery classes for six young women is now a 19-member collective making hand-thrown ceramics and recycled-glass jewellery. The collective reinvests a fifth of every sale into free apprenticeships for school leavers.",
      "founders": [
        {"name": "Abena Osei", "role": "Founder & Creative Director", "bio": "Ceramicist trained in Kumasi. Leads design and the studio's glaze research."},
        {"name": "Naa Adjeley Quaye", "role": "Studio Manager", "bio": "Runs the apprenticeship programme and the collective's fair-pay framework."}
      ],
      "year_founded": 2020, "team_size": 19,
      "rating": 4.9, "review_count": 58, "total_sales": 640
    },
    {
      "id": "de000000-0000-4000-a000-000000000004",
      "business_name": "EcoCycle Ghana",
      "slug": "ecocycle-ghana",
      "category": "recycled_upcycled",
      "location": "Tema",
      "region": "Greater Accra",
      "logo_url": "/images/cat-recycled.jpg",
      "banner_url": "/images/cat-recycled.jpg",
      "business_description": "Turning Tema's waste stream into everyday products: kraft totes, zero-waste soap and stationery made from reclaimed paper and oils.",
      "sustainability_statement": "Every product diverts waste from landfill: reclaimed kraft paper, recovered cooking oils saponified into soap, and compostable packaging only.",
      "story": "EcoCycle was founded by two environmental engineering students who audited their campus bins and found 80% of the \"waste\" was reusable. Starting with a single paper press in a Tema garage, the team now processes three tonnes of reclaimed paper and oils a month, employs 11 young people, and runs recycling drives in 15 schools.",
      "founders": [
        {"name": "Yaw Darko", "role": "Co-founder & Operations Lead", "bio": "Environmental engineer. Designs the reclaimed-material production lines."},
        {"name": "Esi Nyarko", "role": "Co-founder & Partnerships", "bio": "Runs the schools recycling programme and retail partnerships."}
      ],
      "year_founded": 2023, "team_size": 11,
      "rating": 4.7, "review_count": 22, "total_sales": 180
    }
  ]$json$::jsonb) loop
    v_slug := v->>'slug';
    if exists (select 1 from public.vendor_profiles
                where slug = v_slug and id <> (v->>'id')::uuid) then
      v_slug := v_slug || '-sample';
    end if;

    insert into public.vendor_profiles (
      id, user_id, is_demo, business_name, slug, business_description, category,
      location, region, phone, social_links, sustainability_statement, story,
      founders, year_founded, team_size, website, logo_url, banner_url, status,
      approved_at, rating, review_count, total_sales
    ) values (
      (v->>'id')::uuid, null, true, v->>'business_name', v_slug,
      v->>'business_description', (v->>'category')::public.product_category,
      v->>'location', (v->>'region')::public.ghana_region, '', '{}'::jsonb,
      v->>'sustainability_statement', v->>'story', v->'founders',
      (v->>'year_founded')::integer, (v->>'team_size')::integer, null,
      v->>'logo_url', v->>'banner_url', 'approved', timestamptz '2026-07-01 09:00:00+00',
      (v->>'rating')::numeric, (v->>'review_count')::integer, (v->>'total_sales')::numeric
    )
    on conflict (id) do update set
      is_demo                  = true,
      business_name            = excluded.business_name,
      business_description     = excluded.business_description,
      category                 = excluded.category,
      location                 = excluded.location,
      region                   = excluded.region,
      phone                    = excluded.phone,
      social_links             = excluded.social_links,
      sustainability_statement = excluded.sustainability_statement,
      story                    = excluded.story,
      founders                 = excluded.founders,
      year_founded             = excluded.year_founded,
      team_size                = excluded.team_size,
      website                  = excluded.website,
      logo_url                 = excluded.logo_url,
      banner_url               = excluded.banner_url,
      status                   = 'approved',
      rejection_reason         = null,
      approved_at              = excluded.approved_at,
      rating                   = excluded.rating,
      review_count             = excluded.review_count,
      total_sales              = excluded.total_sales;
  end loop;

  -- created_at sets the "newest" order: the shops are interleaved so the
  -- homepage's first eight show every category
  for p in select value from jsonb_array_elements($json$[
    {
      "id": "de000000-0000-4000-b000-000000000001",
      "vendor_id": "de000000-0000-4000-a000-000000000001",
      "title": "Raw Forest Honey (500ml)", "slug": "demo-raw-forest-honey",
      "price_ghs": 65, "unit": "per jar", "images": ["/images/prod-honey.jpg"],
      "category": "agribusiness", "location": "Kumasi", "region": "Ashanti",
      "short_description": "Unfiltered honey from agroforestry hives around Kumasi, harvested by youth-trained beekeepers.",
      "description": "Raw, unheated and unfiltered honey from our agroforestry apiaries in the Ashanti Region. Each jar is traceable to the hive cluster it came from, and every harvest funds our apiary school for young beekeepers.\nTasting notes: wildflower, citrus blossom, soft caramel finish.",
      "value_tags": ["organic", "youth_led", "locally_sourced"],
      "sdg_tags": ["sdg_12_responsible_consumption", "sdg_8_decent_work", "sdg_15_life_on_land"],
      "views": 342, "order_count": 58, "stock_quantity": 40,
      "created_at": "2026-07-01T09:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-000000000004",
      "vendor_id": "de000000-0000-4000-a000-000000000002",
      "title": "Weekly Organic Veggie Box", "slug": "demo-weekly-organic-veggie-box",
      "price_ghs": 120, "unit": "per box", "images": ["/images/prod-veg-box.jpg"],
      "category": "organic_produce", "location": "Aburi", "region": "Eastern",
      "short_description": "A rotating box of 8–10 chemical-free vegetables from Akuapem family farms, delivered in reusable crates.",
      "description": "Our signature box: 8–10 seasonal vegetables harvested within 24 hours of delivery, think garden eggs, kontomire, sweet peppers, spring onions and salad greens. Delivered in returnable crates, never plastic.\nDelivery to Accra & Tema every Saturday.",
      "value_tags": ["organic", "plastic_free", "locally_sourced"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 505, "order_count": 92, "stock_quantity": 20,
      "created_at": "2026-07-01T08:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-000000000009",
      "vendor_id": "de000000-0000-4000-a000-000000000003",
      "title": "Hand-Thrown Ceramic Vase Set (3 pieces)", "slug": "demo-ceramic-vase-set",
      "price_ghs": 240, "unit": "per set", "images": ["/images/prod-pottery.jpg"],
      "category": "handmade_crafts", "location": "Accra", "region": "Greater Accra",
      "short_description": "Matte stoneware vases thrown from local clay in our Jamestown studio.",
      "description": "A set of three bottle vases in speckled matte glaze, each thrown by hand from clay dug in the Eastern Region. No two sets are identical, expect beautiful small variations.\nFood-safe glaze, fired with efficient twin kilns.",
      "value_tags": ["handmade", "women_led", "locally_sourced"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 387, "order_count": 26, "stock_quantity": 8,
      "created_at": "2026-07-01T07:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-00000000000c",
      "vendor_id": "de000000-0000-4000-a000-000000000004",
      "title": "Reclaimed Kraft Tote Bag", "slug": "demo-reclaimed-kraft-tote",
      "price_ghs": 55, "unit": "each", "images": ["/images/prod-totebag.jpg"],
      "category": "recycled_upcycled", "location": "Tema", "region": "Greater Accra",
      "short_description": "Washable kraft-paper tote pressed from reclaimed packaging, carries 10kg.",
      "description": "Made from reclaimed kraft paper recovered in Tema, pressed and stitched into a washable, tear-resistant everyday tote. Carries 10kg of market shopping and composts at end of life.",
      "value_tags": ["upcycled", "zero_waste", "biodegradable"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 312, "order_count": 51, "stock_quantity": 45,
      "created_at": "2026-07-01T06:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-000000000002",
      "vendor_id": "de000000-0000-4000-a000-000000000001",
      "title": "Highland Roasted Coffee Beans (250g)", "slug": "demo-highland-coffee-beans",
      "price_ghs": 48, "unit": "per bag", "images": ["/images/prod-coffee.jpg"],
      "category": "agribusiness", "location": "Kumasi", "region": "Ashanti",
      "short_description": "Shade-grown Ghanaian arabica, sun-dried and small-batch roasted.",
      "description": "Grown under native canopy trees by our partner smallholders, these beans are hand-picked, sun-dried and roasted in small batches in Kumasi. Medium roast with notes of cocoa and red berries.\nCompostable packaging, roasted to order.",
      "value_tags": ["locally_sourced", "fair_trade"],
      "sdg_tags": ["sdg_12_responsible_consumption", "sdg_13_climate_action"],
      "views": 261, "order_count": 34, "stock_quantity": 30,
      "created_at": "2026-07-01T05:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-00000000000a",
      "vendor_id": "de000000-0000-4000-a000-000000000003",
      "title": "Recycled-Glass Statement Earrings", "slug": "demo-recycled-glass-earrings",
      "price_ghs": 95, "unit": "per pair", "images": ["/images/prod-jewelry.jpg"],
      "category": "handmade_crafts", "location": "Accra", "region": "Greater Accra",
      "short_description": "Krobo recycled-glass beads set in brass, crafted by our women-led studio.",
      "description": "Statement earrings built around Krobo recycled-glass beads, hand-set in locally cast brass. Each pair supports our free apprenticeship programme for young women in Jamestown.",
      "value_tags": ["handmade", "upcycled", "women_led"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 441, "order_count": 63, "stock_quantity": 15,
      "created_at": "2026-07-01T04:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-000000000008",
      "vendor_id": "de000000-0000-4000-a000-000000000002",
      "title": "Cold-Pressed Baobab Oil (100ml)", "slug": "demo-cold-pressed-baobab-oil",
      "price_ghs": 85, "unit": "per bottle", "images": ["/images/prod-shea.jpg"],
      "category": "organic_produce", "location": "Aburi", "region": "Eastern",
      "short_description": "Single-origin baobab seed oil for skin and hair, pressed in small batches.",
      "description": "Wild-harvested baobab seeds from northern Ghana, cold-pressed within days of collection. Rich in omega fatty acids, a natural moisturiser for skin and hair. Amber glass bottle, zero plastic.",
      "value_tags": ["organic", "plastic_free", "women_led"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 298, "order_count": 45, "stock_quantity": 24,
      "created_at": "2026-07-01T03:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-00000000000d",
      "vendor_id": "de000000-0000-4000-a000-000000000004",
      "title": "Zero-Waste Soap Bars (4 pack)", "slug": "demo-zero-waste-soap-bars",
      "price_ghs": 60, "unit": "per pack", "images": ["/images/prod-soap.jpg"],
      "category": "recycled_upcycled", "location": "Tema", "region": "Greater Accra",
      "short_description": "Cold-process bars from recovered plant oils, wrapped in reclaimed paper.",
      "description": "Four cold-process bars saponified from recovered and filtered plant oils, lavender, neem, charcoal and unscented. Wrapped in our own reclaimed paper. Plastic never touches this product.",
      "value_tags": ["upcycled", "zero_waste", "plastic_free"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 289, "order_count": 44, "stock_quantity": 38,
      "created_at": "2026-07-01T02:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-00000000000b",
      "vendor_id": "de000000-0000-4000-a000-000000000003",
      "title": "Soy Wax Candle, Shea & Lemongrass", "slug": "demo-soy-candle-shea-lemongrass",
      "price_ghs": 70, "unit": "each", "images": ["/images/prod-candle.jpg"],
      "category": "handmade_crafts", "location": "Accra", "region": "Greater Accra",
      "short_description": "45-hour soy candle poured into a reusable glass, scented with Ghanaian lemongrass.",
      "description": "Clean-burning soy wax, cotton wick, and essential oils of lemongrass and shea blossom. When it burns down, the glass becomes your new cup, bring it back for a refill discount.",
      "value_tags": ["handmade", "zero_waste"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 265, "order_count": 38, "stock_quantity": 22,
      "created_at": "2026-07-01T01:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-000000000005",
      "vendor_id": "de000000-0000-4000-a000-000000000002",
      "title": "Vine-Ripened Tomatoes (1kg)", "slug": "demo-vine-ripened-tomatoes",
      "price_ghs": 22, "unit": "per kg", "images": ["/images/prod-tomatoes.jpg"],
      "category": "organic_produce", "location": "Aburi", "region": "Eastern",
      "short_description": "Sun-ripened on the vine in the Akuapem hills. No sprays, ever.",
      "description": "Grown in open fields with compost and neem-based pest control only. Picked ripe, not gassed, so they actually taste like tomatoes.",
      "value_tags": ["organic", "locally_sourced"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 210, "order_count": 40, "stock_quantity": 50,
      "created_at": "2026-07-01T00:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-000000000003",
      "vendor_id": "de000000-0000-4000-a000-000000000001",
      "title": "Vegetable Seedling Starter Tray (24 cells)", "slug": "demo-seedling-starter-tray",
      "price_ghs": 35, "unit": "per tray", "images": ["/images/impact-seedling.jpg"],
      "category": "agribusiness", "location": "Kumasi", "region": "Ashanti",
      "short_description": "Nursery-raised tomato, pepper and kontomire seedlings in biodegradable trays.",
      "description": "Give your garden a head start with hardened-off seedlings from our nursery: tomato, chilli pepper and kontomire varieties selected for Ghanaian conditions. The tray is pressed from coconut coir and composts straight into your soil.",
      "value_tags": ["biodegradable", "organic"],
      "sdg_tags": ["sdg_12_responsible_consumption", "sdg_13_climate_action"],
      "views": 148, "order_count": 19, "stock_quantity": 18,
      "created_at": "2026-06-30T23:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-000000000007",
      "vendor_id": "de000000-0000-4000-a000-000000000002",
      "title": "Sweet Watermelon", "slug": "demo-sweet-watermelon",
      "price_ghs": 25, "unit": "each", "images": ["/images/prod-watermelon.jpg"],
      "category": "organic_produce", "location": "Aburi", "region": "Eastern",
      "short_description": "Field-grown watermelon, chemical-free and picked at peak sweetness.",
      "description": "Heavy, crisp and deep red inside. Grown on open fields in the Eastern Region with drip irrigation and zero synthetic inputs.",
      "value_tags": ["organic", "locally_sourced"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 132, "order_count": 21, "stock_quantity": 35,
      "created_at": "2026-06-30T22:00:00Z"
    },
    {
      "id": "de000000-0000-4000-b000-000000000006",
      "vendor_id": "de000000-0000-4000-a000-000000000002",
      "title": "Organic Bananas (bunch)", "slug": "demo-organic-bananas",
      "price_ghs": 18, "unit": "per bunch", "images": ["/images/prod-bananas.jpg"],
      "category": "organic_produce", "location": "Aburi", "region": "Eastern",
      "short_description": "Naturally ripened bananas from mixed-crop family plots.",
      "description": "Sweet, naturally ripened bananas intercropped with cocoa and plantain, no ripening chemicals, no monoculture.",
      "value_tags": ["organic"],
      "sdg_tags": ["sdg_12_responsible_consumption"],
      "views": 176, "order_count": 28, "stock_quantity": 60,
      "created_at": "2026-06-30T21:00:00Z"
    }
  ]$json$::jsonb) loop
    p_slug := p->>'slug';
    if exists (select 1 from public.products
                where slug = p_slug and id <> (p->>'id')::uuid) then
      p_slug := p_slug || '-sample';
    end if;

    insert into public.products (
      id, vendor_id, is_demo, title, slug, description, short_description,
      price_ghs, stock_quantity, images, category, sdg_tags, value_tags,
      location, region, unit, minimum_order, status, rejection_reason, views,
      order_count, created_at
    ) values (
      (p->>'id')::uuid, (p->>'vendor_id')::uuid, true, p->>'title', p_slug,
      p->>'description', p->>'short_description', (p->>'price_ghs')::numeric,
      (p->>'stock_quantity')::integer,
      array(select jsonb_array_elements_text(p->'images')),
      (p->>'category')::public.product_category,
      array(select jsonb_array_elements_text(p->'sdg_tags')),
      array(select jsonb_array_elements_text(p->'value_tags')),
      p->>'location', (p->>'region')::public.ghana_region, p->>'unit', 1,
      'approved', null, (p->>'views')::integer, (p->>'order_count')::integer,
      (p->>'created_at')::timestamptz
    )
    on conflict (id) do update set
      vendor_id         = excluded.vendor_id,
      is_demo           = true,
      title             = excluded.title,
      description       = excluded.description,
      short_description = excluded.short_description,
      price_ghs         = excluded.price_ghs,
      stock_quantity    = excluded.stock_quantity,
      images            = excluded.images,
      category          = excluded.category,
      sdg_tags          = excluded.sdg_tags,
      value_tags        = excluded.value_tags,
      location          = excluded.location,
      region            = excluded.region,
      unit              = excluded.unit,
      minimum_order     = excluded.minimum_order,
      status            = 'approved',
      rejection_reason  = null,
      views             = excluded.views,
      order_count       = excluded.order_count,
      created_at        = excluded.created_at;
  end loop;
end
$fn$;

revoke all on function public.seed_sample_catalogue() from public, anon, authenticated;
grant execute on function public.seed_sample_catalogue() to service_role;

-- ─── Admin controls for the sample data ───────────────────────────────────────
--
-- Reset: deletes every sample order (with its payout, history and review) and
-- sample checkout, then restores the catalogue, so each rehearsal starts the
-- same. Real orders and products are never touched. It also shows the sample
-- shops again if they were hidden.

create or replace function public.reset_sample_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_orders integer;
begin
  delete from public.product_reviews
   where order_id in (select id from public.orders where is_demo);

  delete from public.orders where is_demo;
  get diagnostics removed_orders = row_count;

  delete from public.checkouts where is_demo;

  perform public.seed_sample_catalogue();

  return jsonb_build_object('orders_removed', removed_orders);
end
$$;

-- Hide before launch, show again for a demo. Hidden sample shops and listings
-- disappear from the storefront; their past orders stay readable.
create or replace function public.set_sample_visibility(p_visible boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vendor_profiles
     set status = case when p_visible then 'approved' else 'suspended' end::public.vendor_status
   where is_demo;

  update public.products
     set status = case when p_visible then 'approved' else 'paused' end::public.product_status
   where is_demo;
end
$$;

revoke all on function public.reset_sample_data()             from public, anon, authenticated;
revoke all on function public.set_sample_visibility(boolean)  from public, anon, authenticated;
grant execute on function public.reset_sample_data()            to service_role;
grant execute on function public.set_sample_visibility(boolean) to service_role;

-- ─── Load the sample catalogue ────────────────────────────────────────────────

select public.seed_sample_catalogue();

commit;

-- Expect sample_shops = 4, sample_products = 13, new_tables = 3
select
  'Migration 008 applied' as status,
  (select count(*) from public.vendor_profiles where is_demo) as sample_shops,
  (select count(*) from public.products where is_demo)        as sample_products,
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name in ('checkouts', 'payment_methods', 'buyer_addresses')) as new_tables;
