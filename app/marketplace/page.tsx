import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SlidersHorizontal, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { CategoryStrip } from '@/components/marketplace/CategoryStrip'
import { ValueFilterStrip } from '@/components/marketplace/ValueFilterStrip'
import { ProductGrid } from '@/components/marketplace/ProductGrid'
import { MobileSortSelect } from '@/components/marketplace/MobileSortSelect'
import { demoEnabled, getDemoProducts } from '@/lib/demo/data'
import { CATEGORY_META, GHANA_REGIONS, VALUE_TAG_META, type ProductCategory, type GhanaRegion, type ValueTag } from '@/types'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Shop sustainable products | SWK Marketplace',
  description:
    'Discover eco-friendly, SDG 12-verified products from verified youth-led green entrepreneurs across Ghana and Africa.',
  openGraph: {
    title: 'Shop sustainable products | SWK Marketplace',
    description:
      'Browse organic, recycled, handmade, and agribusiness products supporting responsible consumption.',
    url: 'https://marketplace.swkghana.org/marketplace',
    siteName: 'SWK Marketplace',
  },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="product-card overflow-hidden">
          <div className="skeleton w-full" style={{ aspectRatio: '4/3' }} />
          <div className="p-3 space-y-2">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-8 w-full rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Product count (server) ───────────────────────────────────────────────────

async function fetchProductCount({
  category,
  valueTags,
  search,
  region,
  minPrice,
  maxPrice,
}: {
  category?: string
  valueTags?: string[]
  search?: string
  region?: string
  minPrice?: number
  maxPrice?: number
}): Promise<number> {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')

  if (category) query = query.eq('category', category)
  if (region) query = query.eq('region', region)
  if (valueTags && valueTags.length > 0) query = query.contains('value_tags', valueTags)
  if (search?.trim()) query = query.ilike('title', `%${search.trim()}%`)
  if (typeof minPrice === 'number') query = query.gte('price_ghs', minPrice)
  if (typeof maxPrice === 'number') query = query.lte('price_ghs', maxPrice)

  const { count } = await query
  return count || 0
}

// ─── Page params ──────────────────────────────────────────────────────────────

