import { describe, expect, it } from 'vitest'
import { browseCatalogue, PAGE_SIZE } from '@/lib/marketplace/browse'
import { marketplaceUrl, parseMarketplaceFilters } from '@/lib/marketplace/filters'
import { searchCatalogue, toSearchProduct } from '@/lib/search/rank'
import robots from '@/app/robots'
import { config as middlewareConfig } from '@/middleware'
import nextConfig from '../next.config.mjs'
import type { CatalogueProduct } from '@/types'

function listing(over: Partial<CatalogueProduct> & { title: string }): CatalogueProduct {
  return {
    id: over.title,
    vendor_id: 'v1',
    slug: over.title.toLowerCase().replace(/\W+/g, '-'),
    short_description: '',
    price_ghs: 50,
    unit: 'each',
    images: [],
    location: 'Accra',
    stock_quantity: 10,
    minimum_order: 1,
    is_demo: false,
    category: 'organic_produce',
    value_tags: [],
    region: 'Greater Accra',
    order_count: 0,
    created_at: '2026-11-01T00:00:00Z',
    vendor: { id: 'v1', business_name: 'Adom Organics', slug: 'adom-organics' },
    ...over,
  }
}

/** What the browser does with an address on /marketplace */
const browse = (catalogue: CatalogueProduct[], query = '') =>
  browseCatalogue(catalogue, parseMarketplaceFilters(Object.fromEntries(new URLSearchParams(query))))

const titles = (r: { products: CatalogueProduct[] }) => r.products.map(p => p.title)

describe('browsing the catalogue in the browser', () => {
  const thirty = Array.from({ length: 30 }, (_, i) =>
    listing({ title: `Item ${i + 1}`, created_at: new Date(Date.UTC(2026, 10, i + 1)).toISOString() }))

  it('shows the newest first, a page at a time', () => {
    const first = browse(thirty)
    expect(first.total).toBe(30)
    expect(first.totalPages).toBe(2)
    expect(first.products).toHaveLength(PAGE_SIZE)
    expect(first.products[0].title).toBe('Item 30')

    const second = browse(thirty, 'page=2')
    expect(second.page).toBe(2)
    expect(titles(second)).toEqual(['Item 6', 'Item 5', 'Item 4', 'Item 3', 'Item 2', 'Item 1'])
  })

  it('keeps an invented page number in range', () => {
    expect(browse(thirty, 'page=99').page).toBe(2)
    expect(browse(thirty, 'page=-3').page).toBe(1)
    expect(browse([], 'page=4')).toMatchObject({ page: 1, total: 0, totalPages: 0, products: [] })
  })

  const mixed = [
    listing({ title: 'Raw Forest Honey', category: 'agribusiness', price_ghs: 65, region: 'Ashanti', value_tags: ['organic', 'locally_sourced'] }),
    listing({ title: 'Kente Tote', category: 'handmade_crafts', price_ghs: 200, value_tags: ['handmade', 'upcycled'] }),
    listing({ title: 'Shea Soap', category: 'handmade_crafts', price_ghs: 50, value_tags: ['handmade'] }),
    listing({ title: 'Glass Lamp', category: 'recycled_upcycled', price_ghs: 520, region: 'Volta', value_tags: ['upcycled'] }),
  ]

  it('filters by category, region and price, bounds included', () => {
    expect(titles(browse(mixed, 'category=handmade_crafts')).sort()).toEqual(['Kente Tote', 'Shea Soap'])
    expect(titles(browse(mixed, 'region=Volta'))).toEqual(['Glass Lamp'])
    expect(titles(browse(mixed, 'min_price=50&max_price=200')).sort()).toEqual(['Kente Tote', 'Raw Forest Honey', 'Shea Soap'])
  })

  it('needs every ticked value, not any of them', () => {
    expect(titles(browse(mixed, 'values=handmade')).sort()).toEqual(['Kente Tote', 'Shea Soap'])
    expect(titles(browse(mixed, 'values=handmade,upcycled'))).toEqual(['Kente Tote'])
  })

  it('sorts by price and by most ordered, ties staying newest first', () => {
    expect(titles(browse(mixed, 'sort=price_asc'))).toEqual(['Shea Soap', 'Raw Forest Honey', 'Kente Tote', 'Glass Lamp'])
    expect(titles(browse(mixed, 'sort=price_desc'))[0]).toBe('Glass Lamp')

    const ordered = [
      listing({ title: 'Older', order_count: 3, created_at: '2026-10-01T00:00:00Z' }),
      listing({ title: 'Popular', order_count: 9 }),
      listing({ title: 'Newer', order_count: 3, created_at: '2026-11-20T00:00:00Z' }),
    ]
    expect(titles(browse(ordered, 'sort=popular'))).toEqual(['Popular', 'Newer', 'Older'])
  })

  it('finds what the search window finds, in the same order, typos and all', () => {
    const catalogue = [
      listing({ title: 'Honey Soap', category: 'handmade_crafts' }),
      listing({ title: 'Raw Forest Honey', category: 'agribusiness' }),
      listing({ title: 'Kente Tote', category: 'handmade_crafts' }),
    ]
    const window = searchCatalogue(
      { products: catalogue.map(p => toSearchProduct(p, p.vendor!)), shops: [], categories: [] },
      'hony',
    ).products.map(p => p.title)

    expect(window.length).toBeGreaterThan(0)
    expect(titles(browse(catalogue, 'search=hony'))).toEqual(window)
    expect(titles(browse(catalogue, 'search=hony&category=agribusiness'))).toEqual(['Raw Forest Honey'])
  })

  it('lists a product whose shop it cannot show, but search skips it, like the search window', () => {
    const catalogue = [listing({ title: 'Honey', vendor: null })]
    expect(titles(browse(catalogue))).toEqual(['Honey'])
    expect(browse(catalogue, 'search=honey').total).toBe(0)
  })

  it('reads back the addresses its own links write', () => {
    const filters = parseMarketplaceFilters({ category: 'handmade_crafts', values: 'handmade,upcycled', sort: 'price_asc', page: '2' })
    const query = marketplaceUrl(filters).split('?')[1]
    expect(parseMarketplaceFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters)
  })
})

