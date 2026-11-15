import { createClient } from '@/lib/supabase/server'
import { Product, ProductCategory } from '@/types'
import { searchProductIds } from '@/lib/search/index'
import Link from 'next/link'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  limit?: number
  /** 1-based; pages are `limit` products long */
  page?: number
  category?: ProductCategory
  valueTags?: string[]
  search?: string
  sort?: string
  region?: string
  minPrice?: number
  maxPrice?: number
}

async function fetchProducts({
  limit = 20,
  page = 1,
  category,
  valueTags,
  search,
  sort,
  region,
  minPrice,
  maxPrice,
}: ProductGridProps): Promise<Product[]> {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select(
      `
      *,
      vendor:vendor_profiles (
        id,
        business_name,
        slug,
        location,
        region,
        logo_url,
        rating,
        review_count,
        status
      )
    `
    )
    .eq('status', 'approved')

  // Category filter
  if (category) {
    query = query.eq('category', category)
  }

  // Value tags filter, product must contain ALL selected tags
  if (valueTags && valueTags.length > 0) {
    query = query.contains('value_tags', valueTags)
  }

  // The same ranking as the instant search window, so both find the same things
  const matchedIds = await searchProductIds(search)
  if (matchedIds) {
    if (matchedIds.length === 0) return []
    query = query.in('id', matchedIds)
  }

  // Region + price range
  if (region) query = query.eq('region', region)
  if (typeof minPrice === 'number') query = query.gte('price_ghs', minPrice)
  if (typeof maxPrice === 'number') query = query.lte('price_ghs', maxPrice)

  // Sorting. A search is ordered by how well each product matches, below.
  switch (sort ?? (matchedIds ? 'relevance' : 'newest')) {
    case 'relevance':
      break
    case 'price_asc':
      query = query.order('price_ghs', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price_ghs', { ascending: false })
      break
    case 'popular':
      query = query.order('order_count', { ascending: false })
      break
    case 'oldest':
      query = query.order('created_at', { ascending: true })
      break
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  // A search is ranked here rather than by the database, so take every match
  // and cut the page out afterwards
  const byRelevance = !!matchedIds && (!sort || sort === 'relevance')
  const from = (page - 1) * limit
  if (!byRelevance) query = query.range(from, from + limit - 1)

  const { data, error } = await query

  if (error) {
    console.error('[ProductGrid] Supabase error:', error.message)
    return []
  }

  const products = (data as Product[]) || []
  if (byRelevance && matchedIds) {
    const rank = new Map(matchedIds.map((id, i) => [id, i]))
    products.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
    return products.slice(from, from + limit)
  }
  return products
}

export async function ProductGrid(props: ProductGridProps) {
  // The sample shops are ordinary database rows (is_demo), shown alongside any
  // real products until an admin hides them from the dashboard
  const products = await fetchProducts(props)

  if (products.length === 0) {
    return (
      <div className="panel px-6 py-12">
        <h3 className="text-lg text-sand-900">
          {props.search ? `Nothing matches "${props.search}"` : 'Nothing matches these filters'}
        </h3>
        <p className="mt-1 text-sm text-sand-700 max-w-md">
          {props.search
            ? 'Check the spelling or try one word, like "honey" or "soap".'
            : 'Try removing a filter.'}
        </p>
        <Link href="/marketplace" className="btn btn-secondary btn-sm mt-5">See all products</Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < 4} />
      ))}
    </div>
  )
}
