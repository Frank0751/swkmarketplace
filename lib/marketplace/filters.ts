import { CATEGORY_META, GHANA_REGIONS, VALUE_TAG_META, type ProductCategory, type ValueTag } from '@/types'

// The filters on /marketplace, read from and written to the address bar, so a
// filtered view can be shared, bookmarked and reached with the back button.

export type SortKey = 'relevance' | 'newest' | 'popular' | 'price_asc' | 'price_desc'

export interface MarketplaceFilters {
  category?: ProductCategory
  values: ValueTag[]
  search: string
  /** Undefined means the default: best match for a search, newest otherwise */
  sort?: SortKey
  region?: string
  minPrice?: number
  maxPrice?: number
  page: number
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'relevance',  label: 'Best match' },
  { value: 'newest',     label: 'Newest' },
  { value: 'popular',    label: 'Most ordered' },
  { value: 'price_asc',  label: 'Price, low to high' },
  { value: 'price_desc', label: 'Price, high to low' },
]

export const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: 'Under GHS 50', max: 50 },
  { label: 'GHS 50 to 200', min: 50, max: 200 },
  { label: 'GHS 200 to 500', min: 200, max: 500 },
  { label: 'Over GHS 500', min: 500 },
]

type Params = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

function price(v: string | undefined): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Reads the filters from the query string, ignoring anything it doesn't recognise */
export function parseMarketplaceFilters(params: Params): MarketplaceFilters {
  const category = first(params.category)
  const sort = first(params.sort)
  const region = first(params.region)
  const page = parseInt(first(params.page) ?? '1', 10)

  return {
    category: category && category in CATEGORY_META ? (category as ProductCategory) : undefined,
    values: (first(params.values) ?? '').split(',').filter((v): v is ValueTag => v in VALUE_TAG_META),
    search: (first(params.search) ?? '').trim().slice(0, 80),
    sort: SORT_OPTIONS.some(o => o.value === sort) ? (sort as SortKey) : undefined,
    region: region && (GHANA_REGIONS as string[]).includes(region) ? region : undefined,
    minPrice: price(first(params.min_price)),
    maxPrice: price(first(params.max_price)),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

/** The address for a set of filters */
export function marketplaceUrl(filters: MarketplaceFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.category) params.set('category', filters.category)
  if (filters.values.length) params.set('values', filters.values.join(','))
  if (filters.region) params.set('region', filters.region)
  if (filters.minPrice !== undefined) params.set('min_price', String(filters.minPrice))
  if (filters.maxPrice !== undefined) params.set('max_price', String(filters.maxPrice))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))
  const query = params.toString()
  return query ? `/marketplace?${query}` : '/marketplace'
}
