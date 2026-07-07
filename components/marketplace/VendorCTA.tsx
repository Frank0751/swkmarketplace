import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { FadeIn } from '@/components/ui/motion'

const STATS = [
  { value: 'SDG 12', label: 'Aligned listings only' },
  { value: 'Escrow', label: 'Protected sales' },
  { value: '15%', label: 'Commission — nothing more' },
]

export function VendorCTA() {
  return (
    <section className="section relative overflow-hidden">
      {/* Photography background — young African entrepreneurs at work */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/images/vendor-cta.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-green-800/95 via-green-800/90 to-green-900/95" />
      </div>

      {/* Decorative dot pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />

      <div className="container-app relative">
        <FadeIn className="max-w-3xl mx-auto text-center">
          {/* Pre-headline */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
            <span role="img" aria-hidden="true" className="text-sm">🌱</span>
            <span className="text-xs font-semibold text-white/90">
              Youth-Led · Sustainable · Ghana &amp; Africa
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-semibold text-white leading-tight text-balance mb-4">
            Are you a young green entrepreneur?
          </h2>

          {/* Subtext */}
          <p className="text-base md:text-lg text-white/80 leading-relaxed mb-10 max-w-2xl mx-auto">
            Join <span className="font-semibold text-white">230+ verified youth vendors</span> selling sustainable products across Ghana and Africa. We provide escrow-protected sales, SDG-aligned exposure, and a community that cares about the planet.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {STATS.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-display font-bold text-white">{stat.value}</div>
                <div className="text-xs text-white/60 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-24 h-px bg-white/20 mx-auto mb-10" aria-hidden="true" />

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/vendor/apply"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-green-700 text-sm font-bold rounded-xl hover:bg-sand-50 active:scale-95 transition-all shadow-card-lg group"
            >
              Apply to become a vendor
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="https://swkghana.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-transparent text-white text-sm font-semibold rounded-xl border border-white/40 hover:border-white/70 hover:bg-white/10 active:scale-95 transition-all"
            >
              Learn more about SWK
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </Link>
          </div>

          {/* Reassurance line */}
          <p className="mt-6 text-xs text-white/50">
            Free to apply · Admin-reviewed · Only pay commission on successful sales
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
