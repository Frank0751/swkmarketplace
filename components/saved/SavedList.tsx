'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { useSaved } from '@/lib/local/lists'
import { useCart } from '@/lib/cart/CartProvider'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { cn, formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { CART_PRODUCT_COLUMNS, type CatalogueProduct } from '@/lib/cart/pricing'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The saved list, checked against the catalogue so a sold-out or removed
 * product says so, with Add to cart for everything still for sale.
 */
export function SavedList({ className }: { className?: string }) {
  const { items, remove } = useSaved()
  const { addItem, openDrawer } = useCart()
  const [live, setLive] = useState<Map<string, CatalogueProduct> | null>(null)
  const ids = items.map(i => i.id).join(',')

  useEffect(() => {
    const productIds = ids ? ids.split(',').filter(id => UUID.test(id)) : []
    if (productIds.length === 0) { setLive(new Map()); return }
    let cancelled = false
    createClient()
      .from('products')
      .select(CART_PRODUCT_COLUMNS)
      .in('id', productIds)
      .then(({ data }) => {
        if (!cancelled) setLive(new Map(((data ?? []) as unknown as CatalogueProduct[]).map(p => [p.id, p])))
      }, () => { if (!cancelled) setLive(new Map()) })
    return () => { cancelled = true }
  }, [ids])

  if (items.length === 0) {
    return (
      <div className={cn('panel px-6 py-12', className)}>
        <h2 className="text-lg text-sand-900">Nothing saved yet</h2>
        <p className="mt-1 text-sm text-sand-700 max-w-md">
          Tap the heart on any product to keep it here for later.
        </p>
        <Link href="/marketplace" className="btn btn-primary btn-sm mt-5">Browse products</Link>
      </div>
    )
  }

  function add(id: string) {
    const p = live?.get(id)
    if (!p) return
    const result = addItem({
      id: p.id, slug: p.slug, title: p.title, images: p.images, unit: p.unit,
      price_ghs: Number(p.price_ghs), stock_quantity: p.stock_quantity,
      minimum_order: p.minimum_order, is_demo: p.is_demo, vendor_id: p.vendor?.id ?? '',
      vendor: p.vendor ? { id: p.vendor.id, business_name: p.vendor.business_name, slug: p.vendor.slug } : null,
    }, Math.max(1, p.minimum_order ?? 1))
    if (result.full) toast.error('Your cart is full. Check out or remove something first.')
    else openDrawer()
  }

  return (
    <ul className={cn('panel divide-y divide-sand-200', className)}>
      {items.map(item => {
        const p = live?.get(item.id)
        const forSale = !!p && p.status === 'approved' && p.vendor?.status === 'approved' && p.stock_quantity > 0
        const price = p ? Number(p.price_ghs) : item.price
        const image = item.image || '/images/product-placeholder.svg'
        return (
          <li key={item.id} className="flex gap-4 p-4">
            <Link href={`/marketplace/${item.slug}`} className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-sand-100">
              <Image src={image} alt="" fill sizes="96px" className="object-cover" unoptimized={!canOptimizeImage(image)} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/marketplace/${item.slug}`} className="text-sm sm:text-base font-bold text-sand-900 hover:text-green-800 line-clamp-2">
                {item.title}
              </Link>
              {item.vendor_name && <p className="text-xs text-sand-600 mt-0.5">{item.vendor_name}</p>}
              <p className="mt-1.5 text-sm">
                <span className="nums font-bold text-sand-900">{formatCurrency(price)}</span>
                {p && price < item.price && (
                  <span className="ml-2 text-xs font-medium text-green-800">Down from {formatCurrency(item.price)}</span>
                )}
                {live && !forSale && <span className="ml-2 text-xs font-medium text-sand-600">{p ? 'Sold out' : 'No longer for sale'}</span>}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {forSale && (
                  <button type="button" onClick={() => add(item.id)} className="btn btn-tonal btn-sm">Add to cart</button>
                )}
                <button type="button" onClick={() => remove(item.id)} className="btn btn-ghost btn-sm">Remove</button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
