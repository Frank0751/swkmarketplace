import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { SampleNotice }     from '@/components/layout/SampleNotice'
import { Navbar }           from '@/components/layout/Navbar'
import { Footer }           from '@/components/layout/Footer'
import { MobileBottomNav }  from '@/components/layout/MobileBottomNav'
import { SearchField }      from '@/components/search/SearchField'
import { ProductGrid }      from '@/components/marketplace/ProductGrid'
import { ProductGridSkeleton } from '@/components/marketplace/ProductGridSkeleton'
import { ShopCard }         from '@/components/marketplace/ShopCard'
import { RecentlyViewed }   from '@/components/marketplace/RecentlyViewed'
import { EscrowTrack }      from '@/components/escrow/EscrowTrack'
import { loadSearchIndex }  from '@/lib/search/index'
import { canOptimizeImage } from '@/lib/marketplace/images'
import { formatCurrency }   from '@/lib/utils'
import { CATEGORY_META, type ProductCategory } from '@/types'

const CATEGORY_IMAGES: Record<ProductCategory, string> = {
  agribusiness: '/images/cat-agribusiness.jpg',
  recycled_upcycled: '/images/cat-recycled.jpg',
  handmade_crafts: '/images/cat-handmade.jpg',
  organic_produce: '/images/cat-organic.jpg',
}

const COMMISSION = Number(process.env.NEXT_PUBLIC_COMMISSION_RATE ?? 15)

function SeeAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 min-h-[44px] flex-shrink-0 text-sm font-bold text-green-800 hover:text-green-700 transition-colors"
    >
      {children}
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  )
}

