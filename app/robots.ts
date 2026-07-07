import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketplace.swkghana.org'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/buyer', '/vendor/dashboard', '/vendor/listings', '/vendor/apply', '/api'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
