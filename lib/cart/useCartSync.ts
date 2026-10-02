'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CART_PRODUCT_COLUMNS, type CatalogueProduct } from '@/lib/cart/pricing'
import { useCart, type CartNotice } from '@/lib/cart/CartProvider'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Re-reads the cart's products from the catalogue (price, stock, whether
 * they're still for sale) and reports what changed, so the buyer sees it on
 * the cart and checkout pages before paying rather than as a failed payment.
 */
export function useCartSync(enabled = true) {
  const { items, ready, applyCatalogue } = useCart()
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [notices, setNotices] = useState<CartNotice[]>([])
  const [failed, setFailed] = useState(false)
  const inFlight = useRef(false)

  const ids = items.map(i => i.product_id).sort().join(',')

  const sync = useCallback(async () => {
    if (inFlight.current) return
    // A malformed id (an edited or very old saved cart) would make the whole
    // query fail; leaving it out marks just that line unavailable
    const productIds = (ids ? ids.split(',') : []).filter(id => UUID.test(id))
    if (productIds.length === 0) {
      if (ids) applyCatalogue([])
      setSynced(true)
      return
    }
    inFlight.current = true
    setSyncing(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .select(CART_PRODUCT_COLUMNS)
        .in('id', productIds)
      if (error) throw error
      const found = applyCatalogue((data ?? []) as unknown as CatalogueProduct[])
      if (found.length > 0) setNotices(prev => [...prev, ...found])
      setFailed(false)
    } catch (err) {
      console.error('[Cart] could not refresh products:', err)
      setFailed(true)
    } finally {
      inFlight.current = false
      setSyncing(false)
      setSynced(true)
    }
  }, [ids, applyCatalogue])

  // Once when the cart is read, and again whenever a product joins or leaves it
  useEffect(() => {
    if (enabled && ready) sync()
  }, [enabled, ready, sync])

  const dismissNotices = useCallback(() => setNotices([]), [])

  return { syncing, synced, notices, failed, sync, dismissNotices }
}
