'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/cart/CartProvider'
import { CART_PRODUCT_COLUMNS, type CatalogueProduct } from '@/lib/cart/pricing'
import { cn } from '@/lib/utils'

/** Puts a past order's product back in the cart, at today's price, if it's still for sale */
export function BuyAgainButton({ productId, className }: { productId: string; className?: string }) {
  const { addItem, openDrawer } = useCart()
  const [busy, setBusy] = useState(false)

  async function buyAgain() {
    setBusy(true)
    try {
      const { data } = await createClient()
        .from('products')
        .select(CART_PRODUCT_COLUMNS)
        .eq('id', productId)
        .maybeSingle()
      const p = data as unknown as CatalogueProduct | null
      if (!p || p.status !== 'approved' || p.vendor?.status !== 'approved') {
        toast.error('This product is no longer for sale.')
        return
      }
      if (p.stock_quantity <= 0) {
        toast.error(`${p.title} has sold out.`)
        return
      }
      const result = addItem({
        id: p.id, slug: p.slug, title: p.title, images: p.images, unit: p.unit,
        price_ghs: Number(p.price_ghs), stock_quantity: p.stock_quantity,
        minimum_order: p.minimum_order, is_demo: p.is_demo, vendor_id: p.vendor?.id ?? '',
        vendor: p.vendor ? { id: p.vendor.id, business_name: p.vendor.business_name, slug: p.vendor.slug } : null,
      }, Math.max(1, p.minimum_order ?? 1))
      if (result.full) toast.error('Your cart is full. Check out or remove something first.')
      else openDrawer()
    } catch {
      toast.error('Couldn’t reach the shop. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={buyAgain} disabled={busy} className={cn('btn btn-secondary btn-sm', className)}>
      <RotateCcw className="w-4 h-4" aria-hidden="true" />
      {busy ? 'Adding…' : 'Buy again'}
    </button>
  )
}
