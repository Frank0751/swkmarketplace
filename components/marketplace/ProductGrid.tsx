import { Leaf } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Product, ProductCategory } from '@/types'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  limit?: number
  category?: ProductCategory
  valueTags?: string[]
  search?: string
  sort?: string
}

async function fetchProducts({
  limit = 20,
  category,
  valueTags,
  search,
  sort = 'newest',
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

  // Value tags filter — product must contain ALL selected tags
  if (valueTags && valueTags.length > 0) {
    query = query.contains('value_tags', valueTags)
  }

  // Full-text / title search
  if (search && search.trim()) {
    query = query.ilike('title', `%${search.trim()}%`)
  }

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
        <p className="text-sm text-sand-400 max-w-xs">
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
