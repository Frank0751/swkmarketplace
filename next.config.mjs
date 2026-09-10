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
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    // This machine has 8GB RAM; a single build worker keeps peak memory low
    cpus: 1,
    workerThreads: false,
  },
}

export default nextConfig
