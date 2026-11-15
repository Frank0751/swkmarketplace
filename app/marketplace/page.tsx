import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SampleNotice } from '@/components/layout/SampleNotice'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { CategoryStrip } from '@/components/marketplace/CategoryStrip'
import { ProductGrid } from '@/components/marketplace/ProductGrid'
import { ProductGridSkeleton } from '@/components/marketplace/ProductGridSkeleton'
import { FilterSheet } from '@/components/marketplace/FilterSheet'
import { searchProductIds } from '@/lib/search/index'
import {
  PRICE_RANGES,
  SORT_OPTIONS,
  marketplaceUrl,
  parseMarketplaceFilters,
  type MarketplaceFilters,
} from '@/lib/marketplace/filters'
import { cn } from '@/lib/utils'
import { CATEGORY_META, GHANA_REGIONS, VALUE_TAG_META, type ValueTag } from '@/types'

export const metadata: Metadata = {
  title: 'All products',
  description:
    'Honey, produce, crafts and upcycled goods from youth-led green businesses in Ghana, each checked against SDG 12.',
  openGraph: {
    title: 'All products | SWK Marketplace',
    description: 'Honey, produce, crafts and upcycled goods from youth-led green businesses in Ghana.',
    url: 'https://marketplace.swkghana.org/marketplace',
    siteName: 'SWK Marketplace',
  },
}

const LIMIT = 24

async function fetchProductCount(filters: MarketplaceFilters): Promise<number> {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.region) query = query.eq('region', filters.region)
  if (filters.values.length > 0) query = query.contains('value_tags', filters.values)
  if (filters.minPrice !== undefined) query = query.gte('price_ghs', filters.minPrice)
  if (filters.maxPrice !== undefined) query = query.lte('price_ghs', filters.maxPrice)

  const matchedIds = await searchProductIds(filters.search)
  if (matchedIds) {
    if (matchedIds.length === 0) return 0
    query = query.in('id', matchedIds)
  }

  const { count } = await query
  return count || 0
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'block w-full px-3 py-2 text-sm rounded-lg transition-colors',
        active ? 'bg-green-50 text-green-800 font-bold' : 'text-sand-700 hover:bg-sand-100',
      )}
    >
      {children}
    </Link>
  )
}

