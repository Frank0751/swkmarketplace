import type { Metadata } from 'next'
import Link from 'next/link'
import { SampleNotice } from '@/components/layout/SampleNotice'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { ShopCard } from '@/components/marketplace/ShopCard'
import { loadSearchIndex } from '@/lib/search/index'

export const metadata: Metadata = {
  title: 'Shops',
  description: 'The youth-led green businesses selling on SWK Marketplace, each checked by SWK Ghana before it can sell.',
}

export default async function ShopsPage() {
  const { shops } = await loadSearchIndex()

  return (
    <>
      <SampleNotice />
      <Navbar />
      <main id="main" className="container-app py-8 md:py-12 pb-24 md:pb-16">
        <div className="max-w-2xl">
          <h1 className="title-page">Shops</h1>
          <span className="rule mt-4" aria-hidden="true" />
          <p className="mt-4 text-base text-sand-700 leading-relaxed">
            Every shop here is run by young people in Ghana and was checked by SWK Ghana before it could sell.
          </p>
        </div>

        {shops.length === 0 ? (
          <div className="panel px-6 py-12 mt-8">
            <h2 className="text-lg text-sand-900">No shops yet</h2>
            <p className="mt-1 text-sm text-sand-700">The first shops are joining now.</p>
            <Link href="/vendor/apply" className="btn btn-primary btn-sm mt-5">Apply to sell</Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:gap-4 md:grid-cols-2 mt-8">
            {shops.map(shop => (
              <li key={shop.id}><ShopCard shop={shop} /></li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm text-sand-700">
          Run a green business? <Link href="/vendor/apply" className="link">Apply to sell here</Link>.
        </p>
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
