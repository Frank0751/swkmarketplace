import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import type { CatalogueProduct } from '@/types'

// The storefront's data: the same for every visitor, so it's read with the
// public client (no cookies) and cached, which lets the pages that show it be
// cached too. Rechecked every five minutes, and straight away after an
// admin or vendor changes the catalogue (revalidateCatalogue).

/** The same limit as the search index: past this, filtering moves to the database */
const MAX_PRODUCTS = 1000

/**
 * Whether the storefront is showing SWK's sample shops. They're ordinary
 * products flagged is_demo (migration 008), visible until an admin hides them
 * from the dashboard, so pages say plainly that their checkout uses a test
 * payment.
 */
export const sampleCatalogueVisible = unstable_cache(
  async (): Promise<boolean> => {
    const supabase = createPublicClient()
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('is_demo', true)

    if (error) return false
    return (count ?? 0) > 0
  },
  ['sample-catalogue-visible-v1'],
  { revalidate: 300, tags: ['catalogue'] },
)

/** Every live listing, newest first, with what the cards and /marketplace need */
export const loadCatalogue = unstable_cache(
  async (): Promise<CatalogueProduct[]> => {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, vendor_id, slug, title, short_description, price_ghs, unit, images, location, stock_quantity, ' +
        'minimum_order, is_demo, category, value_tags, region, order_count, created_at, ' +
        'vendor:vendor_profiles(id, business_name, slug)',
      )
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(MAX_PRODUCTS)

    if (error) {
      console.error('[Catalogue] Supabase error:', error.message)
      return []
    }
    return (data ?? []) as unknown as CatalogueProduct[]
  },
  ['catalogue-v1'],
  { revalidate: 300, tags: ['catalogue'] },
)
