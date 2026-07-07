'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight } from 'lucide-react'

const HERO_TAGS = ['Organic produce', 'Recycled crafts', 'Agribusiness', 'Handmade goods']

const SDG_BADGES = [
  { num: '12', label: 'Responsible Consumption', color: 'bg-amber-500' },
  { num: '13', label: 'Climate Action', color: 'bg-green-600' },
  { num: '8',  label: 'Decent Work',   color: 'bg-teal-600' },
  { num: '1',  label: 'No Poverty',    color: 'bg-red-500' },
]

export function HeroSection() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/marketplace?search=${encodeURIComponent(query)}`)
    else router.push('/marketplace')
  }

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Dot pattern background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, #C0DD97 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Green gradient blob */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-green-50 blur-3xl opacity-60" />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-teal-50 blur-3xl opacity-60" />

      <div className="container-app relative">
        <div className="py-16 md:py-24 lg:py-28 max-w-3xl">

          {/* Pre-headline */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-100">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-slow" />
              <span className="text-xs font-medium text-green-700">SDG 12 Verified · Youth-Powered · Ghana</span>
            </div>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-semibold text-sand-900 leading-[1.08] tracking-tight mb-6 text-balance">
            Shop green.{' '}
            <span className="text-green-600 italic">Support youth.</span>{' '}
            Build Africa.
          </h1>

          <p className="text-lg md:text-xl text-sand-500 mb-8 leading-relaxed max-w-2xl">
            A curated marketplace of eco-friendly products from verified young entrepreneurs across Ghana.
            Every purchase is escrow-protected.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-400" />
              <input
                type="search"
                placeholder="What are you looking for?"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 text-base bg-white border border-sand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent shadow-card transition-shadow"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-card flex items-center gap-2"
            >
              Search
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-sand-400 font-medium">Popular:</span>
            {HERO_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => router.push(`/marketplace?search=${encodeURIComponent(tag)}`)}
                className="px-3 py-1 text-xs font-medium text-sand-600 bg-sand-100 rounded-full hover:bg-green-50 hover:text-green-700 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-6 mt-10 pt-8 border-t border-sand-200">
            {[
              { value: '230+', label: 'Youth empowered' },
              { value: '9+',   label: 'Countries reached' },
              { value: '100%', label: 'Escrow-protected' },
              { value: 'SDG 12', label: 'Verified listings' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-xl font-display font-semibold text-sand-900">{stat.value}</div>
                <div className="text-xs text-sand-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SDG badge cluster — floating right (desktop only) */}
      <div className="hidden lg:flex absolute right-16 top-1/2 -translate-y-1/2 flex-col gap-3">
        <div className="text-xs font-medium text-sand-400 text-center mb-1">Aligned with</div>
        {SDG_BADGES.map(badge => (
          <div
            key={badge.num}
            className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl shadow-card border border-sand-200 min-w-[200px]"
          >
            <div className={`w-8 h-8 rounded-lg ${badge.color} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-xs font-bold">{badge.num}</span>
            </div>
            <div>
              <div className="text-[10px] font-medium text-sand-400 uppercase tracking-wide">SDG</div>
              <div className="text-xs font-semibold text-sand-800 leading-tight">{badge.label}</div>
            </div>
          </div>
        ))}
        <div className="text-[10px] text-center text-sand-400 mt-1">UN Sustainable Development Goals</div>
      </div>
    </section>
  )
}
