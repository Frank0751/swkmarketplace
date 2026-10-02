import { Leaf } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Product, ProductCategory } from '@/types'
import { productSearchFilter } from '@/lib/marketplace/search'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  limit?: number
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
  category,
  valueTags,
  search,
  sort = 'newest',
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

  // Title, summary and description
  const searchFilter = productSearchFilter(search)
  if (searchFilter) {
    query = query.or(searchFilter)
  }

  // Region + price range
  if (region) query = query.eq('region', region)
  if (typeof minPrice === 'number') query = query.gte('price_ghs', minPrice)
  if (typeof maxPrice === 'number') query = query.lte('price_ghs', maxPrice)

  // Sorting
  switch (sort) {
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

  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    console.error('[ProductGrid] Supabase error:', error.message)
    return []
  }

  return (data as Product[]) || []
}

export async function ProductGrid(props: ProductGridProps) {
  // The sample shops are ordinary database rows (is_demo), shown alongside any
  // real products until an admin hides them from the dashboard
  const products = await fetchProducts(props)

  if (products.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <Leaf className="w-8 h-8 text-green-300" />
        </div>
        <h3 className="text-lg font-semibold text-sand-800 mb-2">
          No products found yet
        </h3>
        <p className="text-sm text-sand-600 max-w-xs">
          {props.search
            ? `We couldn't find any products matching "${props.search}". Try a different search term or browse by category.`
            : 'No products match your current filters. Try adjusting or clearing your filters.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
