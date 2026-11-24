'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { ProductCard } from '@/components/marketplace/ProductCard'
import { FilterSheet } from '@/components/marketplace/FilterSheet'
import { browseCatalogue, effectiveSort, PAGE_SIZE, type BrowseResult } from '@/lib/marketplace/browse'
import {
  PRICE_RANGES,
  SORT_OPTIONS,
  marketplaceUrl,
  parseMarketplaceFilters,
  type MarketplaceFilters,
} from '@/lib/marketplace/filters'
import { cn } from '@/lib/utils'
import { CATEGORY_META, GHANA_REGIONS, VALUE_TAG_META, type CatalogueProduct, type ValueTag } from '@/types'

// Filter, sort and page links are nofollow, so crawlers don't wander through
// every combination (robots.txt and an X-Robots-Tag header say the same). They
// aren't prefetched either: each leads to this same page at another address.
const filterLinkProps = { rel: 'nofollow', prefetch: false } as const

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      {...filterLinkProps}
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
      {...filterLinkProps}
      className="inline-flex items-center gap-1.5 min-h-[36px] pl-3 pr-2 rounded-full bg-white border border-sand-300 text-xs font-medium text-sand-800 hover:border-sand-900 transition-colors"
    >
      {label}
      <X className="w-3.5 h-3.5 text-sand-600" aria-hidden="true" />
      <span className="sr-only">(remove filter)</span>
    </Link>
  )
}

/**
 * The marketplace for one set of filters. The server renders it unfiltered
 * (what search engines and visitors without JavaScript get); in the browser
 * MarketplaceBrowser renders it for the filters in the address bar.
 */
export function MarketplaceView({ filters, result }: { filters: MarketplaceFilters; result: BrowseResult }) {
  const { category, values, search, region, minPrice, maxPrice } = filters
  const { products, total, totalPages, page } = result
  const sort = effectiveSort(filters)
  const url = (overrides: Partial<MarketplaceFilters>) => marketplaceUrl({ ...filters, page: 1, ...overrides })

  const hasPrice = minPrice !== undefined || maxPrice !== undefined
  const hasActiveFilters = !!(category || values.length || search || region || hasPrice)
  const sortOptions = SORT_OPTIONS.filter(o => o.value !== 'relevance' || !!search)

  const title = search
    ? `Results for “${search}”`
    : category ? CATEGORY_META[category].label : 'All products'

  return (
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
              {total === 0
                ? 'No products'
                : totalPages > 1
                  ? `${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, total)} of ${total} products`
                  : `${total} ${total === 1 ? 'product' : 'products'}`}
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

        {products.length === 0 ? (
          <div className="panel px-6 py-12">
            <h3 className="text-lg text-sand-900">
              {search ? `Nothing matches "${search}"` : 'Nothing matches these filters'}
            </h3>
            <p className="mt-1 text-sm text-sand-700 max-w-md">
              {search
                ? 'Check the spelling or try one word, like "honey" or "soap".'
                : 'Try removing a filter.'}
            </p>
            <Link href="/marketplace" className="btn btn-secondary btn-sm mt-5">See all products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-center gap-3 mt-10">
            {page > 1 ? (
              <Link href={marketplaceUrl({ ...filters, page: page - 1 })} {...filterLinkProps} className="btn btn-secondary btn-sm">
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
              <Link href={marketplaceUrl({ ...filters, page: page + 1 })} {...filterLinkProps} className="btn btn-secondary btn-sm">
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
  )
}

/**
 * Applies the filters in the address bar to the catalogue, in the browser. It
 * reads the address with useSearchParams, so it must sit inside <Suspense>:
 * the server renders that boundary's fallback, MarketplaceView unfiltered.
 */
export function MarketplaceBrowser({ catalogue }: { catalogue: CatalogueProduct[] }) {
  const searchParams = useSearchParams()
  const filters = useMemo(
    () => parseMarketplaceFilters(Object.fromEntries(searchParams.entries())),
    [searchParams],
  )
  const result = useMemo(() => browseCatalogue(catalogue, filters), [catalogue, filters])
  return <MarketplaceView filters={filters} result={result} />
}
