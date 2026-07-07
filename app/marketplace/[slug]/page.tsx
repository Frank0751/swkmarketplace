'use client'

// This is a Client Component because it uses useState/useEffect for
// the interactive image gallery and order form. Product data is fetched
// client-side via the Supabase browser client. For static SEO metadata,
// add a generateMetadata export in a separate server file or use a
// Next.js route layout in app/marketplace/[slug]/layout.tsx.

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin,
  Star,
  ShieldCheck,
  Package,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Leaf,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { demoEnabled, getDemoProductBySlug, isDemoId } from '@/lib/demo/data'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ReviewSection } from '@/components/marketplace/ReviewSection'
import { formatCurrency } from '@/lib/utils'
import {
  CATEGORY_META,
  VALUE_TAG_META,
  GHANA_REGIONS,
  type Product,
  type GhanaRegion,
  type ValueTag,
} from '@/types'

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
        />

        {/* Nav arrows, only when multiple images */}
        {safeImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-card flex items-center justify-center text-sand-700 hover:bg-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-card flex items-center justify-center text-sand-700 hover:bg-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {safeImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === activeIdx ? 'bg-white scale-125' : 'bg-white/50'
                  }`}
                  aria-label={`View image ${i + 1}`}
                />
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
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeIdx ? 'border-green-600 opacity-100' : 'border-sand-200 opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={src} alt={`Thumbnail ${i + 1}`} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Order form ────────────────────────────────────────────────────────────────

function OrderForm({
  product,
  onSuccess,
}: {
  product: Product
  onSuccess: (orderId: string) => void
}) {
  const [quantity, setQuantity] = useState(product.minimum_order || 1)
  const [region, setRegion] = useState<GhanaRegion>('' as GhanaRegion)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const min = product.minimum_order || 1
  const max = product.stock_quantity
  const deliveryFee = 15 // flat GHS 15 placeholder, can be dynamic
  const subtotal = product.price_ghs * quantity
  const total = subtotal + deliveryFee

  const isOutOfStock = max === 0
  const isSample = isDemoId(product.id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!region) { setError('Please select a delivery region.'); return }
    if (!address.trim()) { setError('Please enter a delivery address.'); return }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          vendor_id: product.vendor_id,
          quantity,
          delivery_region: region,
          delivery_address: address,
          buyer_notes: notes,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to place order. Please try again.')
        setLoading(false)
        return
      }

      // Redirect to Paystack payment page
      if (json.data?.authorization_url) {
        window.location.href = json.data.authorization_url
      } else if (json.data?.order_id) {
        onSuccess(json.data.order_id)
      } else {
        router.push('/buyer/orders')
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
      setLoading(false)
    }
  }

  if (isSample) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gold-50 border border-gold-100">
        <AlertCircle className="w-5 h-5 text-gold-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gold-800">Sample product</p>
          <p className="text-xs text-gold-700/80 mt-0.5">
            This is demonstration data showing how a live listing works, it can&rsquo;t be ordered.
          </p>
        </div>
      </div>
    )
  }

  if (isOutOfStock) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-sand-100 border border-sand-200">
        <AlertCircle className="w-5 h-5 text-sand-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-sand-700">Out of stock</p>
          <p className="text-xs text-sand-400 mt-0.5">This product is temporarily unavailable.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Quantity */}
      <div>
        <label className="form-label">Quantity{product.unit ? ` (${product.unit})` : ''}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity(q => Math.max(min, q - 1))}
            disabled={quantity <= min}
            className="w-9 h-9 rounded-lg border border-sand-200 flex items-center justify-center text-sand-700 hover:bg-sand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center font-semibold text-sand-900 tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(q => Math.min(max, q + 1))}
            disabled={quantity >= max}
            className="w-9 h-9 rounded-lg border border-sand-200 flex items-center justify-center text-sand-700 hover:bg-sand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          {product.minimum_order && product.minimum_order > 1 && (
            <span className="text-xs text-sand-400">Min order: {product.minimum_order}</span>
          )}
        </div>
      </div>

      {/* Delivery region */}
      <div>
        <label htmlFor="region" className="form-label">Delivery region <span className="text-red-500">*</span></label>
        <select
          id="region"
          className="form-input"
          value={region}
          onChange={e => setRegion(e.target.value as GhanaRegion)}
          required
        >
          <option value="">Select region…</option>
          {GHANA_REGIONS.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Delivery address */}
      <div>
        <label htmlFor="address" className="form-label">Delivery address <span className="text-red-500">*</span></label>
        <textarea
          id="address"
          className="form-input min-h-[80px] resize-none"
          placeholder="Street address, neighbourhood, landmark…"
          value={address}
          onChange={e => setAddress(e.target.value)}
          required
          maxLength={300}
        />
      </div>

      {/* Buyer notes */}
      <div>
        <label htmlFor="notes" className="form-label">Notes to vendor <span className="text-sand-400 font-normal">(optional)</span></label>
        <textarea
          id="notes"
          className="form-input min-h-[60px] resize-none"
          placeholder="Any special instructions…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={500}
        />
      </div>

      {/* Price summary */}
      <div className="bg-sand-50 rounded-xl border border-sand-200 p-4 space-y-2 text-sm">
        <div className="flex justify-between text-sand-600">
          <span>Subtotal ({quantity} × {formatCurrency(product.price_ghs)})</span>
          <span className="font-medium text-sand-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sand-600">
          <span>Delivery fee</span>
          <span className="font-medium text-sand-900">{formatCurrency(deliveryFee)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-sand-200 font-semibold text-sand-900 text-base">
          <span>Total</span>
          <span className="text-green-700">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Escrow note */}
      <div className="trust-badge w-full justify-center">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <span>Payment held in escrow until you confirm delivery</span>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || isOutOfStock}
        className="w-full py-3.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 active:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <ShoppingBag className="w-4 h-4" />
            Place order, {formatCurrency(total)}
          </>
        )}
      </button>

      <p className="text-center text-xs text-sand-400">
        Secure payment powered by Paystack
      </p>
    </form>
  )
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function ProductDetailSkeleton() {
  return (
    <>
      <Navbar />
      <div className="container-app py-8 pb-24 md:pb-8">
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
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)

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
        .single()

      if (!isMounted) return

      if (error || !data) {
        // Fall back to sample data so demo links stay browsable
        const demo = demoEnabled() ? getDemoProductBySlug(slug) : undefined
        if (demo) {
          setProduct(demo)
        } else {
          setNotFound(true)
        }
      } else {
        setProduct(data as Product)
        // Increment view count (fire and forget)
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
        <div className="container-app py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-sand-300" />
          </div>
          <h1 className="text-2xl font-display font-bold text-sand-900 mb-2">Product not found</h1>
          <p className="text-sand-400 mb-6">This product may have been removed or is no longer available.</p>
          <Link href="/marketplace" className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to marketplace
          </Link>
        </div>
        <Footer />
        <MobileBottomNav />
      </>
    )
  }

  if (orderSuccess) {
    return (
      <>
        <Navbar />
        <div className="container-app py-24 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-sand-900 mb-2">Order placed!</h1>
          <p className="text-sand-500 mb-6">Your order has been submitted. You'll be redirected to complete payment.</p>
          <Link href="/buyer/orders" className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
            View my orders
          </Link>
        </div>
        <Footer />
        <MobileBottomNav />
      </>
    )
  }

  const categoryMeta = CATEGORY_META[product.category]
  const hasSDG12 = product.sdg_tags?.includes('sdg_12_responsible_consumption')
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity < 5
  const isOutOfStock = product.stock_quantity === 0
  const vendor = product.vendor

  return (
    <>
      <Navbar />

      <div className="container-app py-6 pb-28 md:pb-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-sand-400 mb-6" aria-label="Breadcrumb">
          <Link href="/marketplace" className="hover:text-green-600 transition-colors">Marketplace</Link>
          <span>›</span>
          <Link href={`/marketplace?category=${product.category}`} className="hover:text-green-600 transition-colors">
            {categoryMeta?.label}
          </Link>
          <span>›</span>
          <span className="text-sand-600 truncate max-w-48">{product.title}</span>
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
                  {categoryMeta.emoji} {categoryMeta.label}
                </span>
              )}
              {hasSDG12 && (
                <span className="sdg-badge">
                  <Leaf className="w-3 h-3" />
                  SDG 12 Verified
                </span>
              )}
              {isOutOfStock && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sand-100 text-sand-500 text-xs font-medium border border-sand-200">
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
                <span className="text-sm text-sand-400">{product.unit}</span>
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
              <div className="flex items-center gap-1.5 text-sm text-sand-400">
                <MapPin className="w-4 h-4 flex-shrink-0" />
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
                      <span role="img" aria-hidden="true">{meta.icon}</span>
                      {meta.label}
                    </Link>
                  ) : null
                })}
              </div>
            )}

            {/* Min order info */}
            {product.minimum_order && product.minimum_order > 1 && (
              <div className="flex items-center gap-2 text-xs text-sand-500">
                <Package className="w-4 h-4" />
                Minimum order: {product.minimum_order} {product.unit || 'units'}
              </div>
            )}

            {/* Divider */}
            <hr className="border-sand-200" />

            {/* Order form */}
            <OrderForm product={product} onSuccess={id => setOrderSuccess(id)} />

            {/* Vendor card */}
            {vendor && (
              <div className="rounded-xl border border-sand-200 bg-white p-4 flex items-start gap-4">
                <div className="flex-shrink-0">
                  {vendor.logo_url ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-sand-200">
                      <Image src={vendor.logo_url} alt={vendor.business_name} fill sizes="48px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-lg font-bold border-2 border-green-200">
                      {vendor.business_name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-sand-400 font-medium mb-0.5">Sold by</p>
                  <h3 className="text-sm font-semibold text-sand-900 truncate">{vendor.business_name}</h3>
                  {vendor.location && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-sand-400" />
                      <span className="text-xs text-sand-400">{vendor.location}</span>
                    </div>
                  )}
                  {vendor.rating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
                      <span className="text-xs font-medium text-sand-700">{vendor.rating.toFixed(1)}</span>
                      <span className="text-xs text-sand-400">({vendor.review_count} reviews)</span>
                    </div>
                  )}
                </div>
                <Link
                  href={`/store/${vendor.slug ?? vendor.id}`}
                  className="flex-shrink-0 flex items-center gap-1 text-xs text-green-600 font-medium hover:text-green-700 transition-colors"
                >
                  Visit store <ExternalLink className="w-3 h-3" />
                </Link>
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
      </div>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
