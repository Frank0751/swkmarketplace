'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { MAX_CART_LINES } from '@/lib/checkout/schema'
import { formatCurrency } from '@/lib/utils'
import type { CatalogueProduct } from '@/lib/cart/pricing'

// ─── The cart ─────────────────────────────────────────────────────────────────
//
// Kept in the browser (localStorage), so anyone can fill a cart before signing
// in and it survives a refresh or a trip to the login page. Each line keeps a
// snapshot of the product for display; the checkout API re-prices everything
// from the database, and useCartSync refreshes the snapshots so the buyer sees
// price or stock changes before paying.

const STORAGE_KEY = 'swk-cart-v1'

export interface CartItem {
  product_id: string
  slug: string
  title: string
  image: string | null
  unit?: string | null
  unit_price: number
  vendor_id: string
  vendor_name: string
  vendor_slug?: string | null
  quantity: number
  /** Stock when last checked */
  max_quantity: number
  /** The product's minimum order */
  min_quantity: number
  is_demo: boolean
  /** The product was removed, hidden or sold out since it was added */
  unavailable?: boolean
  added_at: number
}

/** What adding to the cart needs from a product */
export interface CartProductInput {
  id: string
  slug: string
  title: string
  images?: string[] | null
  unit?: string | null
  price_ghs: number
  stock_quantity: number
  minimum_order?: number | null
  is_demo?: boolean | null
  vendor_id: string
  vendor?: { id: string; business_name: string; slug?: string | null } | null
}

export interface CartNotice {
  product_id: string
  kind: 'price' | 'stock' | 'unavailable'
  message: string
}

export interface AddResult {
  /** Quantity of this product now in the cart */
  quantity: number
  /** The request was cut down to the stock available */
  capped: boolean
  /** The cart is full of different products */
  full: boolean
}

interface CartContextValue {
  items: CartItem[]
  /** False until the saved cart has been read, so counts don't flash 0 */
  ready: boolean
  /** Total units across available lines, for the badge */
  count: number
  addItem: (product: CartProductInput, quantity?: number) => AddResult
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  removeItems: (productIds: string[]) => void
  clear: () => void
  /** Refresh snapshots from the catalogue; returns what changed */
  applyCatalogue: (products: CatalogueProduct[]) => CartNotice[]
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  /** The product most recently added, highlighted in the drawer */
  lastAddedId: string | null
}

const CartContext = createContext<CartContextValue | null>(null)

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { items?: unknown }
    if (!Array.isArray(parsed.items)) return []
    return parsed.items.filter(
      (i): i is CartItem =>
        !!i && typeof i === 'object' &&
        typeof (i as CartItem).product_id === 'string' &&
        typeof (i as CartItem).quantity === 'number' &&
        typeof (i as CartItem).unit_price === 'number',
    )
  } catch {
    return []
  }
}

function writeStorage(items: CartItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items }))
  } catch {
    // Private mode or storage full: the cart still works for this page
  }
}

