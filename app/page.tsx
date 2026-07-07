import { Suspense } from 'react'
import { AnnouncementBar }  from '@/components/layout/AnnouncementBar'
import { Navbar }           from '@/components/layout/Navbar'
import { HeroSection }      from '@/components/marketplace/HeroSection'
import { CategoryStrip }    from '@/components/marketplace/CategoryStrip'
import { ValueFilterStrip } from '@/components/marketplace/ValueFilterStrip'
import { ProductGrid }      from '@/components/marketplace/ProductGrid'
import { TrustSection }     from '@/components/marketplace/TrustSection'
import { HowItWorksSnippet }from '@/components/marketplace/HowItWorksSnippet'
import { VendorCTA }        from '@/components/marketplace/VendorCTA'
import { Footer }           from '@/components/layout/Footer'
import { MobileBottomNav }  from '@/components/layout/MobileBottomNav'
import { ProductGridSkeleton } from '@/components/marketplace/ProductGridSkeleton'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <AnnouncementBar />
      <Navbar />

      <main>
        <HeroSection />
        <CategoryStrip />
        <ValueFilterStrip />

        <section className="section">
          <div className="container-app">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-semibold text-sand-900">
                  Featured products
                </h2>
                <p className="text-sand-500 text-sm mt-1">
                  Every listing is SDG 12-verified before going live
                </p>
              </div>
              <a
                href="/marketplace"
                className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
              >
                View all
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid limit={8} />
            </Suspense>
          </div>
        </section>

        <TrustSection />
        <HowItWorksSnippet />
        <VendorCTA />
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  )
}
