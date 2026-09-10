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

  // ── Workflows that must keep working ────────────────────────────────────
  { kind: 'workflow', name: 'Anyone can browse live listings', run: async t => {
    await t.as('anon')
    const r = await t.q(`select title from public.products`)
    return r.length === 1 && r[0].title === 'Raw Honey'
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
    console.log(`${passed ? 'ok  ' : 'FAIL'} ${verdict} ${c.name}${!passed && r.detail ? `  (${r.detail})` : ''}`)
  }
  await db.close()

  console.log(`\n${failures === 0 ? 'All' : CASES.length - failures + ' of'} ${CASES.length} checks passed`)
  process.exitCode = failures === 0 ? 0 : 1
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
