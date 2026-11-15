'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ProductCard } from '@/components/marketplace/ProductCard'
import type { Product } from '@/types'

interface MoreFromShopProps {
  vendorId: string
  vendorName: string
  vendorSlug: string
  excludeId: string
  className?: string
}

/** Up to four other products from the same shop, under a product */
export function MoreFromShop({ vendorId, vendorName, vendorSlug, excludeId, className }: MoreFromShopProps) {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    let cancelled = false
    createClient()
      .from('products')
      .select('*, vendor:vendor_profiles(id, business_name, slug, location, region, logo_url, rating, review_count, status)')
      .eq('vendor_id', vendorId)
      .eq('status', 'approved')
      .neq('id', excludeId)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => { if (!cancelled) setProducts((data ?? []) as Product[]) }, () => {})
    return () => { cancelled = true }
  }, [vendorId, excludeId])

  if (products.length === 0) return null

  return (
    <section aria-labelledby="more-from-shop" className={className}>
      <div className="flex items-end justify-between gap-4 mb-5">
        <h2 id="more-from-shop" className="title-section">More from {vendorName}</h2>
        <Link href={`/store/${vendorSlug}`} className="link text-sm inline-flex items-center min-h-[44px] flex-shrink-0">
          Visit the shop
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}
