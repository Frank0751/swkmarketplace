// Database security checks: npm run test:db
//
// Replays every migration in supabase/migrations inside PGlite (Postgres
// compiled to WebAssembly, in memory, nothing to install) with Supabase's
// roles and auth.uid() stubbed, then tries to abuse the database as each kind
// of user, the way anyone holding the public anon key and their own session
// could from a browser console. Every case runs in its own transaction and is
// rolled back, so cases can't affect each other.
//
// Run it after changing any migration, before pasting SQL into Supabase.
import { PGlite } from '@electric-sql/pglite'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const MIGRATIONS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations')
const WHY = process.argv.includes('--why')
const FILES = readdirSync(MIGRATIONS).filter(f => /^\d+_.*\.sql$/.test(f)).sort()

// What Supabase provides before any migration runs
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
`

const U = {
  buyer:     '00000000-0000-4000-8000-0000000000b1',
  vendor:    '00000000-0000-4000-8000-0000000000c1',
  applicant: '00000000-0000-4000-8000-0000000000a1',
  pending:   '00000000-0000-4000-8000-0000000000a2',
  rejected:  '00000000-0000-4000-8000-0000000000a3',
  admin:     '00000000-0000-4000-8000-0000000000d1',
  suspended: '00000000-0000-4000-8000-0000000000e1',
}
const VP = {
  vendor:   '10000000-0000-4000-8000-0000000000c1',
  pending:  '10000000-0000-4000-8000-0000000000a2',
  rejected: '10000000-0000-4000-8000-0000000000a3',
}
const PR = {
  live:     '20000000-0000-4000-8000-000000000001',
  review:   '20000000-0000-4000-8000-000000000002',
  rejected: '20000000-0000-4000-8000-000000000003',
}
const ORD = { pending: '30000000-0000-4000-8000-000000000001' }

// The sample catalogue loaded by migration 008
const SAMPLE = {
  greenharvest: 'de000000-0000-4000-a000-000000000001',
  adom:         'de000000-0000-4000-a000-000000000002',
  honey:        'de000000-0000-4000-b000-000000000001', // GHS 65, stock 40
  coffee:       'de000000-0000-4000-b000-000000000002', // GHS 48, stock 30
  vegbox:       'de000000-0000-4000-b000-000000000004', // GHS 120, stock 20
}

// A cart the way the checkout API prices it: honey x2 and coffee from one
// shop (one delivery fee), a veggie box from another (a second fee)
const SAMPLE_ITEMS = [
  { product_id: SAMPLE.honey,  vendor_id: SAMPLE.greenharvest, quantity: 2, unit_price: 65,  subtotal: 130, delivery_fee: 20, total: 150 },
  { product_id: SAMPLE.coffee, vendor_id: SAMPLE.greenharvest, quantity: 1, unit_price: 48,  subtotal: 48,  delivery_fee: 0,  total: 48 },
  { product_id: SAMPLE.vegbox, vendor_id: SAMPLE.adom,         quantity: 1, unit_price: 120, subtotal: 120, delivery_fee: 20, total: 140 },
]

/** Insert a pending checkout as the API would (service role) and return its id */
async function createCheckout(t, { buyer = U.buyer, items = SAMPLE_ITEMS, isDemo = true } = {}) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const delivery = items.reduce((s, i) => s + i.delivery_fee, 0)
  await t.as('service_role')
  const r = await t.q(
    `insert into public.checkouts
       (buyer_id, is_demo, items, subtotal, delivery_total, total_amount,
        delivery_phone, delivery_region, delivery_address)
     values ($1, $2, $3::jsonb, $4, $5, $6, '+233241234567', 'Greater Accra', 'Osu, Accra')
     returning id`,
    [buyer, isDemo, JSON.stringify(items), subtotal, delivery, subtotal + delivery],
  )
  return r[0].id
}

async function fulfil(t, checkoutId) {
  await t.as('service_role')
  const r = await t.q(`select public.fulfil_checkout($1, 'card', 'Visa •••• 4081') as result`, [checkoutId])
  return r[0].result
}

const SEED = `
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${U.buyer}',     'buyer@test',     '{"full_name":"Ama Buyer","role":"buyer"}'),
    ('${U.vendor}',    'vendor@test',    '{"full_name":"Kofi Vendor","role":"vendor"}'),
    ('${U.applicant}', 'applicant@test', '{"full_name":"Esi Applicant"}'),
    ('${U.pending}',   'pending@test',   '{"full_name":"Yaw Pending","role":"vendor"}'),
    ('${U.rejected}',  'rejected@test',  '{"full_name":"Akua Rejected","role":"vendor"}'),
    ('${U.admin}',     'admin@test',     '{"full_name":"SWK Admin"}'),
    ('${U.suspended}', 'suspended@test', '{"full_name":"Kwame Suspended"}');
  update public.users set role = 'admin' where id = '${U.admin}';
  update public.users set status = 'suspended' where id = '${U.suspended}';

  insert into public.vendor_profiles
    (id, user_id, business_name, business_description, category, location, region, phone, sustainability_statement, status)
  values
    ('${VP.vendor}',   '${U.vendor}',   'Green Farm',  'We grow things', 'agribusiness', 'Kumasi', 'Ashanti', '0240000001', 'No pesticides', 'approved'),
    ('${VP.pending}',  '${U.pending}',  'Pending Co',  'We make things', 'handmade_crafts', 'Accra', 'Greater Accra', '0240000002', 'Recycled', 'pending'),
    ('${VP.rejected}', '${U.rejected}', 'Rejected Co', 'We sell things', 'handmade_crafts', 'Accra', 'Greater Accra', '0240000003', 'Local', 'rejected');
  update public.vendor_profiles set rejection_reason = 'Needs more detail' where id = '${VP.rejected}';

  insert into public.products
    (id, vendor_id, title, slug, description, short_description, price_ghs, stock_quantity, images, category, location, region, status)
  values
    ('${PR.live}',     '${VP.vendor}', 'Raw Honey',   'raw-honey',   'Forest honey', 'Honey', 50, 5,  '{honey.jpg}', 'agribusiness', 'Kumasi', 'Ashanti', 'approved'),
    ('${PR.review}',   '${VP.vendor}', 'Shea Butter', 'shea-butter', 'Pure shea',    'Shea',  30, 10, '{shea.jpg}',  'agribusiness', 'Kumasi', 'Ashanti', 'pending_review'),
    ('${PR.rejected}', '${VP.vendor}', 'Black Soap',  'black-soap',  'Soap',         'Soap',  20, 10, '{soap.jpg}',  'handmade_crafts', 'Kumasi', 'Ashanti', 'rejected');
  update public.products set rejection_reason = 'Blurry photos' where id = '${PR.rejected}';

  insert into public.orders
    (id, buyer_id, vendor_id, product_id, quantity, unit_price, subtotal, delivery_fee, total_amount, delivery_address, delivery_region, status)
  values
    ('${ORD.pending}', '${U.buyer}', '${VP.vendor}', '${PR.live}', 2, 50, 100, 20, 120, 'Osu, Accra', 'Greater Accra', 'pending');
