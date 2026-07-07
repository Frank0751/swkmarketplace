# SWK Marketplace — Claude Code Context

## Project overview
SWK Marketplace is a world-class, production-grade sustainable e-commerce platform built for SWK Ghana (swkghana.org). It connects eco-conscious buyers with verified youth-led green entrepreneurs across Ghana and Africa.

**Live URL:** marketplace.swkghana.org
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Paystack · Framer Motion · Cloudinary

---

## Key business rules

### Escrow model (CRITICAL)
- Buyer pays → funds held by SWK Ghana (escrow state = `held`)
- Vendor fulfils order → buyer confirms delivery
- Only THEN does admin release payout to vendor
- SWK Ghana deducts **15% commission** before releasing
- `payout.net_amount = payout.gross_amount * 0.85`
- Payouts are NEVER auto-released — admin must manually approve OR buyer confirms delivery which triggers release pipeline

### User roles
- `buyer` — can browse, place orders, confirm delivery
- `vendor` — must be APPROVED by admin before listing products
- `admin` — SWK Ghana team; approves vendors, listings, releases payouts
- Public (no login) — can browse and view products only

### Vendor approval flow
1. Vendor signs up → selects "I want to sell"
2. Fills in application (business_name, category, sustainability_statement, proof docs)
3. Status = `pending` — vendor CANNOT list products yet
4. Admin reviews → approves or rejects with reason
5. On approval: vendor_profiles.status = `approved`, users.role = `vendor`

### Product approval flow
1. Approved vendor submits listing → status = `pending_review`
2. Admin reviews SDG 12 alignment → approves or rejects
3. Only `approved` products appear on the public storefront

---

## File structure

```
app/
  (auth)/          — login, signup, forgot-password (no navbar)
  (public)/        — homepage, marketplace, product detail, vendor profile
  (buyer)/         — buyer dashboard, orders (requires buyer/admin role)
  (vendor)/        — vendor dashboard, listings, apply (requires approved vendor)
  (admin)/         — full admin panel (requires admin role)
  api/             — Next.js API routes
    paystack/      — webhook handler (CRITICAL: verify Paystack signature)
    orders/        — create, update order status
    products/      — CRUD with approval gating
    vendors/       — application, approval
    payouts/       — release payout to vendor

components/
  layout/          — Navbar, Footer, AnnouncementBar, MobileBottomNav
  marketplace/     — HeroSection, ProductCard, ProductGrid, CategoryStrip, etc.
  auth/            — LoginForm, SignupForm
  buyer/           — OrderTimeline, BuyerDashboard
  vendor/          — VendorApplicationForm, ListingForm, VendorDashboard
  admin/           — AdminLayout, VendorApprovalCard, OrderManagement, PayoutPanel
  ui/              — Button, Badge, Modal, Card, Input, Skeleton (shared primitives)

lib/
  supabase/
    client.ts      — browser Supabase client
    server.ts      — server Supabase client + admin client
  paystack/
    client.ts      — Paystack init + helpers
    webhook.ts     — signature verification
  email/
    brevo.ts       — email templates and send functions
  hooks/           — useUser, useProducts, useOrders, useVendor
  utils/           — formatCurrency, formatDate, generateSlug, cn

types/index.ts     — ALL TypeScript types in one file
middleware.ts      — Auth guard + role-based route protection
supabase/migrations/ — All SQL migrations
```

---

## Design system

### Colors (Tailwind classes)
- Primary green: `green-600` (#3B6D11) — buttons, links, active states
- Gold accent: `gold-400` (#BA7517) — SDG badges, highlights
- Trust teal: `teal-600` (#0F6E56) — escrow, verification badges
- Background: `sand-50` (#FAF8F3) — page bg
- Text: `sand-900` (#2A2823) — body text

### Typography
- Display font: `font-display` (Playfair Display) — headings, hero text
- Body font: `font-sans` (Plus Jakarta Sans) — all other text

### Key CSS classes (defined in globals.css)
- `.product-card` — product card with hover lift
- `.sdg-badge` — SDG 12 verified green pill
- `.trust-badge` — escrow/verification teal badge
- `.category-pill` — filterable category button
- `.value-tag` — Shop by values tag
- `.form-input`, `.form-label`, `.form-error` — form elements
- `.container-app` — max-w-7xl with responsive padding
- `.section` — standard vertical padding

---

## Supabase schema summary

### Tables
- `users` — id (= auth.uid), email, full_name, role, status
- `vendor_profiles` — linked to users, holds all vendor info + status
- `products` — linked to vendor_profiles, has status workflow
- `orders` — buyer ↔ vendor ↔ product, full escrow lifecycle
- `payouts` — created automatically when order paid (via trigger)
- `order_history` — audit log of every status change
- `product_reviews` — post-delivery reviews

### RLS rules
- Products: only `approved` products visible publicly
- Orders: only buyer OR vendor party can see their orders
- Payouts: only vendor (own) or admin can see
- Vendor profiles: only `approved` vendors visible publicly

---

## Paystack integration

### Webhook endpoint: /api/paystack/webhook
```typescript
// Always verify signature FIRST
const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
  .update(rawBody).digest('hex')
if (hash !== req.headers['x-paystack-signature']) return res.status(401)

// On charge.success → update order status to 'paid'
// Supabase trigger auto-creates payout record
```

### Initiate payment
```typescript
// Always pass metadata: { order_id, buyer_id, vendor_id }
// Use Paystack's split payment or collect full amount → SWK holds
```

---

## Email notifications (Brevo)

Send emails on these events:
| Event | Recipients | Template |
|-------|-----------|---------|
| Order placed | Buyer + Admin | order-confirmation |
| Order confirmed by vendor | Buyer | order-confirmed |
| Order dispatched | Buyer | order-dispatched |
| Delivery confirmed | Vendor + Admin | delivery-confirmed |
| Payout released | Vendor | payout-released |
| Vendor approved | Vendor | vendor-approved |
| Vendor rejected | Vendor | vendor-rejected |
| Listing approved | Vendor | listing-approved |

---

## Development commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint

# Supabase (if using CLI)
npx supabase start                  # Start local Supabase
npx supabase db reset               # Reset + re-run migrations
npx supabase gen types typescript   # Regenerate types
```

---

## Environment variables needed

See `.env.local.example` for full list. Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `BREVO_API_KEY`

---

## Important conventions

1. **Always use `createClient()` from `lib/supabase/server.ts`** in Server Components and API routes
2. **Always use `createClient()` from `lib/supabase/client.ts`** in Client Components
3. **Never bypass RLS** — use `createAdminClient()` only for admin operations in API routes
4. **Prices are stored in GHS** (decimal, e.g. 45.00 = GHS 45.00) — always format with `formatCurrency()`
5. **Product slugs are auto-generated** from title — never set manually
6. **Order references** are auto-generated by Postgres trigger — never set manually
7. Commission rate is **15%** — stored in `payouts.commission_rate` and in `NEXT_PUBLIC_COMMISSION_RATE`

---

## Contact & links
- Main site: swkghana.org
- Marketplace: marketplace.swkghana.org
- Admin email: info@swkghana.org
- Supabase project: qaen86pl
- WhatsApp community: chat.whatsapp.com/LrSVJrNFHGY6kdPnW8xoTu