function clampQuantity(item: Pick<CartItem, 'min_quantity' | 'max_quantity'>, quantity: number): number {
  const max = Math.max(0, item.max_quantity)
  const min = Math.max(1, item.min_quantity)
  return Math.max(Math.min(min, max), Math.min(Math.round(quantity), max))
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  // Mirrors state synchronously, so addItem can report what it did
  const itemsRef = useRef<CartItem[]>([])

  const commit = useCallback((next: CartItem[]) => {
    itemsRef.current = next
    setItems(next)
    writeStorage(next)
  }, [])

  useEffect(() => {
    const saved = readStorage()
    itemsRef.current = saved
    setItems(saved)
    setReady(true)

    // Another tab changed the cart
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const next = readStorage()
      itemsRef.current = next
      setItems(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addItem = useCallback((product: CartProductInput, quantity = 1): AddResult => {
    const current = itemsRef.current
    const existing = current.find(i => i.product_id === product.id)

    if (!existing && current.length >= MAX_CART_LINES) {
      return { quantity: 0, capped: false, full: true }
    }

    const snapshot: CartItem = {
      product_id:   product.id,
      slug:         product.slug,
      title:        product.title,
      image:        product.images?.[0] ?? null,
      unit:         product.unit ?? null,
      unit_price:   Number(product.price_ghs),
      vendor_id:    product.vendor?.id ?? product.vendor_id,
      vendor_name:  product.vendor?.business_name ?? existing?.vendor_name ?? 'Shop',
      vendor_slug:  product.vendor?.slug ?? existing?.vendor_slug ?? null,
      quantity:     0,
      max_quantity: product.stock_quantity,
      min_quantity: Math.max(1, product.minimum_order ?? 1),
      is_demo:      !!product.is_demo,
      unavailable:  false,
      added_at:     existing?.added_at ?? Date.now(),
    }

    const wanted = (existing && !existing.unavailable ? existing.quantity : 0) + quantity
    const finalQuantity = clampQuantity(snapshot, wanted)
    const next = existing
      ? current.map(i => (i.product_id === product.id ? { ...snapshot, quantity: finalQuantity } : i))
      : [...current, { ...snapshot, quantity: finalQuantity }]

    commit(next)
    setLastAddedId(product.id)
    return { quantity: finalQuantity, capped: finalQuantity < wanted, full: false }
  }, [commit])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    commit(itemsRef.current.map(i =>
      i.product_id === productId ? { ...i, quantity: clampQuantity(i, quantity) } : i,
    ))
  }, [commit])

  const removeItem = useCallback((productId: string) => {
    commit(itemsRef.current.filter(i => i.product_id !== productId))
  }, [commit])

  const removeItems = useCallback((productIds: string[]) => {
    const drop = new Set(productIds)
    commit(itemsRef.current.filter(i => !drop.has(i.product_id)))
  }, [commit])

  const clear = useCallback(() => commit([]), [commit])

  const applyCatalogue = useCallback((products: CatalogueProduct[]): CartNotice[] => {
    const byId = new Map(products.map(p => [p.id, p]))
    const notices: CartNotice[] = []

    const next = itemsRef.current.map(item => {
      const p = byId.get(item.product_id)
      const live = p && p.status === 'approved' && p.vendor?.status === 'approved' && p.stock_quantity > 0

      if (!live) {
        if (!item.unavailable) {
          notices.push({
            product_id: item.product_id,
            kind: 'unavailable',
            message: p && p.stock_quantity <= 0
              ? `${item.title} has sold out.`
              : `${item.title} is no longer available.`,
          })
        }
        return { ...item, unavailable: true, max_quantity: p?.stock_quantity ?? 0 }
      }

      const price = Number(p.price_ghs)
      if (price !== item.unit_price) {
        notices.push({
          product_id: item.product_id,
          kind: 'price',
          message: `${p.title} is now ${formatCurrency(price)} (was ${formatCurrency(item.unit_price)}).`,
        })
      }

      const refreshed: CartItem = {
        ...item,
        slug:         p.slug,
        title:        p.title,
        image:        p.images?.[0] ?? item.image,
        unit:         p.unit ?? null,
        unit_price:   price,
        vendor_id:    p.vendor?.id ?? item.vendor_id,
        vendor_name:  p.vendor?.business_name ?? item.vendor_name,
        vendor_slug:  p.vendor?.slug ?? item.vendor_slug,
        max_quantity: p.stock_quantity,
        min_quantity: Math.max(1, p.minimum_order ?? 1),
        is_demo:      !!p.is_demo,
        unavailable:  false,
      }
      const quantity = clampQuantity(refreshed, item.unavailable ? refreshed.min_quantity : item.quantity)
      if (quantity < item.quantity) {
        notices.push({
          product_id: item.product_id,
          kind: 'stock',
          message: `Only ${p.stock_quantity} of ${p.title} left, so your cart now has ${quantity}.`,
        })
      }
      return { ...refreshed, quantity }
    })

    const changed = JSON.stringify(next) !== JSON.stringify(itemsRef.current)
    if (changed) commit(next)
    return notices
  }, [commit])

  const value = useMemo<CartContextValue>(() => ({
    items,
    ready,
    count: items.filter(i => !i.unavailable).reduce((sum, i) => sum + i.quantity, 0),
    addItem,
    setQuantity,
    removeItem,
    removeItems,
    clear,
    applyCatalogue,
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    lastAddedId,
  }), [items, ready, addItem, setQuantity, removeItem, removeItems, clear, applyCatalogue, drawerOpen, lastAddedId])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
