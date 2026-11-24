import { searchCatalogue, toSearchProduct } from '@/lib/search/rank'
import type { MarketplaceFilters, SortKey } from '@/lib/marketplace/filters'
import type { CatalogueProduct } from '@/types'

// /marketplace filters, sorts, searches and pages the cached catalogue in the
// browser, so the page itself can be cached: every filtered, sorted or paged
// address a crawler invents is the same cached page, not a fresh render. These
// are the rules the database query used to apply.

export const PAGE_SIZE = 24

export interface BrowseResult {
  /** This page of results */
  products: CatalogueProduct[]
  /** How many match, across all pages */
  total: number
  totalPages: number
  /** The page shown: the one asked for, kept within range */
  page: number
}

const price = (p: CatalogueProduct) => Number(p.price_ghs)
const time = (p: CatalogueProduct) => Date.parse(p.created_at) || 0

function matches(p: CatalogueProduct, f: MarketplaceFilters): boolean {
  if (f.category && p.category !== f.category) return false
  // A product must have every value ticked
  if (f.values.length && !f.values.every(v => p.value_tags?.includes(v))) return false
  if (f.region && p.region !== f.region) return false
  if (f.minPrice !== undefined && price(p) < f.minPrice) return false
  if (f.maxPrice !== undefined && price(p) > f.maxPrice) return false
  return true
}

/** The sort in force: best match for a search, newest otherwise */
export function effectiveSort(filters: MarketplaceFilters): SortKey {
  return filters.sort ?? (filters.search ? 'relevance' : 'newest')
}

export function browseCatalogue(
  catalogue: CatalogueProduct[],
  filters: MarketplaceFilters,
  pageSize = PAGE_SIZE,
): BrowseResult {
  let list = catalogue.filter(p => matches(p, filters))

  // The same ranking as the search window, which only knows listings whose
  // shop it can show
  let rank: Map<string, number> | null = null
  if (filters.search) {
    const searchable = list.filter(p => p.vendor).map(p => toSearchProduct(p, p.vendor!))
    const found = searchCatalogue({ products: searchable, shops: [], categories: [] }, filters.search).products
    rank = new Map(found.map((p, i) => [p.id, i]))
    list = list.filter(p => rank!.has(p.id))
  }

  // Ties go newest first
  const newest = (a: CatalogueProduct, b: CatalogueProduct) => time(b) - time(a)
  const sort = effectiveSort(filters)
  if (sort === 'relevance' && rank) list.sort((a, b) => rank!.get(a.id)! - rank!.get(b.id)!)
  else if (sort === 'price_asc') list.sort((a, b) => price(a) - price(b) || newest(a, b))
  else if (sort === 'price_desc') list.sort((a, b) => price(b) - price(a) || newest(a, b))
  else if (sort === 'popular') list.sort((a, b) => (b.order_count ?? 0) - (a.order_count ?? 0) || newest(a, b))
  else list.sort(newest)

  const total = list.length
  const totalPages = Math.ceil(total / pageSize)
  const page = Math.min(Math.max(1, filters.page), Math.max(1, totalPages))

  return {
    products: list.slice((page - 1) * pageSize, page * pageSize),
    total,
    totalPages,
    page,
  }
}
