import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MapPin,
  Phone,
  Star,
  ShieldCheck,
  BadgeCheck,
  Users,
  CalendarDays,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Leaf,
  Quote,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ProductCard } from '@/components/marketplace/ProductCard'
import { ShareStoreLink } from '@/components/vendor/ShareStoreLink'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/motion'
import { demoEnabled, getDemoVendor, getDemoProducts, isDemoId } from '@/lib/demo/data'
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

  if (demoEnabled()) {
    return getDemoVendor(slug) ?? null
  }
  return null
}

async function fetchVendorProducts(vendor: VendorProfile): Promise<Product[]> {
  if (isDemoId(vendor.id)) {
    return getDemoProducts({ vendorId: vendor.id, limit: 48 })
  }

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

  const title = `${vendor.business_name}, SWK Marketplace`
  const description =
    vendor.business_description ||
    `Shop sustainable products from ${vendor.business_name}, a verified green business on SWK Marketplace.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: vendor.banner_url ? [{ url: vendor.banner_url }] : undefined,
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
  const isSample = isDemoId(vendor.id)

  const whatsappDigits = vendor.phone?.replace(/[^0-9]/g, '')

  const facts = [
    vendor.year_founded && { icon: CalendarDays, label: 'Founded', value: String(vendor.year_founded) },
    vendor.team_size && { icon: Users, label: 'Team', value: `${vendor.team_size} people` },
    vendor.total_sales > 0 && { icon: BadgeCheck, label: 'Orders fulfilled', value: `${vendor.total_sales}+` },
    vendor.review_count > 0 && { icon: Star, label: 'Rating', value: `${vendor.rating.toFixed(1)} (${vendor.review_count} reviews)` },
  ].filter(Boolean) as { icon: typeof Users; label: string; value: string }[]

  const socials = [
    vendor.website && { icon: Globe, href: vendor.website, label: 'Website' },
    vendor.social_links?.website && !vendor.website && { icon: Globe, href: vendor.social_links.website, label: 'Website' },
    vendor.social_links?.instagram && { icon: Instagram, href: vendor.social_links.instagram, label: 'Instagram' },
    vendor.social_links?.facebook && { icon: Facebook, href: vendor.social_links.facebook, label: 'Facebook' },
    vendor.social_links?.twitter && { icon: Twitter, href: vendor.social_links.twitter, label: 'X (Twitter)' },
  ].filter(Boolean) as { icon: typeof Globe; href: string; label: string }[]

  return (
    <>
      <Navbar />

      <main className="pb-24 md:pb-0">
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
              Sample store, for demonstration
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

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-sand-500 mb-3">
                  <span className="flex items-center gap-1">
                    <span role="img" aria-hidden="true">{catMeta?.emoji}</span> {catMeta?.label}
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
              <div className="mt-6 pt-5 border-t border-sand-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                {facts.map(fact => {
                  const Icon = fact.icon
                  return (
                    <div key={fact.label} className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-sand-900 truncate">{fact.value}</div>
                        <div className="text-[11px] text-sand-400 font-medium">{fact.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Products ───────────────────────────────────────────── */}
        <section className="container-app mt-10" aria-label="Products">
          <FadeIn className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-sand-900">
                Products from {vendor.business_name}
              </h2>
              <p className="text-sm text-sand-400 mt-0.5">
                {products.length} product{products.length !== 1 ? 's' : ''} · every order escrow-protected by SWK Ghana
              </p>
            </div>
          </FadeIn>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-sand-200 p-12 text-center">
              <Leaf className="w-10 h-10 text-green-200 mx-auto mb-3" />
              <p className="text-sm text-sand-400">No live products yet, check back soon.</p>
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
                  <div className="relative bg-green-50 border border-green-100 rounded-2xl p-6 md:p-7">
                    <Quote className="w-6 h-6 text-green-300 absolute top-5 left-5" aria-hidden="true" />
                    <div className="pl-9">
                      <h3 className="text-sm font-bold text-green-800 mb-2 flex items-center gap-1.5">
                        <Leaf className="w-4 h-4" /> Our sustainability commitment
                      </h3>
                      <p className="text-sm text-green-900/80 leading-relaxed italic">
                        {vendor.sustainability_statement}
                      </p>
                    </div>
                  </div>
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
                            <p className="text-xs text-sand-500 leading-relaxed">{founder.bio}</p>
                          )}
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              )}
            </div>

            {/* ── Contact sidebar ─────────────────────────────────── */}
            <FadeIn direction="left" className="lg:sticky lg:top-24">
              <div className="bg-white rounded-2xl border border-sand-200 shadow-card p-6">
                <h3 className="text-sm font-bold text-sand-900 mb-4">Contact & links</h3>

                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-2.5 text-sm text-sand-600">
                    <MapPin className="w-4 h-4 text-sand-400 mt-0.5 flex-shrink-0" />
                    <span>{vendor.location}, {vendor.region}, Ghana</span>
                  </div>
                  {vendor.phone && (
                    <div className="flex items-start gap-2.5 text-sm">
                      <Phone className="w-4 h-4 text-sand-400 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        <a href={`tel:${vendor.phone}`} className="text-sand-600 hover:text-green-700 transition-colors">
                          {vendor.phone}
                        </a>
                        {whatsappDigits && (
                          <a
                            href={`https://wa.me/${whatsappDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 font-semibold hover:text-green-700"
                          >
                            Chat on WhatsApp →
                          </a>
                        )}
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
                          className="w-9 h-9 rounded-lg bg-sand-50 border border-sand-200 flex items-center justify-center text-sand-500 hover:text-green-700 hover:border-green-300 transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                        </a>
                      )
                    })}
                  </div>
                )}

                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-teal-800">Buy with confidence</span>
                  </div>
                  <p className="text-[11px] text-teal-700/90 leading-relaxed">
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
            <p className="text-xs text-sand-400 mb-2">
              This store is powered by{' '}
              <Link href="/" className="text-green-600 font-semibold hover:underline">
                SWK Marketplace
              </Link>{' '}
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
