'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'

const HERO_TAGS = [
  { label: 'Organic produce', href: '/marketplace?category=organic_produce' },
  { label: 'Handmade crafts', href: '/marketplace?category=handmade_crafts' },
  { label: 'Recycled goods',  href: '/marketplace?category=recycled_upcycled' },
  { label: 'Honey & coffee',  href: '/marketplace?category=agribusiness' },
]

const TRUST = ['Escrow on every order', 'SDG 12 checked listings', 'Delivery across Ghana']

// The escrow steps the order card in the hero walks through
const ESCROW = [
  { label: 'Paid', done: true },
  { label: 'Held', done: true },
  { label: 'Delivered', done: false },
  { label: 'Released', done: false },
]

export function HeroSection() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(query.trim() ? `/marketplace?search=${encodeURIComponent(query.trim())}` : '/marketplace')
  }

  return (
    <section className="relative overflow-hidden bg-sand-50">
      <div className="container-app relative">
        <div className="grid lg:grid-cols-[1.08fr,0.92fr] gap-12 lg:gap-16 items-center pt-12 pb-14 md:pt-16 md:pb-20 lg:py-24">

          {/* ── Copy and search ─────────────────────────────────────────── */}
          <div className="max-w-2xl">
            <p className="eyebrow rise rise-1 mb-5">SWK Ghana Marketplace · Made in Ghana</p>

            <h1 className="rise rise-2 font-display font-bold text-sand-900 text-[clamp(2.5rem,6vw,4.6rem)] leading-[1.04] tracking-[-0.025em] text-balance">
              Shop green. <span className="text-green-600">Support youth.</span> Build Africa.
            </h1>

            <span className="rule rise rise-3 mt-6 mb-6" aria-hidden="true" />

            <p className="rise rise-3 text-lg md:text-xl text-sand-700 leading-relaxed max-w-xl">
              Eco-friendly products from verified young entrepreneurs across Ghana. Your money is held
              safely until your order arrives.
            </p>

            <form onSubmit={handleSearch} role="search" className="rise rise-4 mt-8 flex gap-2 max-w-xl">
              <label htmlFor="hero-search" className="sr-only">Search eco-friendly products</label>
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-600" aria-hidden="true" />
                <input
                  id="hero-search"
                  type="search"
                  placeholder="Honey, soap, a veggie box…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full min-h-[52px] pl-12 pr-4 text-base bg-white border border-sand-300 rounded-xl placeholder:text-sand-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent shadow-card transition-shadow"
                />
              </div>
              <button
                type="submit"
                className="min-h-[52px] px-5 sm:px-7 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 active:bg-green-800 transition-colors shadow-card inline-flex items-center gap-2"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only sm:hidden">Search</span>
              </button>
            </form>

            <nav aria-label="Popular categories" className="rise rise-4 mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-sand-600 font-medium mr-1">Popular:</span>
              {HERO_TAGS.map(tag => (
                <Link
                  key={tag.label}
                  href={tag.href}
                  className="inline-flex items-center min-h-[36px] px-3.5 text-xs font-medium text-sand-800 bg-white border border-sand-200 rounded-full hover:border-green-600 hover:text-green-700 transition-colors"
                >
                  {tag.label}
                </Link>
              ))}
            </nav>

            <ul className="rise rise-5 mt-10 pt-6 border-t border-sand-200 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sand-700">
              {TRUST.map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Photo with an order card that explains escrow ───────────── */}
          <div className="relative hidden lg:block rise rise-3" aria-hidden="true">
            <div
              className="relative w-full overflow-hidden shadow-card-lg"
              style={{ borderRadius: '240px 240px 28px 28px', aspectRatio: '4 / 5' }}
            >
              <Image
                src="/images/hero-market.jpg"
                alt=""
                fill
                priority
                sizes="(max-width: 1280px) 40vw, 480px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-green-900/40 via-transparent to-transparent" />
            </div>

            <div className="absolute -left-12 bottom-12 w-[300px] rounded-2xl bg-white border border-sand-200 shadow-card-lg p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-sand-600">SWK-8F3A21C4</span>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">Held in escrow</span>
              </div>
              <p className="mt-3 text-sm font-medium text-sand-800">Raw Forest Honey × 2</p>
              <p className="text-2xl font-bold text-sand-900 tracking-tight">GH₵150.00</p>
              <ol className="mt-4 grid grid-cols-4 gap-1.5">
                {ESCROW.map(step => (
                  <li key={step.label}>
                    <span className={`block h-1.5 rounded-full ${step.done ? 'bg-green-600' : 'bg-sand-200'}`} />
                    <span className={`mt-1.5 block text-[10px] font-medium ${step.done ? 'text-green-700' : 'text-sand-600'}`}>
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-sand-600 leading-snug">
                The shop is paid only after you confirm delivery.
              </p>
            </div>
          </div>
        </div>
      </div>

      <span className="kente-band" aria-hidden="true" />
    </section>
  )
}
