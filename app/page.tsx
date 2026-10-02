import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AnnouncementBar }  from '@/components/layout/AnnouncementBar'
import { Navbar }           from '@/components/layout/Navbar'
import { HeroSection }      from '@/components/marketplace/HeroSection'
import { ProofBar }         from '@/components/marketplace/ProofBar'
import { CategoryShowcase } from '@/components/marketplace/CategoryShowcase'
import { ProductGrid }      from '@/components/marketplace/ProductGrid'
import { TrustSection }     from '@/components/marketplace/TrustSection'
import { VendorCTA }        from '@/components/marketplace/VendorCTA'
import { SectionHeading }   from '@/components/marketplace/SectionHeading'
import { Footer }           from '@/components/layout/Footer'
import { MobileBottomNav }  from '@/components/layout/MobileBottomNav'
import { ProductGridSkeleton } from '@/components/marketplace/ProductGridSkeleton'

// Hero, proof, what's for sale, how buying works, the call to vendors, footer
export default function HomePage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <AnnouncementBar />
      <Navbar />

      <main id="main">
        <HeroSection />
        <ProofBar />
        <CategoryShowcase />

        <section className="section bg-sand-50">
          <div className="container-app">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <SectionHeading
                eyebrow="From the shops"
                title="Featured products"
                subtitle="Fresh listings from youth-led businesses across Ghana, each checked before it went live."
              />
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-green-700 hover:text-green-800 transition-colors group flex-shrink-0"
              >
                View all products
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>

            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid limit={8} />
            </Suspense>
          </div>
        </section>

        <TrustSection />
        <VendorCTA />
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  )
}
