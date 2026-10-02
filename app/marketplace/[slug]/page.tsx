'use client'

// A Client Component because the image gallery and order form are
// interactive and the product loads in the browser. Link previews and SEO
// metadata come from the server layout next to this file (layout.tsx).

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin,
  Star,
  ShieldCheck,
  Package,
  ChevronLeft,
  ChevronRight,
  Leaf,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ReviewSection } from '@/components/marketplace/ReviewSection'
import { JsonLd } from '@/components/seo/JsonLd'
import { ShareButtons } from '@/components/ui/ShareButtons'
import { ProductPurchasePanel } from '@/components/cart/ProductPurchasePanel'
import { formatCurrency } from '@/lib/utils'
import { canOptimizeImage } from '@/lib/marketplace/images'
import {
  CATEGORY_META,
  VALUE_TAG_META,
  type Product,
  type ValueTag,
} from '@/types'

const APP_URL = 'https://marketplace.swkghana.org'

// ─── Image gallery ─────────────────────────────────────────────────────────────

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const safeImages = images?.length ? images : ['/images/product-placeholder.svg']

  function prev() {
    setActiveIdx(i => (i === 0 ? safeImages.length - 1 : i - 1))
  }
  function next() {
    setActiveIdx(i => (i === safeImages.length - 1 ? 0 : i + 1))
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-sand-100" style={{ aspectRatio: '4/3' }}>
        <Image
          src={safeImages[activeIdx]}
          alt={`${title}, image ${activeIdx + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
          unoptimized={!canOptimizeImage(safeImages[activeIdx])}
        />

        {/* Nav arrows, only when multiple images */}
        {safeImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 shadow-card flex items-center justify-center text-sand-700 hover:bg-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 shadow-card flex items-center justify-center text-sand-700 hover:bg-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Dot indicators: the visible dot stays small, the tap target doesn't */}
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center">
              {safeImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className="w-6 h-6 flex items-center justify-center"
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === activeIdx ? 'true' : undefined}
                >
                  <span
                    className={`block w-2 h-2 rounded-full transition-all ${
                      i === activeIdx ? 'bg-white scale-125' : 'bg-white/50'
                    }`}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {safeImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {safeImages.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              aria-current={i === activeIdx ? 'true' : undefined}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeIdx ? 'border-green-600 opacity-100' : 'border-sand-200 opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={src}
                alt={`Thumbnail ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized={!canOptimizeImage(src)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function ProductDetailSkeleton() {
  return (
    <>
      <Navbar />
      <div className="container-app py-8 pb-24 md:pb-8" role="status" aria-label="Loading product">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="skeleton rounded-2xl w-full" style={{ aspectRatio: '4/3' }} />
          <div className="space-y-4">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-8 w-full rounded" />
            <div className="skeleton h-8 w-2/3 rounded" />
            <div className="skeleton h-6 w-32 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
            <div className="skeleton h-44 w-full rounded-xl mt-4" />
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return

    const supabase = createClient()
    let isMounted = true

    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select(
          `
          *,
          vendor:vendor_profiles (
            id, business_name, slug, business_description, location, region,
            logo_url, rating, review_count, status, user_id,
            total_products, total_sales
          )
        `,
        )
        .eq('slug', slug)
        .eq('status', 'approved')
        .maybeSingle()

      if (!isMounted) return

      if (error || !data) {
        setNotFound(true)
      } else {
        setProduct(data as Product)
        // Count the visit (fire and forget)
        supabase.rpc('increment_product_views', { product_id: data.id }).then(() => {})
      }
      setLoading(false)
    }

    fetchProduct()
    return () => { isMounted = false }
  }, [slug])

  if (loading) return <ProductDetailSkeleton />

  if (notFound || !product) {
    return (
      <>
        <Navbar />
        <main id="main" className="container-app py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-sand-600" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-display font-bold text-sand-900 mb-2">Product not found</h1>
          <p className="text-sand-600 mb-6">This product may have been removed or is no longer available.</p>
          <Link href="/marketplace" className="inline-flex items-center gap-2 min-h-[44px] px-5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Back to marketplace
          </Link>
        </main>
        <Footer />
        <MobileBottomNav />
      </>
    )
  }

  const categoryMeta = CATEGORY_META[product.category]
  const hasSDG12 = product.sdg_tags?.includes('sdg_12_responsible_consumption')
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity < 5
  const isOutOfStock = product.stock_quantity === 0
  const isSample = !!product.is_demo
  const vendor = product.vendor

  return (
    <>
      {/* Search engines get structured data for real listings only */}
      {!isSample && <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          description: product.short_description || product.description,
          image: product.images?.length ? product.images : undefined,
          category: categoryMeta?.label,
          brand: vendor?.business_name
            ? { '@type': 'Brand', name: vendor.business_name }
            : undefined,
          offers: {
            '@type': 'Offer',
            price: product.price_ghs,
            priceCurrency: 'GHS',
            availability: isOutOfStock
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
            url: `${APP_URL}/marketplace/${product.slug}`,
          },
        }}
      />}
      <Navbar />

      <main id="main" className="container-app py-6 pb-28 md:pb-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-sand-600 mb-6" aria-label="Breadcrumb">
          <Link href="/marketplace" className="hover:text-green-600 transition-colors">Marketplace</Link>
          <span aria-hidden="true">›</span>
          <Link href={`/marketplace?category=${product.category}`} className="hover:text-green-600 transition-colors">
            {categoryMeta?.label}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="text-sand-600 truncate max-w-48" aria-current="page">{product.title}</span>
        </nav>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">

          {/* Left: image gallery */}
          <div>
            <ImageGallery images={product.images || []} title={product.title} />
          </div>

          {/* Right: details + order form */}
          <div className="space-y-5">

            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              {categoryMeta && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand-100 text-sand-700 text-xs font-medium border border-sand-200">
                  {categoryMeta.label}
                </span>
              )}
              {hasSDG12 && (
                <span className="sdg-badge">
                  <Leaf className="w-3 h-3" aria-hidden="true" />
                  SDG 12 Verified
                </span>
              )}
              {isSample && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gold-50 text-gold-800 text-xs font-semibold border border-gold-100">
                  Sample product
                </span>
              )}
              {isOutOfStock && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sand-100 text-sand-600 text-xs font-medium border border-sand-200">
                  Out of stock
                </span>
              )}
              {isLowStock && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gold-50 text-gold-700 text-xs font-medium border border-gold-100">
                  Only {product.stock_quantity} left!
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-sand-900 leading-tight">
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-700">
                {formatCurrency(product.price_ghs)}
              </span>
              {product.unit && (
                <span className="text-sm text-sand-600">{product.unit}</span>
              )}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p className="text-sm text-sand-600 leading-relaxed">
                {product.short_description}
              </p>
            )}

            {/* Location */}
            {product.location && (
              <div className="flex items-center gap-1.5 text-sm text-sand-600">
                <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {product.location}{product.region ? `, ${product.region}` : ''}
              </div>
            )}

            {/* Value tags */}
            {product.value_tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(product.value_tags as ValueTag[]).map(tag => {
                  const meta = VALUE_TAG_META[tag]
                  return meta ? (
                    <Link
                      key={tag}
                      href={`/marketplace?values=${tag}`}
                      className="value-tag text-xs"
                    >
                      {meta.label}
                    </Link>
                  ) : null
                })}
              </div>
            )}

            {/* Min order info */}
            {product.minimum_order && product.minimum_order > 1 && (
              <div className="flex items-center gap-2 text-xs text-sand-600">
                <Package className="w-4 h-4" aria-hidden="true" />
                Minimum order: {product.minimum_order} {product.unit || 'units'}
              </div>
            )}

            {/* Divider */}
            <hr className="border-sand-200" />

            {/* Quantity, Add to cart, Buy now */}
            <ProductPurchasePanel product={product} />

            {/* Vendor card */}
            {vendor && (
              <div className="rounded-xl border border-sand-200 bg-white p-4 flex items-start gap-4">
                <div className="flex-shrink-0">
                  {vendor.logo_url ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-sand-200">
                      <Image
                        src={vendor.logo_url}
                        alt={vendor.business_name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized={!canOptimizeImage(vendor.logo_url)}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-lg font-bold border-2 border-green-200" aria-hidden="true">
                      {vendor.business_name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-sand-600 font-medium mb-0.5">Sold by</p>
                  <h2 className="text-sm font-semibold text-sand-900 truncate">{vendor.business_name}</h2>
                  {vendor.location && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-sand-600" aria-hidden="true" />
                      <span className="text-xs text-sand-600">{vendor.location}</span>
                    </div>
                  )}
                  {vendor.rating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" aria-hidden="true" />
                      <span className="text-xs font-medium text-sand-700">{vendor.rating.toFixed(1)}</span>
                      <span className="text-xs text-sand-600">({vendor.review_count} reviews)</span>
                    </div>
                  )}
                </div>
                <Link
                  href={`/store/${vendor.slug ?? vendor.id}`}
                  className="flex-shrink-0 inline-flex items-center gap-1 min-h-[44px] text-xs text-green-700 font-medium hover:text-green-800 transition-colors"
                >
                  Visit store <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>
            )}

            {/* Share: previews on WhatsApp show this product's photo and price */}
            {!isSample && (
              <div>
                <h2 className="text-xs font-semibold text-sand-600 uppercase tracking-wide mb-2">Share this product</h2>
                <ShareButtons
                  url={`${APP_URL}/marketplace/${product.slug}`}
                  title={product.title}
                  text={`${product.title}, ${formatCurrency(product.price_ghs)} on SWK Marketplace 🌿`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Full description */}
        {product.description && (
          <div className="mt-12 max-w-3xl">
            <h2 className="text-xl font-display font-bold text-sand-900 mb-4">About this product</h2>
            <div className="prose prose-sm max-w-none text-sand-600 leading-relaxed space-y-3">
              {product.description.split('\n').filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-12 max-w-3xl">
          <ReviewSection productId={product.id} />
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
