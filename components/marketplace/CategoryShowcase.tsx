import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { CATEGORY_META, type ProductCategory } from '@/types'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/motion'
import { SectionHeading } from '@/components/marketplace/SectionHeading'

const CATEGORY_IMAGES: Record<ProductCategory, string> = {
  agribusiness: '/images/cat-agribusiness.jpg',
  recycled_upcycled: '/images/cat-recycled.jpg',
  handmade_crafts: '/images/cat-handmade.jpg',
  organic_produce: '/images/cat-organic.jpg',
}

const CATEGORIES = Object.keys(CATEGORY_META) as ProductCategory[]

export function CategoryShowcase() {
  return (
    <section className="section bg-white">
      <div className="container-app">
        <FadeIn className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <SectionHeading
            eyebrow="Browse the market"
            title="Shop by category"
            subtitle="Every product is checked for responsible production (SDG 12) before it goes live."
          />
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-green-700 hover:text-green-800 transition-colors group flex-shrink-0"
          >
            All products
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </FadeIn>

        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat]
            return (
              <StaggerItem key={cat}>
                <Link
                  href={`/marketplace?category=${cat}`}
                  className="group relative block overflow-hidden rounded-2xl bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                  style={{ aspectRatio: '4 / 5' }}
                >
                  <Image
                    src={CATEGORY_IMAGES[cat]}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-green-900/90 via-green-900/30 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <h3 className="text-white font-bold text-base sm:text-xl leading-tight">
                      {meta.label}
                    </h3>
                    <p className="hidden sm:block mt-1.5 text-white/80 text-sm leading-snug line-clamp-2">
                      {meta.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-green-100 group-hover:text-white transition-colors">
                      Explore
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gold-400 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" aria-hidden="true" />
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </section>
  )
}
