import { unstable_cache } from 'next/cache'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { CATEGORY_META, type ProductCategory } from '@/types'
import { toSearchProduct, type SearchIndex, type SearchProduct, type SearchShop } from '@/lib/search/rank'

// The catalogue as the search box needs it: every live product and shop, a few
// fields each. Read with the public key and no cookies (only what any visitor
// may see), so one copy can be shared by everyone for five minutes, or until
// the catalogue changes (revalidateCatalogue).

/** Enough for instant search in the browser; past this, search moves to the database */
const MAX_PRODUCTS = 1000

type ProductRow = {
  id: string
  slug: string
  title: string
  price_ghs: number
  unit: string | null
  images: string[] | null
  category: ProductCategory
  location: string | null
  value_tags: string[] | null
  short_description: string | null
  stock_quantity: number
  is_demo: boolean | null
  vendor: { id: string; business_name: string; slug: string | null } | null
}

type ShopRow = {
  id: string
  slug: string | null
  business_name: string
  location: string
  region: string
  category: ProductCategory
  logo_url: string | null
  business_description: string | null
  is_demo: boolean | null
}

async function buildIndex(): Promise<SearchIndex> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const categories = (Object.keys(CATEGORY_META) as ProductCategory[]).map(k => ({
    key: k,
    label: CATEGORY_META[k].label,
  }))
  if (!url || !key) return { products: [], shops: [], categories }

  const supabase = createPublicClient(url, key, { auth: { persistSession: false } })

  const [productsRes, shopsRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, slug, title, price_ghs, unit, images, category, location, value_tags, short_description, stock_quantity, is_demo, vendor:vendor_profiles(id, business_name, slug)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(MAX_PRODUCTS),
    supabase
      .from('vendor_profiles')
      .select('id, slug, business_name, location, region, category, logo_url, business_description, is_demo')
      .eq('status', 'approved')
      .order('business_name'),
  ])

  const productRows = (productsRes.data ?? []) as unknown as ProductRow[]
  const shopRows = (shopsRes.data ?? []) as unknown as ShopRow[]

  const countByShop = new Map<string, number>()
  for (const row of productRows) {
    if (row.vendor) countByShop.set(row.vendor.id, (countByShop.get(row.vendor.id) ?? 0) + 1)
  }

  const products: SearchProduct[] = productRows
    .filter(row => row.vendor)
    .map(row => toSearchProduct(row, row.vendor!))

  const shops: SearchShop[] = shopRows.map(row => ({
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.business_name,
    location: row.location,
    region: row.region,
    category: CATEGORY_META[row.category]?.label ?? '',
    logo: row.logo_url,
    blurb: row.business_description ?? '',
    product_count: countByShop.get(row.id) ?? 0,
    is_demo: !!row.is_demo,
  }))

  return { products, shops, categories }
}

/** The search index, rebuilt every five minutes or when the catalogue changes */
export const loadSearchIndex = unstable_cache(buildIndex, ['search-index-v1'], {
  revalidate: 300,
  tags: ['catalogue'],
})
