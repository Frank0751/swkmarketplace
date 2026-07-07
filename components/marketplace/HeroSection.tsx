'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { Search, ArrowRight, ShieldCheck, Star } from 'lucide-react'
import { CountUp } from '@/components/ui/motion'

const HERO_TAGS = ['Organic produce', 'Recycled crafts', 'Agribusiness', 'Handmade goods']

export function HeroSection() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/marketplace?search=${encodeURIComponent(query)}`)
    else router.push('/marketplace')
  }

  const enter = (delay: number) =>
    reduce
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: [0.21, 0.65, 0.35, 1] as const },
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

      {/* Green gradient blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-green-50 blur-3xl opacity-60" />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-teal-50 blur-3xl opacity-60" />

      <div className="container-app relative">
        <div className="grid lg:grid-cols-[1fr,460px] gap-10 lg:gap-14 items-center py-14 md:py-20 lg:py-24">

          {/* ── Left: copy + search ─────────────────────────────── */}
          <div className="max-w-2xl">
            <motion.div {...enter(0)} className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-slow" />
                <span className="text-xs font-medium text-green-700">SDG 12 Verified · Youth-Powered · Ghana</span>
              </div>
            </motion.div>

            <motion.h1
              {...enter(0.08)}
              className="text-4xl sm:text-5xl md:text-6xl font-display font-semibold text-sand-900 leading-[1.08] tracking-tight mb-6 text-balance"
            >
              Shop green.{' '}
              <span className="text-green-600 italic">Support youth.</span>{' '}
              Build Africa.
            </motion.h1>

            <motion.p {...enter(0.16)} className="text-lg md:text-xl text-sand-500 mb-8 leading-relaxed">
              A curated marketplace of eco-friendly products from verified young entrepreneurs across Ghana.
              Every purchase is escrow-protected.
            </motion.p>

            {/* Search */}
            <motion.form {...enter(0.24)} onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-xl">
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
            </motion.form>

            {/* Quick tags */}
            <motion.div {...enter(0.3)} className="flex flex-wrap items-center gap-2">
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
            </motion.div>

            {/* Stats row */}
            <motion.div {...enter(0.36)} className="flex flex-wrap items-center gap-6 mt-10 pt-8 border-t border-sand-200">
              {[
                { end: 230, suffix: '+', label: 'Youth empowered' },
                { end: 9, suffix: '+', label: 'Countries reached' },
                { end: 100, suffix: '%', label: 'Escrow-protected' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-xl font-display font-semibold text-sand-900">
                    <CountUp end={stat.end} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs text-sand-400 font-medium">{stat.label}</div>
                </div>
              ))}
              <div>
                <div className="text-xl font-display font-semibold text-sand-900">SDG 12</div>
                <div className="text-xs text-sand-400 font-medium">Verified listings</div>
              </div>
            </motion.div>
          </div>

          {/* ── Right: photo composition (desktop) ───────────────── */}
          <div className="relative hidden lg:block" aria-hidden="true">
            {/* Arch-cropped hero image */}
            <motion.div
              initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.21, 0.65, 0.35, 1] }}
              className="relative w-full overflow-hidden shadow-card-lg border-4 border-white"
              style={{ borderRadius: '230px 230px 24px 24px', aspectRatio: '4/5' }}
            >
              <Image
                src="/images/hero-market.jpg"
                alt=""
                fill
                priority
                sizes="460px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sand-900/30 via-transparent to-transparent" />
            </motion.div>

            {/* Floating escrow badge */}
            <motion.div
              initial={reduce ? { opacity: 1 } : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="absolute top-16 -left-10 bg-white rounded-2xl shadow-card-lg border border-sand-200 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-sand-900">Escrow protected</div>
                <div className="text-[11px] text-sand-400">Money held until delivery</div>
              </div>
            </motion.div>

            {/* Floating vendor mini-card */}
            <motion.div
              initial={reduce ? { opacity: 1 } : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              className="absolute bottom-14 -right-8 bg-white rounded-2xl shadow-card-lg border border-sand-200 px-4 py-3 max-w-[220px]"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <Image src="/images/prod-honey.jpg" alt="" fill sizes="32px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-sand-900 truncate">GreenHarvest Farms</div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                    <span className="text-[11px] text-sand-500">4.9 · Kumasi</span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-sand-500 leading-snug">
                &ldquo;Every jar of honey funds our apiary school for young beekeepers.&rdquo;
              </div>
            </motion.div>

            {/* Floating SDG chip */}
            <motion.div
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.95 }}
              className="absolute -bottom-4 left-10 bg-green-600 text-white rounded-xl shadow-card-lg px-4 py-2.5 flex items-center gap-2"
            >
              <span className="text-base" role="img">🌿</span>
              <span className="text-xs font-bold">UN SDG 12 · Responsible Consumption</span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
