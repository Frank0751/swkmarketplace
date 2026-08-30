import { describe, it, expect } from 'vitest'
import {
  DEMO_PRODUCTS,
  DEMO_VENDORS,
  getDemoProducts,
  getDemoProductBySlug,
  getDemoVendor,
  isDemoId,
} from '@/lib/demo/data'

describe('demo dataset integrity', () => {
  it('every product belongs to an existing demo vendor', () => {
    const vendorIds = new Set(DEMO_VENDORS.map(v => v.id))
    for (const product of DEMO_PRODUCTS) {
      expect(vendorIds.has(product.vendor_id), `${product.title} vendor`).toBe(true)
    }
  })

  it('every product and vendor id is demo-prefixed so the UI can badge them', () => {
    for (const p of DEMO_PRODUCTS) expect(isDemoId(p.id)).toBe(true)
    for (const v of DEMO_VENDORS) expect(isDemoId(v.id)).toBe(true)
  })

  it('product slugs are unique', () => {
    const slugs = DEMO_PRODUCTS.map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('all demo products are approved and in stock', () => {
    for (const p of DEMO_PRODUCTS) {
      expect(p.status).toBe('approved')
      expect(p.stock_quantity).toBeGreaterThan(0)
      expect(p.price_ghs).toBeGreaterThan(0)
    }
  })
})

describe('getDemoProducts filtering', () => {
  it('filters by category', () => {
    const crafts = getDemoProducts({ category: 'handmade_crafts' })
    expect(crafts.length).toBeGreaterThan(0)
    for (const p of crafts) expect(p.category).toBe('handmade_crafts')
  })

  it('filters by vendor', () => {
    const own = getDemoProducts({ vendorId: 'demo-v-greenharvest' })
    expect(own.length).toBeGreaterThan(0)
    for (const p of own) expect(p.vendor_id).toBe('demo-v-greenharvest')
  })

  it('filters by search term across title and description', () => {
    const hits = getDemoProducts({ search: 'honey' })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some(p => p.slug === 'demo-raw-forest-honey')).toBe(true)
  })

  it('filters by price range', () => {
    const hits = getDemoProducts({ minPrice: 50, maxPrice: 100 })
    for (const p of hits) {
      expect(p.price_ghs).toBeGreaterThanOrEqual(50)
      expect(p.price_ghs).toBeLessThanOrEqual(100)
    }
  })

  it('requires ALL selected value tags', () => {
    const hits = getDemoProducts({ valueTags: ['organic', 'plastic_free'] })
    for (const p of hits) {
      expect(p.value_tags).toContain('organic')
      expect(p.value_tags).toContain('plastic_free')
    }
  })

  it('sorts by price ascending', () => {
    const hits = getDemoProducts({ sort: 'price_asc' })
    const prices = hits.map(p => p.price_ghs)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('respects the limit', () => {
    expect(getDemoProducts({ limit: 3 })).toHaveLength(3)
  })
})

describe('lookups', () => {
  it('finds a product by slug', () => {
    expect(getDemoProductBySlug('demo-raw-forest-honey')?.title).toContain('Honey')
  })

  it('finds a vendor by slug or id', () => {
    expect(getDemoVendor('greenharvest-farms')?.business_name).toBe('GreenHarvest Farms')
    expect(getDemoVendor('demo-v-greenharvest')?.business_name).toBe('GreenHarvest Farms')
  })

  it('returns undefined for unknown keys', () => {
    expect(getDemoProductBySlug('nope')).toBeUndefined()
    expect(getDemoVendor('nope')).toBeUndefined()
  })
})