function Chip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 min-h-[36px] pl-3 pr-2 rounded-full bg-white border border-sand-300 text-xs font-medium text-sand-800 hover:border-sand-900 transition-colors"
    >
      {label}
      <X className="w-3.5 h-3.5 text-sand-600" aria-hidden="true" />
      <span className="sr-only">(remove filter)</span>
    </Link>
  )
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const filters = parseMarketplaceFilters(searchParams)
  const { category, values, search, region, minPrice, maxPrice, page } = filters
  const sort = filters.sort ?? (search ? 'relevance' : 'newest')
  const url = (overrides: Partial<MarketplaceFilters>) => marketplaceUrl({ ...filters, page: 1, ...overrides })

  const totalCount = await fetchProductCount(filters)
  const totalPages = Math.ceil(totalCount / LIMIT)
  const hasPrice = minPrice !== undefined || maxPrice !== undefined
  const hasActiveFilters = !!(category || values.length || search || region || hasPrice)
  const sortOptions = SORT_OPTIONS.filter(o => o.value !== 'relevance' || !!search)

  const title = search
    ? `Results for “${search}”`
    : category ? CATEGORY_META[category].label : 'All products'

  return (
    <>
      <SampleNotice />
      <Navbar />
      <CategoryStrip />

      <main id="main" className="container-app py-6 md:py-8 pb-24 md:pb-12">
        <div className="flex gap-8">

          {/* ── Desktop filters ─────────────────────────────────────── */}
          <aside className="hidden lg:block w-56 flex-shrink-0" aria-label="Filters">
            <div className="sticky top-40 space-y-6 max-h-[calc(100vh-11rem)] overflow-y-auto pr-1">
              <div>
                <h2 className="title-card mb-2">Sort by</h2>
                <div className="space-y-0.5">
                  {sortOptions.map(opt => (
                    <FilterLink key={opt.value} href={url({ sort: opt.value })} active={sort === opt.value}>
                      {opt.label}
                    </FilterLink>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="title-card mb-2">Price</h2>
                <div className="space-y-0.5">
                  {PRICE_RANGES.map(range => {
                    const active = minPrice === range.min && maxPrice === range.max
                    return (
                      <FilterLink
                        key={range.label}
                        href={url(active ? { minPrice: undefined, maxPrice: undefined } : { minPrice: range.min, maxPrice: range.max })}
                        active={active}
                      >
                        {range.label}
                      </FilterLink>
                    )
                  })}
                </div>
              </div>

              <div>
                <h2 className="title-card mb-2">Made this way</h2>
                <div className="space-y-0.5">
                  {(Object.keys(VALUE_TAG_META) as ValueTag[]).map(tag => {
                    const active = values.includes(tag)
                    return (
                      <FilterLink
                        key={tag}
                        href={url({ values: active ? values.filter(v => v !== tag) : [...values, tag] })}
                        active={active}
                      >
                        {VALUE_TAG_META[tag].label}
                      </FilterLink>
                    )
                  })}
                </div>
              </div>

              <div>
                <h2 className="title-card mb-2">Region</h2>
                <div className="space-y-0.5">
                  <FilterLink href={url({ region: undefined })} active={!region}>All regions</FilterLink>
                  {GHANA_REGIONS.map(r => (
                    <FilterLink key={r} href={url({ region: r })} active={region === r}>{r}</FilterLink>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ── Products ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
              <div>
                <h1 className="title-page">{title}</h1>
                <p className="text-sm text-sand-600 mt-1.5" role="status">
                  {totalCount === 0
                    ? 'No products'
                    : totalPages > 1
                      ? `${(page - 1) * LIMIT + 1} to ${Math.min(page * LIMIT, totalCount)} of ${totalCount} products`
                      : `${totalCount} ${totalCount === 1 ? 'product' : 'products'}`}
                </p>
              </div>
              <div className="lg:hidden">
                <FilterSheet filters={filters} />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {search && <Chip href={url({ search: '', sort: undefined })} label={`“${search}”`} />}
                {category && <Chip href={url({ category: undefined })} label={CATEGORY_META[category].label} />}
                {values.map(tag => (
                  <Chip key={tag} href={url({ values: values.filter(v => v !== tag) })} label={VALUE_TAG_META[tag].label} />
                ))}
                {region && <Chip href={url({ region: undefined })} label={region} />}
                {hasPrice && (
                  <Chip
                    href={url({ minPrice: undefined, maxPrice: undefined })}
                    label={PRICE_RANGES.find(r => r.min === minPrice && r.max === maxPrice)?.label ?? 'Price'}
                  />
                )}
                <Link href="/marketplace" className="link text-xs ml-1 inline-flex items-center min-h-[36px]">Clear all</Link>
              </div>
            )}

            <Suspense key={marketplaceUrl(filters)} fallback={<ProductGridSkeleton count={12} />}>
              <ProductGrid
                category={category}
                valueTags={values}
                search={search}
                sort={filters.sort}
                limit={LIMIT}
                page={page}
                region={region}
                minPrice={minPrice}
                maxPrice={maxPrice}
              />
            </Suspense>

            {totalPages > 1 && (
              <nav aria-label="Pages" className="flex items-center justify-center gap-3 mt-10">
                {page > 1 ? (
                  <Link href={marketplaceUrl({ ...filters, page: page - 1 })} className="btn btn-secondary btn-sm">
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    Previous
                  </Link>
                ) : (
                  <span className="btn btn-sm text-sand-400 border border-sand-200" aria-disabled="true">
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    Previous
                  </span>
                )}
                <span className="text-sm text-sand-700">Page {page} of {totalPages}</span>
                {page < totalPages ? (
                  <Link href={marketplaceUrl({ ...filters, page: page + 1 })} className="btn btn-secondary btn-sm">
                    Next
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="btn btn-sm text-sand-400 border border-sand-200" aria-disabled="true">
                    Next
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                )}
              </nav>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
