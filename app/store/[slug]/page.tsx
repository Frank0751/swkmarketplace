import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MapPin,
  Phone,
  Star,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Leaf,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ProductCard } from '@/components/marketplace/ProductCard'
import { ShareStoreLink } from '@/components/vendor/ShareStoreLink'
import { JsonLd } from '@/components/seo/JsonLd'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/motion'
import { whatsappDigits, formatGhanaPhone } from '@/lib/marketplace/phone'
import { CATEGORY_META, type Product, type VendorProfile } from '@/types'

interface StorePageProps {
  params: { slug: string }
}

// ─── Data ──────────────────────────────────────────────────────────────────────

async function fetchVendor(slug: string): Promise<VendorProfile | null> {
  const supabase = await createClient()

  // Resolve by slug first, then by id (so old /store/<uuid> links keep working)
  const { data: bySlug } = await supabase
    .from('vendor_profiles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()

  if (bySlug) return bySlug as VendorProfile

  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(slug)
  if (looksLikeUuid) {
    const { data: byId } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('id', slug)
      .eq('status', 'approved')
      .maybeSingle()
    if (byId) return byId as VendorProfile
  }

  return null
}

async function fetchVendorProducts(vendor: VendorProfile): Promise<Product[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*, vendor:vendor_profiles(id, business_name, slug, location, region, logo_url, rating, review_count, status)')
    .eq('vendor_id', vendor.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(48)

  return (data as Product[]) ?? []
}

// ─── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const vendor = await fetchVendor(params.slug)
  if (!vendor) return { title: 'Store not found' }

  const title = vendor.business_name
  const description =
    vendor.business_description ||
    `Shop sustainable products from ${vendor.business_name}, a verified green business on SWK Marketplace.`

  return {
    title,
    description,
    // Sample shops are for demonstrations, not search results
    robots: vendor.is_demo ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      images: vendor.banner_url || vendor.logo_url
        ? [{ url: (vendor.banner_url || vendor.logo_url) as string }]
        : undefined,
    },
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function StorePage({ params }: StorePageProps) {
  const vendor = await fetchVendor(params.slug)
  if (!vendor) notFound()

  const products = await fetchVendorProducts(vendor)
  const catMeta = CATEGORY_META[vendor.category]
  const founders = vendor.founders ?? []
  const slug = vendor.slug ?? vendor.id
  const isSample = !!vendor.is_demo

  // wa.me needs the international number with no + or leading 0: a local
  // "024…" number used to produce a link that opened nobody's chat
  const waNumber = whatsappDigits(vendor.phone)
    ?? (vendor.phone?.trim().startsWith('+') ? vendor.phone.replace(/\D/g, '') : null)

  const facts = [
    vendor.year_founded && { label: 'Founded', value: String(vendor.year_founded) },
    vendor.team_size && { label: 'Team', value: `${vendor.team_size} people` },
    vendor.total_sales > 0 && { label: 'Orders fulfilled', value: `${vendor.total_sales}+` },
    vendor.review_count > 0 && { label: 'Rating', value: `${vendor.rating.toFixed(1)} (${vendor.review_count})` },
  ].filter(Boolean) as { label: string; value: string }[]

  const socials = [
    vendor.website && { icon: Globe, href: vendor.website, label: 'Website' },
    vendor.social_links?.website && !vendor.website && { icon: Globe, href: vendor.social_links.website, label: 'Website' },
    vendor.social_links?.instagram && { icon: Instagram, href: vendor.social_links.instagram, label: 'Instagram' },
    vendor.social_links?.facebook && { icon: Facebook, href: vendor.social_links.facebook, label: 'Facebook' },
    vendor.social_links?.twitter && { icon: Twitter, href: vendor.social_links.twitter, label: 'X (Twitter)' },
  ].filter(Boolean) as { icon: typeof Globe; href: string; label: string }[]

  return (
    <>
      {!isSample && <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: vendor.business_name,
          description: vendor.business_description,
          url: `https://marketplace.swkghana.org/store/${slug}`,
          image: vendor.banner_url || vendor.logo_url || undefined,
          telephone: vendor.phone || undefined,
          foundingDate: vendor.year_founded ? String(vendor.year_founded) : undefined,
          address: {
            '@type': 'PostalAddress',
            addressLocality: vendor.location,
            addressRegion: vendor.region,
            addressCountry: 'GH',
          },
          ...(vendor.review_count > 0
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: vendor.rating,
                  reviewCount: vendor.review_count,
                },
              }
            : {}),
        }}
      />}
      <Navbar />

      <main id="main" className="pb-24 md:pb-0">
        {/* ── Banner ─────────────────────────────────────────────── */}
        <div className="relative h-52 md:h-72 bg-sand-100">
          <Image
            src={vendor.banner_url || '/images/store-banner.jpg'}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sand-900/60 via-sand-900/10 to-transparent" />
          {isSample && (
            <span className="absolute top-4 right-4 px-2.5 py-1 text-[11px] font-semibold bg-sand-900/70 backdrop-blur-sm text-white rounded-full">
              Sample shop: checkout works with a test payment
            </span>
          )}
        </div>

        {/* ── Header card ────────────────────────────────────────── */}
        <div className="container-app">
          <div className="relative -mt-16 md:-mt-20 bg-white rounded-2xl border border-sand-200 shadow-card-lg p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              {/* Logo */}
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-white shadow-card bg-green-50 flex-shrink-0 -mt-14 md:-mt-16">
                {vendor.logo_url ? (
                  <Image src={vendor.logo_url} alt={`${vendor.business_name} logo`} fill sizes="96px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Leaf className="w-10 h-10 text-green-600" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-sand-900">
                    {vendor.business_name}
                  </h1>
                  <span className="sdg-badge">SDG 12 Verified ✓</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-sand-600 mb-3">
                  <span className="flex items-center gap-1">
                    {catMeta?.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {vendor.location}, {vendor.region}
                  </span>
                  {vendor.review_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />
                      {vendor.rating.toFixed(1)} · {vendor.review_count} reviews
                    </span>
                  )}
                </div>

                <p className="text-sm text-sand-600 leading-relaxed max-w-2xl">
                  {vendor.business_description}
                </p>
              </div>

              {/* Share */}
              <div className="flex-shrink-0">
                <ShareStoreLink slug={slug} businessName={vendor.business_name} variant="row" />
              </div>
            </div>

            {/* Facts row */}
            {facts.length > 0 && (
              <dl className="mt-6 pt-5 border-t border-sand-100 grid grid-cols-2 md:grid-cols-4 gap-y-4">
                {facts.map((fact, i) => (
                  <div key={fact.label} className={`flex flex-col px-4 first:pl-0 ${i % 2 === 1 ? 'border-l border-sand-200' : ''} ${i >= 2 ? 'md:border-l md:border-sand-200' : ''} ${i === 2 ? 'pl-0 md:pl-4' : ''}`}>
                    <dt className="order-2 text-xs text-sand-600">{fact.label}</dt>
                    <dd className="order-1 text-lg font-bold text-sand-900 truncate">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {/* ── Products ───────────────────────────────────────────── */}
        <section className="container-app mt-10" aria-label="Products">
          <FadeIn className="flex items-end justify-between mb-6">
            <div>
              <p className="eyebrow mb-2">The shop</p>
              <h2 className="text-xl md:text-2xl font-display font-bold text-sand-900">
                Products from {vendor.business_name}
              </h2>
              <p className="text-sm text-sand-600 mt-1">
                {products.length} product{products.length !== 1 ? 's' : ''} · every order escrow-protected by SWK Ghana
              </p>
            </div>
          </FadeIn>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-sand-200 p-12 text-center">
              <Leaf className="w-10 h-10 text-green-200 mx-auto mb-3" />
              <p className="text-sm text-sand-600">No live products yet, check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* ── About / story ──────────────────────────────────────── */}
        <section className="container-app mt-14" aria-label="About the business">
          <div className="grid lg:grid-cols-[1fr,380px] gap-8 items-start">
            <div>
              <FadeIn>
                <h2 className="text-xl md:text-2xl font-display font-bold text-sand-900 mb-4">
                  About {vendor.business_name}
                </h2>
                <div className="space-y-4 text-sand-600 text-sm md:text-base leading-relaxed">
                  {(vendor.story || vendor.business_description || '')
                    .split('\n')
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                </div>
              </FadeIn>

              {/* Sustainability statement */}
              {vendor.sustainability_statement && (
                <FadeIn className="mt-8">
                  <figure className="rounded-2xl bg-green-50 border-l-4 border-gold-400 px-6 py-6 md:px-8">
                    <figcaption className="eyebrow mb-3">Our sustainability commitment</figcaption>
                    <blockquote className="text-base md:text-lg font-medium text-green-900 leading-relaxed">
                      {vendor.sustainability_statement}
                    </blockquote>
                  </figure>
                </FadeIn>
              )}

              {/* Team */}
              {founders.length > 0 && (
                <div className="mt-10">
                  <FadeIn>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-sand-900 mb-5">
                      Meet the people behind it
                    </h2>
                  </FadeIn>
                  <Stagger className="grid sm:grid-cols-2 gap-4">
                    {founders.map(founder => (
                      <StaggerItem key={founder.name}>
                        <div className="bg-white rounded-2xl border border-sand-200 shadow-card p-5 h-full">
                          <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-lg font-display font-bold mb-3">
                            {founder.name.split(' ').map(w => w.charAt(0)).slice(0, 2).join('')}
                          </div>
                          <h3 className="text-sm font-bold text-sand-900">{founder.name}</h3>
                          <p className="text-xs font-semibold text-green-600 mb-2">{founder.role}</p>
                          {founder.bio && (
                            <p className="text-xs text-sand-600 leading-relaxed">{founder.bio}</p>
                          )}
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              )}
            </div>

            {/* ── Contact sidebar ─────────────────────────────────── */}
            <FadeIn className="lg:sticky lg:top-24">
              <div className="bg-white rounded-2xl border border-sand-200 shadow-card p-6">
                <h3 className="text-sm font-bold text-sand-900 mb-4">Contact & links</h3>

                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-2.5 text-sm text-sand-600">
                    <MapPin className="w-4 h-4 text-sand-600 mt-0.5 flex-shrink-0" />
                    <span>{vendor.location}, {vendor.region}, Ghana</span>
                  </div>
                  {vendor.phone && (
                    <div className="flex items-start gap-2.5 text-sm">
                      <Phone className="w-4 h-4 text-sand-600 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        <a href={`tel:${vendor.phone}`} className="text-sand-600 hover:text-green-700 transition-colors">
                          {formatGhanaPhone(vendor.phone)}
                        </a>
                        {waNumber && (
                          <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 font-semibold hover:text-green-800"
                          >
                            Chat on WhatsApp →
                          </a>
                        )}
                        {/* Matches the Terms: questions welcome, payment only
                            on the platform, where escrow protects the buyer */}
                        <span className="text-[11px] text-sand-600 leading-snug mt-1">
                          Ask anything, but pay only through SWK Marketplace so your money stays protected.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {socials.length > 0 && (
                  <div className="flex items-center gap-2 mb-5">
                    {socials.map(s => {
                      const Icon = s.icon
                      return (
                        <a
                          key={s.label}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={s.label}
                          className="w-9 h-9 rounded-lg bg-sand-50 border border-sand-200 flex items-center justify-center text-sand-600 hover:text-green-700 hover:border-green-300 transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                        </a>
                      )
                    })}
                  </div>
                )}

                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-5">
                  <p className="text-xs font-bold text-teal-800 mb-1">Buy with confidence</p>
                  <p className="text-xs text-teal-800 leading-relaxed">
                    All orders are placed and paid through SWK Marketplace. Your money is held in
                    escrow by SWK Ghana until you confirm delivery.
                  </p>
                </div>

                <ShareStoreLink slug={slug} businessName={vendor.business_name} variant="row" />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── Powered by ─────────────────────────────────────────── */}
        <div className="container-app mt-14 mb-10">
          <div className="text-center border-t border-sand-200 pt-8">
            <p className="text-xs text-sand-600 mb-2">
              This shop is powered by{' '}
              <Link href="/" className="text-green-700 font-semibold hover:underline">
                SWK Marketplace
              </Link>
              , Ghana&rsquo;s youth-powered sustainable marketplace.
            </p>
            <Link
              href="/vendor/apply"
              className="text-xs font-semibold text-green-600 hover:text-green-700 hover:underline"
            >
              Sell your sustainable products too →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
