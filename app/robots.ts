import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://marketplace.swkghana.org'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // The storefront, shops, product pages and how it works stay crawlable
      allow: '/',
      disallow: [
        // Filtered, sorted, searched and paged copies of the same listings: in
        // November 2026 crawlers fetched a million of these in a week
        '/marketplace?',
        '/shops?',
        '/store/*?',
        // Signing in, and everything behind it
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/auth/',
        '/api/',
        '/admin',
        '/buyer',
        '/checkout',
        '/cart',
        '/saved',
        '/vendor/dashboard',
        '/vendor/listings',
        '/vendor/store',
        '/vendor/orders',
        '/vendor/payouts',
        '/vendor/apply',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
