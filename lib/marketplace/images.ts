/**
 * Hosts that next/image may optimise; must match images.remotePatterns in
 * next.config.mjs. Vendors can also paste image links from anywhere, and
 * next/image refuses unknown hosts (a broken image in production, a crash in
 * development), so those are shown unoptimised instead.
 */
const OPTIMISED_HOSTS = ['res.cloudinary.com', 'images.unsplash.com']

export function canOptimizeImage(src: string | null | undefined): boolean {
  if (!src || src.startsWith('/')) return true
  try {
    const { hostname } = new URL(src)
    return OPTIMISED_HOSTS.includes(hostname) || hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}
