'use client'

import { createLocalList, useLocalList } from '@/lib/local/store'

/** What a saved or recently viewed product keeps for display */
export interface ProductSnapshot {
  id: string
  slug: string
  title: string
  image: string | null
  price: number
  unit?: string | null
  vendor_name?: string | null
  is_demo?: boolean
  at: number
}

export type ProductSnapshotInput = Omit<ProductSnapshot, 'at'>

const saved = createLocalList<ProductSnapshot>('swk-saved-v1', 100)
const recent = createLocalList<ProductSnapshot>('swk-recent-v1', 12)
const searches = createLocalList<string>('swk-searches-v1', 6)

// ─── Saved items ──────────────────────────────────────────────────────────────

export function useSaved() {
  const items = useLocalList(saved)
  return {
    items,
    isSaved: (id: string) => items.some(i => i.id === id),
    /** Returns true when the product is now saved */
    toggle: (product: ProductSnapshotInput): boolean => {
      const current = saved.get()
      if (current.some(i => i.id === product.id)) {
        saved.set(current.filter(i => i.id !== product.id))
        return false
      }
      saved.set([{ ...product, at: Date.now() }, ...current])
      return true
    },
    remove: (id: string) => saved.set(saved.get().filter(i => i.id !== id)),
  }
}

// ─── Recently viewed ──────────────────────────────────────────────────────────

export function useRecentlyViewed(): ProductSnapshot[] {
  return useLocalList(recent)
}

export function recordView(product: ProductSnapshotInput) {
  const rest = recent.get().filter(i => i.id !== product.id)
  recent.set([{ ...product, at: Date.now() }, ...rest])
}

// ─── Recent searches ──────────────────────────────────────────────────────────

export function useRecentSearches() {
  const items = useLocalList(searches)
  return {
    items,
    add: (term: string) => {
      const q = term.trim()
      if (q.length < 2) return
      const rest = searches.get().filter(s => s.toLowerCase() !== q.toLowerCase())
      searches.set([q, ...rest])
    },
    clear: () => searches.set([]),
  }
}
