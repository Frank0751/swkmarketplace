/**
 * Sent with every response. The marketplace is never meant to appear inside
 * another site's frame, so framing is refused outright: that stops a hostile
 * page overlaying the checkout, payout or approval buttons (clickjacking).
 * HSTS is added by Vercel.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
]

/**
 * Filtered, sorted, searched or paged copies of the listing pages are fine for
 * people but shouldn't be search results (robots.txt asks crawlers not to fetch
 * them either). This is a header, not page metadata: metadata can only see the
 * query string by rendering on every request, and these pages are cached.
 * Vercel adds the header without running anything.
 */
const LISTING_QUERY_KEYS = ['search', 'category', 'values', 'region', 'min_price', 'max_price', 'sort', 'page', 'vendor_id']
const noindexListingCopies = ['/marketplace', '/shops'].flatMap(source =>
  LISTING_QUERY_KEYS.map(key => ({
    source,
    has: [{ type: 'query', key }],
    headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
  })),
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Keep in sync with lib/marketplace/images.ts
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }, ...noindexListingCopies]
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // This machine has 8GB RAM; a single build worker keeps peak memory low
    cpus: 1,
    workerThreads: false,
  },
}

export default nextConfig
