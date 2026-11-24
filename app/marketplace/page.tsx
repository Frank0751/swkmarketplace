import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SampleNotice } from '@/components/layout/SampleNotice'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { CategoryStrip } from '@/components/marketplace/CategoryStrip'
import { MarketplaceBrowser, MarketplaceView } from '@/components/marketplace/MarketplaceBrowser'
import { loadCatalogue } from '@/lib/marketplace/catalogue'
import { browseCatalogue } from '@/lib/marketplace/browse'
import { parseMarketplaceFilters } from '@/lib/marketplace/filters'

// Cached, never rendered per visit: refreshed every five minutes, or straight
// away after a catalogue change (revalidateCatalogue). The filters, sort,
// search and page in the address are applied in the browser, so the endless
// filtered addresses crawlers find are all this one cached page.
export const revalidate = 300

export const metadata: Metadata = {
  title: 'All products',
  description:
    'Honey, produce, crafts and upcycled goods from youth-led green businesses in Ghana, each checked against SDG 12.',
  // Every filtered, sorted or paged copy of this page points here
  alternates: { canonical: '/marketplace' },
  openGraph: {
    title: 'All products | SWK Marketplace',
    description: 'Honey, produce, crafts and upcycled goods from youth-led green businesses in Ghana.',
    url: 'https://marketplace.swkghana.org/marketplace',
    siteName: 'SWK Marketplace',
  },
}

export default async function MarketplacePage() {
  const catalogue = await loadCatalogue()
  const unfiltered = parseMarketplaceFilters({})

  return (
    <>
      <SampleNotice />
      <Navbar />
      <CategoryStrip />

      <main id="main" className="container-app py-6 md:py-8 pb-24 md:pb-12">
        <Suspense fallback={<MarketplaceView filters={unfiltered} result={browseCatalogue(catalogue, unfiltered)} />}>
          <MarketplaceBrowser catalogue={catalogue} />
        </Suspense>
      </main>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
