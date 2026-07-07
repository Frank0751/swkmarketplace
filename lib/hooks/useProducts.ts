'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product, ProductCategory, ValueTag, GhanaRegion } from '@/types'

export interface ProductFilters {
  category?: ProductCategory
  valueTags?: ValueTag[]
  search?: string
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular'
  region?: GhanaRegion
  minPrice?: number
  maxPrice?: number
  limit?: number
  page?: number
}

interface UseProductsReturn {
  products: Product[]
  count: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProducts(filters: ProductFilters = {}): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const {
    category,
    valueTags,
    search,
    sort = 'newest',
    region,
    minPrice,
    maxPrice,
    limit = 24,
    page = 1,
  } = filters

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    async function fetchProducts() {
      const supabase = createClient()

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
        `,
          { count: 'exact' },
        )
        .eq('status', 'approved')

      // Filters
      if (category) {
        query = query.eq('category', category)
      }

      if (region) {
        query = query.eq('region', region)
      }

      if (valueTags && valueTags.length > 0) {
        query = query.contains('value_tags', valueTags)
      }

      if (search && search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`)
      }

      if (typeof minPrice === 'number') {
        query = query.gte('price_ghs', minPrice)
      }

      if (typeof maxPrice === 'number') {
        query = query.lte('price_ghs', maxPrice)
      }

      // Sort
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

      // Pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error: dbErr, count: total } = await query

      if (!isMounted) return

      if (dbErr) {
        setError(dbErr.message)
        setProducts([])
        setCount(0)
      } else {
        setProducts((data as Product[]) || [])
        setCount(total || 0)
        setError(null)
      }
      setLoading(false)
    }

    fetchProducts()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, region, search, sort, minPrice, maxPrice, limit, page, tick,
    // Stringify valueTags to avoid array reference comparison issues
    JSON.stringify(valueTags),
  ])

  return { products, count, loading, error, refetch }
}
