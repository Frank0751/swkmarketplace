import { describe, expect, it } from 'vitest'
import {
  editDistance,
  queryTokens,
  searchCatalogue,
  stem,
  wordMatch,
  type SearchIndex,
  type SearchProduct,
  type SearchShop,
} from '@/lib/search/rank'

function product(over: Partial<SearchProduct> & { title: string }): SearchProduct {
  return {
    id: over.title,
    slug: over.title.toLowerCase().replace(/\W+/g, '-'),
    price: 10,
    unit: null,
    image: null,
    category: 'Organic Produce',
    category_key: 'organic_produce',
    vendor_name: 'Adom Organics',
    vendor_slug: 'adom-organics',
    location: 'Aburi',
    tags: [],
    blurb: '',
    in_stock: true,
    is_demo: true,
    ...over,
  }
}

function shop(name: string, over: Partial<SearchShop> = {}): SearchShop {
  return {
    id: name, slug: name, name, location: 'Accra', region: 'Greater Accra',
    category: 'Handmade Crafts', logo: null, blurb: '', product_count: 1, is_demo: true, ...over,
  }
}

const index: SearchIndex = {
  products: [
    product({ title: 'Raw Forest Honey (500ml)', vendor_name: 'GreenHarvest Farms', category: 'Agribusiness', location: 'Kumasi', blurb: 'Unfiltered honey from agroforestry hives.' }),
    product({ title: 'Vine-Ripened Tomatoes (1kg)', tags: ['Organic', 'Locally Sourced'] }),
    product({ title: 'Zero-Waste Soap Bars (4 pack)', vendor_name: 'EcoCycle Ghana', category: 'Recycled & Upcycled', location: 'Tema' }),
    product({ title: 'Soy Wax Candle, Shea & Lemongrass', vendor_name: 'Sankofa Crafts Collective', category: 'Handmade Crafts', location: 'Accra' }),
    product({ title: 'Cold-Pressed Baobab Oil (100ml)', blurb: 'Pressed from wild baobab seed, good for skin and hair.' }),
    product({ title: 'Honeycomb Candle', in_stock: false, vendor_name: 'Sankofa Crafts Collective', category: 'Handmade Crafts' }),
  ],
  shops: [
    shop('GreenHarvest Farms', { location: 'Kumasi', region: 'Ashanti', category: 'Agribusiness' }),
    shop('Sankofa Crafts Collective'),
  ],
  categories: [
    { key: 'organic_produce', label: 'Organic Produce' },
    { key: 'handmade_crafts', label: 'Handmade Crafts' },
  ],
}

const titles = (q: string) => searchCatalogue(index, q).products.map(p => p.title)

describe('instant search', () => {
  it('finds a product by a word in its title, best match first', () => {
    expect(titles('honey')[0]).toBe('Raw Forest Honey (500ml)')
  })

  it('forgives a slipped key', () => {
    expect(titles('hony')).toContain('Raw Forest Honey (500ml)')
    expect(titles('candel')).toContain('Soy Wax Candle, Shea & Lemongrass')
  })

  it('treats singular and plural alike', () => {
    expect(titles('tomato')).toEqual(['Vine-Ripened Tomatoes (1kg)'])
    expect(titles('tomatos')).toEqual(['Vine-Ripened Tomatoes (1kg)'])
    expect(titles('soaps')).toEqual(['Zero-Waste Soap Bars (4 pack)'])
  })

  it('matches as you type', () => {
    expect(titles('ho')).toContain('Raw Forest Honey (500ml)')
    expect(titles('bao')).toEqual(['Cold-Pressed Baobab Oil (100ml)'])
  })

  it('needs every typed word to match something', () => {
    expect(titles('honey soap')).toEqual([])
    expect(titles('soap bars')).toEqual(['Zero-Waste Soap Bars (4 pack)'])
  })

  it('searches the shop name, town, tags and description too', () => {
    expect(titles('ecocycle')).toEqual(['Zero-Waste Soap Bars (4 pack)'])
    expect(titles('kumasi')).toEqual(['Raw Forest Honey (500ml)'])
    expect(titles('locally sourced')).toEqual(['Vine-Ripened Tomatoes (1kg)'])
    expect(titles('skin')).toEqual(['Cold-Pressed Baobab Oil (100ml)'])
  })

  it('puts a title match above a description match, and in stock above sold out', () => {
    const results = titles('honey')
    expect(results.indexOf('Raw Forest Honey (500ml)')).toBeLessThan(results.indexOf('Honeycomb Candle'))
  })

  it('ignores filler words, accents and punctuation', () => {
    expect(queryTokens('a box of soap')).toEqual(['box', 'soap'])
    expect(titles('shea & lemongrass')).toEqual(['Soy Wax Candle, Shea & Lemongrass'])
    expect(titles('  HONEY!! ')).toContain('Raw Forest Honey (500ml)')
  })

  it('finds shops and categories', () => {
    const results = searchCatalogue(index, 'sankofa')
    expect(results.shops.map(s => s.name)).toEqual(['Sankofa Crafts Collective'])
    expect(searchCatalogue(index, 'crafts').categories.map(c => c.key)).toEqual(['handmade_crafts'])
    expect(searchCatalogue(index, 'ashanti').shops.map(s => s.name)).toEqual(['GreenHarvest Farms'])
  })

  it('finds nothing for an empty or unrelated search', () => {
    expect(searchCatalogue(index, '   ')).toEqual({ products: [], shops: [], categories: [] })
    expect(titles('laptop')).toEqual([])
  })

  it('does not match short words loosely', () => {
    expect(wordMatch('oil', 'soil')).toBe(0.6)
    expect(wordMatch('tea', 'pea')).toBe(0)
  })
})

describe('word helpers', () => {
  it('stems plurals', () => {
    expect(stem('tomatoes')).toBe('tomato')
    expect(stem('boxes')).toBe('box')
    expect(stem('soaps')).toBe('soap')
    expect(stem('berries')).toBe('berry')
    expect(stem('glass')).toBe('glass')
  })

  it('counts edits, including two swapped letters', () => {
    expect(editDistance('honey', 'hony', 2)).toBe(1)
    expect(editDistance('candle', 'candel', 2)).toBe(1)
    expect(editDistance('honey', 'money', 2)).toBe(1)
    expect(editDistance('honey', 'tomato', 2)).toBe(3)
  })
})