// A shop front, not a brochure: what is for sale, who sells it, and how your
// money is kept safe. Everything shown comes from the catalogue.
export default async function HomePage() {
  const index = await loadSearchIndex()
  const categories = (Object.keys(CATEGORY_META) as ProductCategory[]).map(key => ({
    key,
    label: CATEGORY_META[key].label,
    count: index.products.filter(p => p.category_key === key).length,
  }))
  // One product from each of three shops for the top of the page
  const featured = index.products
    .filter((p, i, all) => p.image && p.in_stock && all.findIndex(o => o.vendor_slug === p.vendor_slug) === i)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-sand-50">
      <SampleNotice />
      <Navbar />

      <main id="main">
        {/* ── What this is, and a way in ─────────────────────────────── */}
        <section className="bg-white border-b border-sand-200">
          <div className="container-app py-10 md:py-14 lg:py-16 grid lg:grid-cols-[1fr,1.05fr] gap-10 lg:gap-14 items-center">
            <div className="max-w-xl">
              <h1 className="text-[clamp(2.25rem,5.2vw,3.75rem)] leading-[1.05] tracking-[-0.025em] text-sand-900">
                Made, grown and upcycled by Ghana&rsquo;s young green businesses.
              </h1>
              <p className="mt-5 text-lg text-sand-700 leading-relaxed">
                Buy straight from youth-led shops. SWK Ghana holds your payment and releases it to the
                shop only when your order has arrived.
              </p>
              <SearchField className="mt-7" />
              <nav aria-label="Categories" className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {categories.map(c => (
                  <Link key={c.key} href={`/marketplace?category=${c.key}`} className="link inline-flex items-center min-h-[40px]">
                    {c.label}
                  </Link>
                ))}
              </nav>
            </div>

            {featured.length === 3 && (
              <ul className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 aspect-[5/4] lg:aspect-[6/5]">
                {featured.map((p, i) => (
                  <li key={p.id} className={i === 0 ? 'row-span-2' : ''}>
                    <Link
                      href={`/marketplace/${p.slug}`}
                      className="group relative block h-full rounded-xl overflow-hidden bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                    >
                      <Image
                        src={p.image!}
                        alt=""
                        fill
                        priority
                        sizes="(max-width: 1024px) 50vw, 320px"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        unoptimized={!canOptimizeImage(p.image)}
                      />
                      <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-sand-900/80 to-transparent text-white">
                        <span className="block text-sm sm:text-base font-bold leading-snug">{p.title}</span>
                        <span className="block text-xs sm:text-sm text-white/85 mt-0.5">
                          {p.vendor_name} · <span className="nums">{formatCurrency(p.price)}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Categories ─────────────────────────────────────────────── */}
        <section aria-labelledby="home-categories" className="container-app pt-12 md:pt-16">
          <h2 id="home-categories" className="title-section mb-5">Shop by category</h2>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {categories.map(c => (
              <li key={c.key}>
                <Link
                  href={`/marketplace?category=${c.key}`}
                  className="product-card card-accent group flex items-center gap-3 p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                >
                  <span className="relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-sand-100">
                    <Image src={CATEGORY_IMAGES[c.key]} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm sm:text-base font-bold text-sand-900 leading-tight group-hover:text-green-800 transition-colors">
                      {c.label}
                    </span>
                    <span className="block text-xs text-sand-600 mt-0.5">
                      {c.count} {c.count === 1 ? 'product' : 'products'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── What's new ─────────────────────────────────────────────── */}
        <section aria-labelledby="home-new" className="container-app pt-12 md:pt-16">
          <div className="flex items-end justify-between gap-4 mb-5">
            <h2 id="home-new" className="title-section">New on the market</h2>
            <SeeAll href="/marketplace">All {index.products.length || ''} products</SeeAll>
          </div>
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid limit={8} />
          </Suspense>
        </section>

        <div className="container-app">
          <RecentlyViewed className="pt-12 md:pt-16" />
        </div>

        {/* ── The shops ──────────────────────────────────────────────── */}
        {index.shops.length > 0 && (
          <section aria-labelledby="home-shops" className="container-app pt-12 md:pt-16">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 id="home-shops" className="title-section">The shops</h2>
                <p className="mt-1 text-sm text-sand-700">Each one is run by young people and checked by SWK Ghana before it can sell.</p>
              </div>
              <SeeAll href="/shops">All shops</SeeAll>
            </div>
            <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {index.shops.slice(0, 4).map(shop => (
                <li key={shop.id}><ShopCard shop={shop} /></li>
              ))}
            </ul>
          </section>
        )}

        {/* ── How your money is kept safe ────────────────────────────── */}
        <section aria-labelledby="home-escrow" className="mt-14 md:mt-20 bg-sand-100 border-y border-sand-200">
          <div className="container-app py-14 md:py-20">
            <div className="max-w-2xl">
              <h2 id="home-escrow" className="title-section">Your money waits until your order arrives</h2>
              <p className="mt-3 text-base text-sand-700 leading-relaxed">
                You are buying from small businesses you may not know yet. So you never pay them directly:
                SWK Ghana, a youth nonprofit, holds the payment in between.
              </p>
            </div>
            <EscrowTrack className="mt-10" />
            <Link href="/how-it-works" className="link inline-flex items-center min-h-[44px] mt-8 text-sm">
              How buying and selling work
            </Link>
          </div>
        </section>

        {/* ── For sellers ────────────────────────────────────────────── */}
        <section aria-labelledby="home-sell" className="bg-green-900 text-white">
          <div className="container-app py-14 md:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="max-w-xl">
              <h2 id="home-sell" className="text-[clamp(1.625rem,3.2vw,2.25rem)] leading-[1.15] tracking-[-0.02em] text-white">
                Run a green business? Sell here.
              </h2>
              <p className="mt-4 text-base text-green-50/90 leading-relaxed">
                SWK Marketplace is for young people in Ghana who grow, make or upcycle. You get your own
                shop page, orders paid up front into escrow, and nothing to pay until you sell.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link href="/vendor/apply" className="btn btn-lg bg-white text-green-900 hover:bg-green-50">
                  Apply to sell
                </Link>
                <Link href="/how-it-works#selling" className="btn btn-lg border border-white/40 text-white hover:bg-white/10">
                  How selling works
                </Link>
              </div>
            </div>

            <figure>
              <figcaption className="text-sm font-bold text-white mb-3">Where a GHS 100 sale goes</figcaption>
              <div
                className="flex h-14 rounded-lg overflow-hidden text-sm font-bold"
                role="img"
                aria-label={`Of a 100 cedi sale, ${100 - COMMISSION} cedis go to the shop and ${COMMISSION} cedis to SWK Ghana`}
              >
                <div className="flex items-center px-4 bg-white text-green-900" style={{ width: `${100 - COMMISSION}%` }}>
                  GHS {100 - COMMISSION} to you
                </div>
                <div className="flex items-center justify-center bg-gold-400 text-white" style={{ width: `${COMMISSION}%` }}>
                  {COMMISSION}
                </div>
              </div>
              <p className="mt-3 text-sm text-green-50/90 leading-relaxed">
                Your share is paid to your mobile money or bank account when the buyer confirms delivery.
                The other GHS {COMMISSION} runs the marketplace and SWK Ghana&rsquo;s youth programmes.
                No listing fee, no monthly fee.
              </p>
            </figure>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  )
}
