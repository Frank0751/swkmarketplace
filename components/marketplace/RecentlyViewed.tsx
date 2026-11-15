'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { recordView, useRecentlyViewed, type ProductSnapshotInput } from '@/lib/local/lists'
import { createClient } from '@/lib/supabase/client'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { formatCurrency } from '@/lib/utils'

/** On a product page: remembers the visit in this browser and counts the view */
export function RecordView({ product }: { product: ProductSnapshotInput }) {
  useEffect(() => {
    recordView(product)
    // Fire and forget: a failed count is not worth telling anyone about
    createClient().rpc('increment_product_views', { product_id: product.id }).then(() => {}, () => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])
  return null
}

/**
 * The products someone looked at last, so they can find their way back.
 * Renders nothing until there is something to show.
 */
export function RecentlyViewed({ excludeId, className }: { excludeId?: string; className?: string }) {
  const items = useRecentlyViewed().filter(p => p.id !== excludeId).slice(0, 6)
  if (items.length === 0) return null

  return (
    <section aria-labelledby="recently-viewed" className={className}>
      <h2 id="recently-viewed" className="title-section mb-5">Recently viewed</h2>
      <ul className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
        {items.map(p => {
          const image = p.image || '/images/product-placeholder.svg'
          return (
            <li key={p.id} className="snap-start flex-shrink-0 w-36 sm:w-44">
              <Link href={`/marketplace/${p.slug}`} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2">
                <span className="relative block aspect-square rounded-lg overflow-hidden bg-sand-100 border border-sand-200">
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="176px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    unoptimized={!canOptimizeImage(image)}
                  />
                </span>
                <span className="block mt-2 text-sm font-medium text-sand-900 leading-snug line-clamp-2 group-hover:text-green-800 transition-colors">
                  {p.title}
                </span>
                <span className="nums block mt-0.5 text-sm font-bold text-sand-900">{formatCurrency(p.price)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
