import type { MetadataRoute } from 'next'
import { createPublicClient } from '@/lib/supabase/public'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketplace.swkghana.org'

// Crawlers fetch this often; rebuild it at most once an hour
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/marketplace`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/shops`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  try {
    const supabase = createPublicClient()
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('status', 'approved')
      // Sample listings are for demonstrations, not search results
      .eq('is_demo', false)
      .order('updated_at', { ascending: false })
      .limit(1000)

    const productEntries: MetadataRoute.Sitemap = (products ?? []).map(p => ({
      url: `${BASE_URL}/marketplace/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    return [...staticEntries, ...productEntries]
  } catch {
    // Supabase unreachable (e.g. build without credentials), static entries only
    return staticEntries
  }
}