interface MarketplaceSearchParams {
  category?: string
  values?: string
  search?: string
  sort?: string
  page?: string
  region?: string
  min_price?: string
  max_price?: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: MarketplaceSearchParams
}) {
  const category = searchParams.category as ProductCategory | undefined
  const valueTags = searchParams.values
    ? (searchParams.values.split(',').filter(Boolean) as ValueTag[])
    : []
  const search = searchParams.search || ''
  const sort = searchParams.sort || 'newest'
  const page = Math.max(1, parseInt(searchParams.page || '1', 10))
  const region = searchParams.region as GhanaRegion | undefined
  const minPrice = searchParams.min_price ? parseFloat(searchParams.min_price) : undefined
  const maxPrice = searchParams.max_price ? parseFloat(searchParams.max_price) : undefined

  const LIMIT = 24

  let totalCount = await fetchProductCount({
    category,
    valueTags,
    search,
    region,
    minPrice,
    maxPrice,
  })

  // Mirror the ProductGrid sample-data fallback so the header count matches
  if (totalCount === 0 && demoEnabled()) {
    totalCount = getDemoProducts({
      limit: 1000,
      category,
      valueTags,
      search,
      region,
      minPrice,
      maxPrice,
    }).length
  }

  const totalPages = Math.ceil(totalCount / LIMIT)

  // Build URL helper for pagination / filter changes
  function buildUrl(overrides: Partial<MarketplaceSearchParams>): string {
    const params = new URLSearchParams()
    const merged = {
      category: category || '',
      values: valueTags.join(','),
      search,
      sort,
      page: String(page),
      region: region || '',
      min_price: minPrice !== undefined ? String(minPrice) : '',
      max_price: maxPrice !== undefined ? String(maxPrice) : '',
      ...overrides,
    }
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    return `/marketplace?${params.toString()}`
  }

  const hasActiveFilters = !!(category || valueTags.length || search || region || minPrice || maxPrice)

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <CategoryStrip />
      <ValueFilterStrip />

      <div className="container-app py-6 pb-24 md:pb-6">
        <div className="flex gap-6">

          {/* ── Desktop filter sidebar ─────────────────────────────── */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-36 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-sand-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-green-600" />
                  Filters
                </h2>
                {hasActiveFilters && (
                  <Link
                    href="/marketplace"
                    className="text-xs text-sand-400 hover:text-sand-900 underline underline-offset-2 transition-colors"
                  >
                    Clear all
                  </Link>
                )}
              </div>

              {/* Sort */}
              <div>
                <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide mb-2">Sort by</p>
                <div className="space-y-1">
                  {[
                    { value: 'newest', label: 'Newest first' },
                    { value: 'popular', label: 'Most popular' },
                    { value: 'price_asc', label: 'Price: low to high' },
                    { value: 'price_desc', label: 'Price: high to low' },
                  ].map(opt => (
                    <Link
                      key={opt.value}
                      href={buildUrl({ sort: opt.value, page: '1' })}
                      className={`block w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                        sort === opt.value
                          ? 'bg-green-600 text-white font-medium'
                          : 'text-sand-600 hover:bg-sand-100'
                      }`}
                    >
                      {opt.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Region */}
              <div>
                <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide mb-2">Region</p>
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-hide">
                  <Link
                    href={buildUrl({ region: '', page: '1' })}
                    className={`block w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                      !region ? 'bg-green-600 text-white font-medium' : 'text-sand-600 hover:bg-sand-100'
                    }`}
                  >
                    All regions
                  </Link>
                  {GHANA_REGIONS.map(r => (
                    <Link
                      key={r}
                      href={buildUrl({ region: r, page: '1' })}
                      className={`block w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                        region === r ? 'bg-green-600 text-white font-medium' : 'text-sand-600 hover:bg-sand-100'
                      }`}
                    >
                      {r}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide mb-2">Price (GHS)</p>
                <div className="space-y-1">
                  {[
                    { label: 'Under GHS 50', min: undefined, max: 50 },
                    { label: 'GHS 50 – 200', min: 50, max: 200 },
                    { label: 'GHS 200 – 500', min: 200, max: 500 },
                    { label: 'Over GHS 500', min: 500, max: undefined },
                  ].map(range => {
                    const isActive = minPrice === range.min && maxPrice === range.max
                    return (
                      <Link
                        key={range.label}
                        href={buildUrl({
                          min_price: range.min !== undefined ? String(range.min) : '',
                          max_price: range.max !== undefined ? String(range.max) : '',
                          page: '1',
                        })}
                        className={`block w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActive ? 'bg-green-600 text-white font-medium' : 'text-sand-600 hover:bg-sand-100'
                        }`}
                      >
                        {range.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main content ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Header row */}
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-display font-bold text-sand-900">
                  {category ? CATEGORY_META[category as ProductCategory]?.label : 'All products'}
                </h1>
                <p className="text-sm text-sand-400 mt-0.5">
                  {totalCount === 0
                    ? 'No products found'
                    : `Showing ${((page - 1) * LIMIT) + 1}–${Math.min(page * LIMIT, totalCount)} of ${totalCount} product${totalCount !== 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Mobile sort */}
              <div className="lg:hidden">
                <MobileSortSelect sort={sort} />
              </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {category && (
                  <Link
                    href={buildUrl({ category: '', page: '1' })}
                    className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    {CATEGORY_META[category as ProductCategory]?.emoji}{' '}
                    {CATEGORY_META[category as ProductCategory]?.label}
                    <span className="ml-0.5 opacity-60">×</span>
                  </Link>
                )}
                {region && (
                  <Link
                    href={buildUrl({ region: '', page: '1' })}
                    className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    📍 {region}
                    <span className="ml-0.5 opacity-60">×</span>
                  </Link>
                )}
                {(minPrice !== undefined || maxPrice !== undefined) && (
                  <Link
                    href={buildUrl({ min_price: '', max_price: '', page: '1' })}
                    className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    GHS {minPrice ?? 0} – {maxPrice ?? '∞'}
                    <span className="ml-0.5 opacity-60">×</span>
                  </Link>
                )}
                {search && (
                  <Link
                    href={buildUrl({ search: '', page: '1' })}
                    className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    <Search className="w-3 h-3" />
                    &ldquo;{search}&rdquo;
                    <span className="ml-0.5 opacity-60">×</span>
                  </Link>
                )}
              </div>
            )}

            {/* Product grid */}
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid
                category={category}
                valueTags={valueTags}
                search={search}
                sort={sort}
                limit={LIMIT}
                region={region}
                minPrice={minPrice}
                maxPrice={maxPrice}
              />
            </Suspense>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                {page > 1 ? (
                  <Link
                    href={buildUrl({ page: String(page - 1) })}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-sand-200 text-sm font-medium text-sand-700 hover:bg-sand-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-sand-100 text-sm font-medium text-sand-300 cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </span>
                )}

                <span className="text-sm text-sand-500">
                  Page {page} of {totalPages}
                </span>

                {page < totalPages ? (
                  <Link
                    href={buildUrl({ page: String(page + 1) })}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-sand-200 text-sm font-medium text-sand-700 hover:bg-sand-100 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-sand-100 text-sm font-medium text-sand-300 cursor-not-allowed">
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