/** How crawlers read a robots.txt rule: a prefix, with * matching anything */
function blockedBy(rules: string[], path: string) {
  return rules.some(rule => {
    const pattern = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    return new RegExp(`^${pattern}`).test(path)
  })
}

describe('what crawlers are told', () => {
  const rules = robots().rules
  const disallow = (Array.isArray(rules) ? rules[0] : rules).disallow as string[]

  it('keeps the storefront, shops, product pages and how it works crawlable', () => {
    for (const path of ['/', '/marketplace', '/marketplace/raw-forest-honey', '/shops', '/store/adom-organics', '/how-it-works']) {
      expect(blockedBy(disallow, path), path).toBe(false)
    }
  })

  it('asks them to skip filtered copies, sign-in and everything behind it', () => {
    for (const path of [
      '/marketplace?category=handmade_crafts',
      '/marketplace?values=organic&sort=price_asc&page=3',
      '/shops?page=2',
      '/store/adom-organics?sort=newest',
      '/login', '/login?redirect=/checkout', '/signup',
      '/api/search/index', '/checkout', '/cart', '/buyer/orders', '/admin/dashboard', '/vendor/dashboard',
    ]) {
      expect(blockedBy(disallow, path), path).toBe(true)
    }
  })

  it('marks filtered copies noindex with a header, never the plain pages', async () => {
    const headers = await nextConfig.headers!()
    const noindex = headers.filter(h => h.headers.some(x => x.key === 'X-Robots-Tag'))

    for (const key of ['search', 'category', 'values', 'region', 'min_price', 'max_price', 'sort', 'page']) {
      expect(noindex.some(h => h.source === '/marketplace' && h.has?.some(c => c.type === 'query' && c.key === key)), key).toBe(true)
    }
    // Every noindex rule needs a query string to apply
    expect(noindex.every(h => h.has?.length)).toBe(true)
  })

  it('runs middleware only where a signed-in user is needed', () => {
    const signedInAreas = ['/admin', '/buyer', '/checkout', '/vendor/dashboard', '/vendor/listings', '/vendor/store', '/vendor/orders', '/vendor/payouts']
    expect(middlewareConfig.matcher.every(m => signedInAreas.some(area => m === `${area}/:path*`))).toBe(true)
    expect(middlewareConfig.matcher).toHaveLength(signedInAreas.length)
  })
})
