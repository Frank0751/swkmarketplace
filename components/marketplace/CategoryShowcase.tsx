import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { CATEGORY_META, type ProductCategory } from '@/types'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/motion'

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
        <FadeIn className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-semibold text-sand-900">
              Shop by category
            </h2>
            <p className="text-sand-500 text-sm mt-1">
              Four ways to buy sustainably, every product SDG 12-verified
            </p>
          </div>
          <Link
            href="/marketplace"
            className="hidden sm:flex text-sm font-medium text-green-600 hover:text-green-700 items-center gap-1 transition-colors"
          >
            All products <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeIn>

        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat]
            return (
              <StaggerItem key={cat}>
                <Link
                  href={`/marketplace?category=${cat}`}
                  className="group relative block overflow-hidden rounded-2xl shadow-card hover:shadow-card-lg transition-shadow"
                  style={{ aspectRatio: '4/5' }}
                >
                  <Image
                    src={CATEGORY_IMAGES[cat]}
                    alt={meta.label}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Gradient scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-sand-900/85 via-sand-900/25 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="text-2xl mb-1.5" role="img" aria-hidden="true">{meta.emoji}</div>
                    <h3 className="text-white font-display font-semibold text-base md:text-lg leading-tight mb-1">
                      {meta.label}
                    </h3>
                    <p className="text-white/70 text-xs leading-snug line-clamp-2 mb-2">
                      {meta.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-white transition-colors">
                      Explore
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </section>
  )
}
