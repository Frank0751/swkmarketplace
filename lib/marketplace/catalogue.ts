import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Whether the shop has any real, approved product. Sample listings fill the
 * shop only while it has none. They used to fill in whenever a particular
 * search or filter came back empty, so once real vendors joined, an empty
 * category would have quietly mixed samples in with real products.
 * Cached per request: the grid and the page header both ask.
 */
export const hasLiveProducts = cache(async (): Promise<boolean> => {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')

  if (error) return false
  return (count ?? 0) > 0
})