`

// kind 'attack': must be blocked.   kind 'workflow': must keep working.
const CASES = [
  // ── Attacks ──────────────────────────────────────────────────────────────
  { kind: 'attack', name: 'Buyer makes themselves an admin', run: async t => {
    await t.as('authenticated', U.buyer)
    const r = await t.q(`update public.users set role = 'admin' where id = $1 returning role`, [U.buyer])
    return r[0]?.role === 'admin'
  }},
  { kind: 'attack', name: 'Suspended user re-activates themselves', run: async t => {
    await t.as('authenticated', U.suspended)
    const r = await t.q(`update public.users set status = 'active' where id = $1 returning status`, [U.suspended])
    return r[0]?.status === 'active'
  }},
  { kind: 'attack', name: 'Sign-up with role "admin" in its metadata', run: async t => {
    await t.as('postgres')
    const id = '00000000-0000-4000-8000-0000000000f1'
    await t.q(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'x@test', '{"role":"admin"}')`, [id])
    const r = await t.q(`select role from public.users where id = $1`, [id])
    return r[0]?.role === 'admin'
  }},
  { kind: 'attack', name: 'Applicant submits an already-approved application', run: async t => {
    await t.as('authenticated', U.applicant)
    const r = await t.q(`insert into public.vendor_profiles
      (user_id, business_name, business_description, category, location, region, phone, sustainability_statement, status)
      values ($1, 'Instant Co', 'x', 'agribusiness', 'Accra', 'Greater Accra', '0240000009', 'x', 'approved') returning status`, [U.applicant])
    return r[0]?.status === 'approved'
  }},
  { kind: 'attack', name: 'Pending applicant approves themselves', run: async t => {
    await t.as('authenticated', U.pending)
    const r = await t.q(`update public.vendor_profiles set status = 'approved' where user_id = $1 returning status`, [U.pending])
    return r[0]?.status === 'approved'
  }},
  { kind: 'attack', name: 'Vendor fakes a 5-star rating', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.vendor_profiles set rating = 5, review_count = 999 where user_id = $1 returning review_count`, [U.vendor])
    return r[0]?.review_count === 999
  }},
  { kind: 'attack', name: 'Vendor fakes their fulfilled-order count', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.vendor_profiles set total_sales = 5000 where user_id = $1 returning total_sales`, [U.vendor])
    return Number(r[0]?.total_sales) === 5000
  }},
  { kind: 'attack', name: 'Vendor publishes a listing without review', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`insert into public.products
      (vendor_id, title, slug, description, short_description, price_ghs, stock_quantity, category, location, region, status)
      values ($1, 'Sneaky', 'sneaky', 'd', 's', 10, 1, 'agribusiness', 'Kumasi', 'Ashanti', 'approved') returning status`, [VP.vendor])
    return r[0]?.status === 'approved'
  }},
  { kind: 'attack', name: 'Vendor approves their own pending listing', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.products set status = 'approved' where id = $1 returning status`, [PR.review])
    return r[0]?.status === 'approved'
  }},
  { kind: 'attack', name: 'Vendor swaps photos on a live listing and it stays live', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.products set images = '{other.jpg}' where id = $1 returning status`, [PR.live])
    return r[0]?.status === 'approved'
  }},
  { kind: 'attack', name: 'Vendor inflates views and order count', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.products set views = 99999, order_count = 500 where id = $1 returning order_count`, [PR.live])
    return r[0]?.order_count === 500
  }},
  { kind: 'attack', name: 'Buyer creates an order already marked paid', run: async t => {
    await t.as('authenticated', U.buyer)
    const r = await t.q(`insert into public.orders
      (buyer_id, vendor_id, product_id, quantity, unit_price, subtotal, total_amount, delivery_address, delivery_region, status)
      values ($1, $2, $3, 1, 1, 1, 1, 'x', 'Greater Accra', 'paid') returning status`, [U.buyer, VP.vendor, PR.live])
    return r[0]?.status === 'paid'
  }},
  { kind: 'attack', name: 'Vendor inflates an unpaid order total', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.orders set total_amount = 9999 where id = $1 returning total_amount`, [ORD.pending])
    return Number(r[0]?.total_amount) === 9999
  }},
  { kind: 'attack', name: 'Buyer writes admin notes on their order', run: async t => {
    await t.as('authenticated', U.buyer)
    const r = await t.q(`update public.orders set admin_notes = 'refund me' where id = $1 returning admin_notes`, [ORD.pending])
    return r[0]?.admin_notes === 'refund me'
  }},
  { kind: 'attack', name: 'A stranger reads a vendor\'s payout details', run: async t => {
    await t.as('authenticated', U.vendor)
    await t.q(`insert into public.vendor_payout_details (vendor_id, method, momo_network, account_name, account_number)
               values ($1, 'momo', 'MTN MoMo', 'Kofi Mensah', '0241234567')`, [VP.vendor])
    await t.as('authenticated', U.buyer)
    const r = await t.q(`select account_number from public.vendor_payout_details`)
    return r.length > 0
  }},
  { kind: 'attack', name: 'A stranger reads an applicant\'s documents', run: async t => {
    await t.as('authenticated', U.pending)
    await t.q(`insert into public.vendor_documents (vendor_id, public_id, label) values ($1, 'swk/vendor-docs/x', 'Registration')`, [VP.pending])
    await t.as('authenticated', U.buyer)
    const r = await t.q(`select public_id from public.vendor_documents`)
    return r.length > 0
  }},

  // ── Attacks on checkout and the sample data (migration 008) ─────────────
  { kind: 'attack', name: 'Vendor flags their listing as a sample (to "pay" with the test payment)', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.products set is_demo = true where id = $1 returning is_demo`, [PR.live])
    return r[0]?.is_demo === true
  }},
  { kind: 'attack', name: 'Vendor creates a listing already flagged as a sample', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`insert into public.products
      (vendor_id, title, slug, description, short_description, price_ghs, stock_quantity, category, location, region, is_demo)
      values ($1, 'Fake', 'fake', 'd', 's', 10, 1, 'agribusiness', 'Kumasi', 'Ashanti', true) returning is_demo`, [VP.vendor])
    return r[0]?.is_demo === true
  }},
  { kind: 'attack', name: 'Applicant registers their shop as a sample shop', run: async t => {
    await t.as('authenticated', U.applicant)
    const r = await t.q(`insert into public.vendor_profiles
      (user_id, business_name, business_description, category, location, region, phone, sustainability_statement, is_demo)
      values ($1, 'Fake Co', 'x', 'agribusiness', 'Accra', 'Greater Accra', '0240000009', 'x', true) returning is_demo`, [U.applicant])
    return r[0]?.is_demo === true
  }},
  { kind: 'attack', name: 'Vendor takes over a sample shop', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.vendor_profiles set user_id = $1 where id = $2 returning user_id`, [U.vendor, SAMPLE.greenharvest])
    return r[0]?.user_id === U.vendor
  }},
  { kind: 'attack', name: 'Buyer writes a checkout directly (choosing their own prices)', run: async t => {
    await t.as('authenticated', U.buyer)
    const r = await t.q(`insert into public.checkouts
      (buyer_id, is_demo, items, subtotal, delivery_total, total_amount, delivery_phone, delivery_region, delivery_address)
      values ($1, true, '[{"product_id":"x"}]', 1, 0, 1, '+233241234567', 'Greater Accra', 'Osu') returning id`, [U.buyer])
    return r.length > 0
  }},
  { kind: 'attack', name: 'Buyer marks their own checkout paid', run: async t => {
    const id = await createCheckout(t)
    await t.as('authenticated', U.buyer)
    const r = await t.q(`select public.fulfil_checkout($1, 'card', 'x') as result`, [id])
    return r[0]?.result?.outcome === 'paid'
  }},
  { kind: 'attack', name: 'A stranger reads someone else\'s checkout', run: async t => {
    await createCheckout(t)
    await t.as('authenticated', U.applicant)
    const r = await t.q(`select id from public.checkouts`)
    return r.length > 0
  }},
  { kind: 'attack', name: 'A stranger reads someone else\'s saved cards', run: async t => {
    await t.as('service_role')
    await t.q(`insert into public.payment_methods (user_id, kind, brand, last4, exp_month, exp_year)
               values ($1, 'card', 'visa', '4081', 12, 2030)`, [U.buyer])
    await t.as('authenticated', U.applicant)
    const r = await t.q(`select last4 from public.payment_methods`)
    return r.length > 0
  }},
  { kind: 'attack', name: 'Buyer saves a payment method without the API', run: async t => {
    await t.as('authenticated', U.buyer)
    const r = await t.q(`insert into public.payment_methods (user_id, kind, brand, last4, exp_month, exp_year)
               values ($1, 'card', 'visa', '4242', 12, 2030) returning id`, [U.buyer])
    return r.length > 0
  }},
  { kind: 'attack', name: 'A signed-in user wipes the sample orders', run: async t => {
    await t.as('authenticated', U.buyer)
    await t.q(`select public.reset_sample_data()`)
    return true
  }},
  { kind: 'attack', name: 'A checkout mixing sample and real items gets fulfilled', run: async t => {
    const items = [
      SAMPLE_ITEMS[0],
      { product_id: PR.live, vendor_id: VP.vendor, quantity: 1, unit_price: 50, subtotal: 50, delivery_fee: 20, total: 70 },
    ]
    const id = await createCheckout(t, { items })
    const result = await fulfil(t, id)
    return result?.outcome === 'paid'
  }},

  // ── Workflows that must keep working ────────────────────────────────────
  { kind: 'workflow', name: 'Anyone can browse live listings', run: async t => {
    await t.as('anon')
    const r = await t.q(`select title from public.products where not is_demo`)
    return r.length === 1 && r[0].title === 'Raw Honey'
  }},
  { kind: 'workflow', name: 'Anyone can browse the 13 sample products and 4 sample shops', run: async t => {
    await t.as('anon')
    const p = await t.q(`select id from public.products where is_demo and status = 'approved'`)
    const v = await t.q(`select id, user_id from public.vendor_profiles where is_demo and status = 'approved'`)
    return (p.length === 13 && v.length === 4 && v.every(x => x.user_id === null)) || JSON.stringify({ p: p.length, v })
  }},
  { kind: 'workflow', name: 'Sample shops count their own live listings', run: async t => {
    await t.as('postgres')
    const r = await t.q(`select total_products from public.vendor_profiles where id = $1`, [SAMPLE.greenharvest])
    return r[0]?.total_products === 3 || `total_products ${r[0]?.total_products}`
  }},
  { kind: 'workflow', name: 'A paid sample checkout becomes paid orders with escrow payouts', run: async t => {
    const id = await createCheckout(t)
    const result = await fulfil(t, id)
    await t.as('postgres')
    const orders = await t.q(`select status, is_demo, total_amount from public.orders where checkout_id = $1 order by total_amount desc`, [id])
    const payouts = await t.q(`select p.status, p.net_amount from public.payouts p join public.orders o on o.id = p.order_id where o.checkout_id = $1 order by p.net_amount desc`, [id])
    const co = await t.q(`select status, payment_label, paid_at from public.checkouts where id = $1`, [id])
    const ok = result.outcome === 'paid'
      && result.order_ids.length === 3
      && orders.length === 3 && orders.every(o => o.status === 'paid' && o.is_demo)
      && payouts.length === 3 && payouts.every(p => p.status === 'held')
      && Number(payouts[0].net_amount) === 127.5 && Number(payouts[1].net_amount) === 119 && Number(payouts[2].net_amount) === 40.8
      && co[0].status === 'paid' && co[0].payment_label === 'Visa •••• 4081' && co[0].paid_at !== null
    return ok || JSON.stringify({ result, orders, payouts, co })
  }},
  { kind: 'workflow', name: 'A paid sample checkout takes the stock', run: async t => {
    const id = await createCheckout(t)
    await fulfil(t, id)
    await t.as('postgres')
    const r = await t.q(`select id, stock_quantity, order_count from public.products where id = any($1::uuid[])`, [[SAMPLE.honey, SAMPLE.coffee, SAMPLE.vegbox]])
    const by = Object.fromEntries(r.map(x => [x.id, x]))
    return (by[SAMPLE.honey].stock_quantity === 38 && by[SAMPLE.coffee].stock_quantity === 29
      && by[SAMPLE.vegbox].stock_quantity === 19 && by[SAMPLE.honey].order_count === 59) || JSON.stringify(r)
  }},
  { kind: 'workflow', name: 'Paying the same checkout twice creates its orders once', run: async t => {
    const id = await createCheckout(t)
    const first = await fulfil(t, id)
    const second = await fulfil(t, id)
    await t.as('postgres')
    const n = await t.q(`select count(*)::int as n from public.orders where checkout_id = $1`, [id])
    const same = JSON.stringify([...first.order_ids].sort()) === JSON.stringify([...second.order_ids].sort())
    return (second.outcome === 'already_paid' && same && n[0].n === 3) || JSON.stringify({ first, second, n })
  }},
  { kind: 'workflow', name: 'A cancelled checkout can\'t be paid', run: async t => {
    const id = await createCheckout(t)
    await t.q(`update public.checkouts set status = 'cancelled' where id = $1`, [id])
    const result = await fulfil(t, id)
    return result.outcome === 'not_pending' || JSON.stringify(result)
  }},
  { kind: 'workflow', name: 'Buyer sees their checkout and the orders it created', run: async t => {
    const id = await createCheckout(t)
    await fulfil(t, id)
    await t.as('authenticated', U.buyer)
    const co = await t.q(`select reference from public.checkouts where id = $1`, [id])
    const orders = await t.q(`select id from public.orders where checkout_id = $1`, [id])
    return (co.length === 1 && /^PAY-[0-9A-F]{8}$/.test(co[0].reference) && orders.length === 3) || JSON.stringify({ co, orders: orders.length })
  }},
  { kind: 'workflow', name: 'Buyer reviews a delivered sample order', run: async t => {
    const id = await createCheckout(t)
    const { order_ids } = await fulfil(t, id)
    await t.as('service_role')
    const orderId = (await t.q(`select id from public.orders where id = any($1::uuid[]) and product_id = $2`, [order_ids, SAMPLE.vegbox]))[0].id
    for (const s of ['confirmed', 'dispatched', 'delivered']) {
      await t.q(`update public.orders set status = $2 where id = $1`, [orderId, s])
    }
    await t.as('authenticated', U.buyer)
    const r = await t.q(`insert into public.product_reviews (product_id, order_id, buyer_id, rating, comment)
                         values ($1, $2, $3, 5, 'Fresh and lovely') returning rating`, [SAMPLE.vegbox, orderId, U.buyer])
    return r[0]?.rating === 5
  }},
  { kind: 'workflow', name: 'Resetting the sample data clears sample orders and restores stock', run: async t => {
    const id = await createCheckout(t)
    await fulfil(t, id)
    await t.as('service_role')
    await t.q(`update public.orders set status = 'paid' where id = $1`, [ORD.pending])
    const result = (await t.q(`select public.reset_sample_data() as r`))[0].r
    await t.as('postgres')
    const sampleOrders = await t.q(`select id from public.orders where is_demo`)
    const realOrders = await t.q(`select id from public.orders where not is_demo`)
    const honey = await t.q(`select stock_quantity, order_count from public.products where id = $1`, [SAMPLE.honey])
    const checkouts = await t.q(`select id from public.checkouts where is_demo`)
    return (result.orders_removed === 3 && sampleOrders.length === 0 && realOrders.length === 1
      && checkouts.length === 0 && honey[0].stock_quantity === 40 && honey[0].order_count === 58)
      || JSON.stringify({ result, sampleOrders, realOrders, honey, checkouts })
  }},
  { kind: 'workflow', name: 'Admin hides the sample shops, then shows them again', run: async t => {
    await t.as('service_role')
    await t.q(`select public.set_sample_visibility(false)`)
    await t.as('anon')
    const hidden = await t.q(`select id from public.products where is_demo`)
    const shops = await t.q(`select id from public.vendor_profiles where is_demo`)
    await t.as('service_role')
    await t.q(`select public.set_sample_visibility(true)`)
    await t.as('anon')
    const shown = await t.q(`select id from public.products where is_demo`)
    return (hidden.length === 0 && shops.length === 0 && shown.length === 13) || JSON.stringify({ hidden: hidden.length, shops: shops.length, shown: shown.length })
  }},
  { kind: 'workflow', name: 'Loading the sample catalogue again doesn\'t duplicate it', run: async t => {
    await t.as('service_role')
    await t.q(`select public.seed_sample_catalogue()`)
    await t.q(`select public.seed_sample_catalogue()`)
    await t.as('postgres')
    const r = await t.q(`select (select count(*)::int from public.products where is_demo) as p, (select count(*)::int from public.vendor_profiles where is_demo) as v`)
    return (r[0].p === 13 && r[0].v === 4) || JSON.stringify(r[0])
  }},
  { kind: 'workflow', name: 'Buyer reads their own saved payment methods and addresses', run: async t => {
    await t.as('service_role')
    await t.q(`insert into public.payment_methods (user_id, kind, momo_network, momo_phone, last4, is_default)
               values ($1, 'momo', 'MTN MoMo', '+233241234567', '4567', true)`, [U.buyer])
    await t.q(`insert into public.buyer_addresses (user_id, label, phone, region, address, is_default)
               values ($1, 'Home', '+233241234567', 'Greater Accra', 'House 12, Osu', true)`, [U.buyer])
    await t.as('authenticated', U.buyer)
    const m = await t.q(`select last4 from public.payment_methods`)
    const a = await t.q(`select label from public.buyer_addresses`)
    return (m.length === 1 && a.length === 1) || JSON.stringify({ m, a })
  }},
  { kind: 'workflow', name: 'Buyer edits their name and phone', run: async t => {
    await t.as('authenticated', U.buyer)
    const r = await t.q(`update public.users set full_name = 'Ama B.', phone = '0200000000' where id = $1 returning full_name`, [U.buyer])
    return r[0]?.full_name === 'Ama B.'
  }},
  { kind: 'workflow', name: 'Buyer becomes a vendor applicant', run: async t => {
    await t.as('authenticated', U.buyer)
    const r = await t.q(`update public.users set role = 'vendor' where id = $1 returning role`, [U.buyer])
    return r[0]?.role === 'vendor'
  }},
  { kind: 'workflow', name: 'Applicant submits an application (pending)', run: async t => {
    await t.as('authenticated', U.applicant)
    const r = await t.q(`insert into public.vendor_profiles
      (user_id, business_name, business_description, category, location, region, phone, sustainability_statement, status)
      values ($1, 'Esi Crafts', 'x', 'handmade_crafts', 'Accra', 'Greater Accra', '0240000009', 'x', 'pending') returning status`, [U.applicant])
    return r[0]?.status === 'pending'
  }},
  { kind: 'workflow', name: 'Rejected applicant resubmits', run: async t => {
    await t.as('authenticated', U.rejected)
    const r = await t.q(`update public.vendor_profiles set status = 'pending', business_description = 'More detail' where user_id = $1 returning status`, [U.rejected])
    return r[0]?.status === 'pending'
  }},
  { kind: 'workflow', name: 'Vendor updates their store story', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.vendor_profiles set story = 'Since 2020', founders = '[{"name":"Kofi","role":"CEO"}]' where user_id = $1 returning story`, [U.vendor])
    return r[0]?.story === 'Since 2020'
  }},
  { kind: 'workflow', name: 'Vendor creates a listing (goes to review)', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`insert into public.products
      (vendor_id, title, slug, description, short_description, price_ghs, stock_quantity, category, location, region, status)
      values ($1, 'Mango Jam', 'mango-jam', 'd', 's', 25, 8, 'agribusiness', 'Kumasi', 'Ashanti', 'pending_review') returning status`, [VP.vendor])
    return r[0]?.status === 'pending_review'
  }},
  { kind: 'workflow', name: 'Vendor changes price and stock, listing stays live', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.products set price_ghs = 55, stock_quantity = 9 where id = $1 returning status`, [PR.live])
    return r[0]?.status === 'approved'
  }},
  { kind: 'workflow', name: 'Vendor edits a description, listing goes back to review', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.products set description = 'Now with bees' where id = $1 returning status`, [PR.live])
    return r[0]?.status === 'pending_review' || `status is ${r[0]?.status}`
  }},
  { kind: 'workflow', name: 'Vendor resubmits a rejected listing', run: async t => {
    await t.as('authenticated', U.vendor)
    const r = await t.q(`update public.products set status = 'pending_review', images = '{sharp.jpg}' where id = $1 returning status, rejection_reason`, [PR.rejected])
    return (r[0]?.status === 'pending_review' && r[0]?.rejection_reason === null) || JSON.stringify(r[0])
  }},
  { kind: 'workflow', name: 'Server (service role) approves a vendor', run: async t => {
    await t.as('service_role')
    await t.q(`update public.vendor_profiles set status = 'approved', approved_at = now() where id = $1`, [VP.pending])
    const r = await t.q(`update public.users set role = 'vendor' where id = $1 returning role`, [U.pending])
    return r[0]?.role === 'vendor'
  }},
  { kind: 'workflow', name: 'Paying an order creates the escrow payout', run: async t => {
    await t.as('service_role')
    await t.q(`update public.orders set status = 'paid' where id = $1`, [ORD.pending])
    const r = await t.q(`select net_amount, status from public.payouts where order_id = $1`, [ORD.pending])
    return (r.length === 1 && Number(r[0].net_amount) === 102 && r[0].status === 'held') || JSON.stringify(r)
  }},
  { kind: 'workflow', name: 'Paying an order reduces stock and counts it', run: async t => {
    await t.as('service_role')
    await t.q(`update public.orders set status = 'paid' where id = $1`, [ORD.pending])
    const r = await t.q(`select stock_quantity, order_count from public.products where id = $1`, [PR.live])
    return (r[0].stock_quantity === 3 && r[0].order_count === 1) || JSON.stringify(r[0])
  }},
  { kind: 'workflow', name: 'A refund returns the stock and cancels the payout', run: async t => {
    await t.as('service_role')
    await t.q(`update public.orders set status = 'paid' where id = $1`, [ORD.pending])
    await t.q(`update public.orders set status = 'refunded' where id = $1`, [ORD.pending])
    const p = await t.q(`select stock_quantity, order_count from public.products where id = $1`, [PR.live])
    const po = await t.q(`select status from public.payouts where order_id = $1`, [ORD.pending])
    return (p[0].stock_quantity === 5 && p[0].order_count === 0 && po[0]?.status === 'cancelled') || JSON.stringify({ p, po })
  }},
  { kind: 'workflow', name: 'A delivered order counts once toward the vendor\'s record', run: async t => {
    await t.as('service_role')
    for (const s of ['paid', 'confirmed', 'dispatched', 'delivered', 'released']) {
      await t.q(`update public.orders set status = $2 where id = $1`, [ORD.pending, s])
    }
    const r = await t.q(`select total_sales from public.vendor_profiles where id = $1`, [VP.vendor])
    return Number(r[0].total_sales) === 1 || `total_sales ${r[0].total_sales}`
  }},
  { kind: 'workflow', name: 'The live-listing count stays accurate', run: async t => {
    await t.as('service_role')
    const before = await t.q(`select total_products from public.vendor_profiles where id = $1`, [VP.vendor])
    await t.q(`update public.products set status = 'approved' where id = $1`, [PR.review])
    const after = await t.q(`select total_products from public.vendor_profiles where id = $1`, [VP.vendor])
    return (before[0].total_products === 1 && after[0].total_products === 2) || JSON.stringify({ before, after })
  }},
  { kind: 'workflow', name: 'Visitors count a product view', run: async t => {
    await t.as('anon')
    await t.q(`select public.increment_product_views($1)`, [PR.live])
    await t.as('postgres')
    const r = await t.q(`select views from public.products where id = $1`, [PR.live])
    return r[0].views === 1 || `views ${r[0].views}`
  }},
  { kind: 'workflow', name: 'Vendor saves payout details; admin can read them', run: async t => {
    await t.as('authenticated', U.vendor)
    await t.q(`insert into public.vendor_payout_details (vendor_id, method, momo_network, account_name, account_number)
               values ($1, 'momo', 'Telecel Cash', 'Kofi Mensah', '0501234567')`, [VP.vendor])
    const own = await t.q(`select account_number from public.vendor_payout_details`)
    await t.as('authenticated', U.admin)
    const admin = await t.q(`select account_name from public.vendor_payout_details`)
    return (own.length === 1 && admin.length === 1) || JSON.stringify({ own, admin })
  }},
  { kind: 'workflow', name: 'Admin can read applicant documents', run: async t => {
    await t.as('authenticated', U.pending)
    await t.q(`insert into public.vendor_documents (vendor_id, public_id, label) values ($1, 'swk/vendor-docs/x', 'Registration')`, [VP.pending])
    await t.as('authenticated', U.admin)
    const r = await t.q(`select public_id from public.vendor_documents`)
    return r.length === 1
  }},
  { kind: 'workflow', name: 'Admin can read every user', run: async t => {
    await t.as('authenticated', U.admin)
    const r = await t.q(`select id from public.users`)
    return r.length === 7 || `saw ${r.length}`
  }},
  { kind: 'workflow', name: 'Buyer and vendor each see only their own orders', run: async t => {
    await t.as('authenticated', U.buyer)
    const b = await t.q(`select id from public.orders`)
    await t.as('authenticated', U.vendor)
    const v = await t.q(`select id from public.orders`)
    await t.as('authenticated', U.applicant)
    const x = await t.q(`select id from public.orders`)
    return (b.length === 1 && v.length === 1 && x.length === 0) || JSON.stringify({ b: b.length, v: v.length, x: x.length })
  }},
]

async function runCase(db, fn) {
  await db.exec('begin')
  const t = {
    async as(role, user = null) {
      await db.exec('reset role')
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user ?? ''])
      if (role !== 'postgres') await db.exec(`set local role ${role}`)
    },
    async q(sql, params = []) {
      return (await db.query(sql, params)).rows
    },
  }
  try {
    const out = await fn(t)
    return { ok: out === true, detail: typeof out === 'string' ? out : '' }
  } catch (e) {
    return { ok: false, detail: e.message.split('\n')[0] }
  } finally {
    await db.exec('rollback')
  }
}

async function main() {
  const db = new PGlite({ extensions: { uuid_ossp, pg_trgm } })
  await db.exec(SUPABASE_STUB)
  for (const file of FILES) {
    try {
      await db.exec(readFileSync(path.join(MIGRATIONS, file), 'utf8'))
    } catch (e) {
      console.error(`Migration ${file} failed: ${e.message}`)
      process.exit(1)
    }
  }
  await db.exec(SEED)
  console.log(`Replayed ${FILES.length} migrations: ${FILES.join(', ')}\n`)

  let failures = 0
  for (const c of CASES) {
    const r = await runCase(db, c.run)
    const passed = c.kind === 'attack' ? !r.ok : r.ok
    if (!passed) failures++
    const verdict = c.kind === 'attack'
      ? (passed ? 'blocked   ' : 'ATTACK OK ')
      : (passed ? 'works     ' : 'BROKEN    ')
    // --why prints what stopped each attack, to check it was the rule under
    // test and not a typo in the test's own SQL
    const why = !passed || (WHY && c.kind === 'attack')
    console.log(`${passed ? 'ok  ' : 'FAIL'} ${verdict} ${c.name}${why && r.detail ? `  (${r.detail})` : ''}`)
  }
  await db.close()

  console.log(`\n${failures === 0 ? 'All' : CASES.length - failures + ' of'} ${CASES.length} checks passed`)
  process.exitCode = failures === 0 ? 0 : 1
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
