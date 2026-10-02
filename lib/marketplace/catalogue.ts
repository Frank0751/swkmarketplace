import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Whether the storefront is showing SWK's sample shops. They're ordinary
 * products flagged is_demo (migration 008), visible until an admin hides them
 * from the dashboard, so pages say plainly that their checkout uses a test
 * payment. Cached per request: the grid and the page header both ask.
 */
export const sampleCatalogueVisible = cache(async (): Promise<boolean> => {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')
    .eq('is_demo', true)

  if (error) return false
  return (count ?? 0) > 0
})
