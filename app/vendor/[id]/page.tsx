import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ProductCard } from '@/components/marketplace/ProductCard'
import { CATEGORY_META } from '@/types'
import { formatDate, formatNumber } from '@/lib/utils'
import {
  MapPin,
  Star,
  Package,
  ShoppingBag,
  Instagram,
  Facebook,
  Globe,
  Twitter,
  CalendarDays,
  CheckCircle,
  Leaf,
} from 'lucide-react'
import type { VendorProfile, Product, User } from '@/types'

interface VendorProfilePageProps {
  params: { id: string }
}

async function getVendorData(id: string) {
  const supabase = await createClient()

  const { data: vendor, error } = await supabase
    .from('vendor_profiles')
    .select('*, user:users(*)')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error || !vendor) return null

  const { data: products } = await supabase
    .from('products')
    .select('*, vendor:vendor_profiles(id, business_name, logo_url, location, region)')
    .eq('vendor_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  return {
    vendor: vendor as VendorProfile & { user: User },
    products: (products ?? []) as Product[],
  }
}

export async function generateMetadata({ params }: VendorProfilePageProps): Promise<Metadata> {
  const data = await getVendorData(params.id)
  if (!data) return { title: 'Vendor Not Found' }

  const { vendor } = data
  return {
    title: `${vendor.business_name} — SWK Marketplace`,
    description: vendor.sustainability_statement?.slice(0, 160),
    openGraph: {
      title: vendor.business_name,
      description: vendor.sustainability_statement?.slice(0, 160),
      images: vendor.banner_url ? [vendor.banner_url] : [],
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function VendorProfilePage({ params }: VendorProfilePageProps) {
  const data = await getVendorData(params.id)
  if (!data) notFound()

  const { vendor, products } = data
  const catMeta = CATEGORY_META[vendor.category]

  const stats = [
    { label: 'Products',     value: formatNumber(vendor.total_products), icon: Package },
    { label: 'Orders',       value: formatNumber(vendor.total_sales),    icon: ShoppingBag },
    { label: 'Rating',       value: vendor.rating ? `${vendor.rating.toFixed(1)} ★` : 'New', icon: Star },
    { label: 'Reviews',      value: formatNumber(vendor.review_count),   icon: CheckCircle },
  ]

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      <Navbar />

      {/* Banner */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden">
        {vendor.banner_url ? (
          <img
            src={vendor.banner_url}
            alt={`${vendor.business_name} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(135deg, #3B6D11 0%, #0F6E56 50%, #BA7517 100%)',
            }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <main className="flex-1">
        <div className="container-app">
          {/* Profile header */}
          <div className="relative -mt-16 md:-mt-20 mb-8">
            <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-5 md:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {/* Logo */}
                <div className="flex-shrink-0">
                  {vendor.logo_url ? (
                    <img
                      src={vendor.logo_url}
                      alt={`${vendor.business_name} logo`}
                      className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-green-100 border-2 border-white shadow-md flex items-center justify-center">
                      <Leaf className="w-8 h-8 text-green-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-display font-bold text-sand-900">
                        {vendor.business_name}
                      </h1>
                      <p className="text-sand-500 mt-0.5">{vendor.user?.full_name}</p>
                    </div>

                    {/* SDG badge */}
                    <span className="sdg-badge inline-flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      SDG 12 Verified
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-sand-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-base">{catMeta?.emoji}</span>
                      {catMeta?.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {vendor.location}, {vendor.region}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" />
                      Member since {formatDate(vendor.created_at)}
                    </span>
                  </div>

                  {/* Social links */}
                  {vendor.social_links && (
                    <div className="flex items-center gap-2 mt-3">
                      {vendor.social_links.instagram && (
                        <a
                          href={vendor.social_links.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-lg transition-colors"
                          aria-label="Instagram"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {vendor.social_links.facebook && (
                        <a
                          href={vendor.social_links.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          aria-label="Facebook"
                        >
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {vendor.social_links.twitter && (
                        <a
                          href={vendor.social_links.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg transition-colors"
                          aria-label="Twitter / X"
                        >
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                      {vendor.social_links.website && (
                        <a
                          href={vendor.social_links.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-sand-100 hover:bg-sand-200 text-sand-700 rounded-lg transition-colors"
                          aria-label="Website"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-sand-100">
                {stats.map(stat => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className="text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Icon className="w-4 h-4 text-sand-400" />
                        <span className="text-xs font-medium text-sand-500">{stat.label}</span>
                      </div>
                      <div className="text-xl font-bold text-sand-900">{stat.value}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Left: about */}
            <div className="lg:col-span-1 space-y-5">
              {/* About */}
              {vendor.business_description && (
                <div className="bg-white rounded-xl border border-sand-200 p-5">
                  <h2 className="font-semibold text-sand-900 mb-3">About</h2>
                  <p className="text-sm text-sand-600 leading-relaxed">
                    {vendor.business_description}
                  </p>
                </div>
              )}

              {/* Sustainability statement */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="w-4 h-4 text-green-600" />
                  <h2 className="font-semibold text-green-800 text-sm">Sustainability Statement</h2>
                </div>
                <p className="text-sm text-green-700 leading-relaxed">
                  {vendor.sustainability_statement}
                </p>
              </div>

              {/* Trust badges */}
              <div className="bg-white rounded-xl border border-sand-200 p-5">
                <h2 className="font-semibold text-sand-900 mb-3 text-sm">Certifications</h2>
                <div className="space-y-2">
                  <div className="trust-badge inline-flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verified Green Entrepreneur
                  </div>
                  <div className="trust-badge inline-flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Escrow-Protected Sales
                  </div>
                  <div className="sdg-badge inline-flex items-center gap-2 text-xs">
                    SDG 12 Aligned
                  </div>
                </div>
              </div>
            </div>

            {/* Right: products grid */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-sand-900">
                  Products ({products.length})
                </h2>
                {products.length > 0 && (
                  <Link
                    href={`/marketplace?vendor_id=${vendor.id}`}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    View all
                  </Link>
                )}
              </div>

              {products.length === 0 ? (
                <div className="bg-white rounded-xl border border-sand-200 flex flex-col items-center justify-center py-16 text-sand-400">
                  <Package className="w-10 h-10 mb-3" />
                  <p className="font-medium">No products yet</p>
                  <p className="text-sm mt-1">This vendor hasn't listed any products yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
