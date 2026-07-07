import Image from 'next/image'
import { ShoppingCart, ShieldCheck, PackageCheck, Banknote, ArrowDown } from 'lucide-react'
import { FadeIn, Stagger, StaggerItem, CountUp } from '@/components/ui/motion'

// ─── Escrow flow (infographic) ─────────────────────────────────────────────────

const ESCROW_STEPS = [
  {
    icon: ShoppingCart,
    title: 'You order & pay',
    description: 'Checkout securely with mobile money or card via Paystack.',
    accent: 'bg-green-50 text-green-600 border-green-100',
  },
  {
    icon: ShieldCheck,
    title: 'SWK holds your money',
    description: 'Funds sit safely in escrow, the vendor is not paid yet.',
    accent: 'bg-teal-50 text-teal-600 border-teal-100',
  },
  {
    icon: PackageCheck,
    title: 'Vendor delivers',
    description: 'Your order is prepared, dispatched and delivered to you.',
    accent: 'bg-gold-50 text-gold-500 border-gold-100',
  },
  {
    icon: Banknote,
    title: 'You confirm, vendor gets paid',
    description: 'Only after you confirm delivery is the payout released.',
    accent: 'bg-green-50 text-green-600 border-green-100',
  },
] as const

// ─── Impact stats (Jamii-style "Did you know?" band) ───────────────────────────

const IMPACT_STATS = [
  { end: 236, suffix: '+', label: 'Youth empowered through SWK programmes' },
  { end: 9, suffix: '+', label: 'Countries reached across Africa & beyond' },
  { end: 100, suffix: '%', label: 'Of orders protected by escrow' },
  { end: 15, suffix: '%', label: 'Commission reinvested in youth development' },
] as const

export function TrustSection() {
  return (
    <section className="section bg-teal-50 overflow-hidden">
      <div className="container-app">
        {/* Headline */}
        <FadeIn className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold mb-4">
            <span role="img" aria-hidden="true">🔒</span>
            How your money stays safe
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-sand-900 text-balance">
            Escrow protection, from checkout to doorstep
          </h2>
          <p className="mt-3 text-base text-sand-500 max-w-2xl mx-auto">
            SWK Ghana acts as your trusted intermediary on every single order. The vendor is only
            paid after you confirm your delivery arrived as described.
          </p>
        </FadeIn>

        {/* Escrow flow infographic */}
        <div className="relative mb-16">
          {/* Connecting line, desktop */}
          <div
            className="hidden lg:block absolute top-10 h-0.5 bg-gradient-to-r from-green-200 via-teal-300 to-green-200"
            style={{ left: '12%', right: '12%' }}
            aria-hidden="true"
          />

          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ESCROW_STEPS.map((step, idx) => {
              const Icon = step.icon
              return (
                <StaggerItem key={step.title} className="relative">
                  <div className="flex flex-col items-center text-center bg-white rounded-2xl border border-sand-200 shadow-card p-6 h-full">
                    <div className={`relative z-10 w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${step.accent}`}>
                      <Icon className="w-6 h-6" aria-hidden="true" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-sand-900 text-white text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-sand-900 mb-1.5">{step.title}</h3>
                    <p className="text-xs text-sand-500 leading-relaxed">{step.description}</p>
                  </div>
                  {/* Mobile connector */}
                  {idx < ESCROW_STEPS.length - 1 && (
                    <div className="sm:hidden flex justify-center py-2 text-teal-300" aria-hidden="true">
                      <ArrowDown className="w-5 h-5" />
                    </div>
                  )}
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>

        {/* "Did you know?" impact band */}
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-green-800">
            {/* Photo side */}
            <div className="grid lg:grid-cols-[380px,1fr]">
              <div className="relative min-h-[220px] lg:min-h-0">
                <Image
                  src="/images/impact-seedling.jpg"
                  alt="Seedlings growing, SWK youth impact"
                  fill
                  sizes="(max-width: 1024px) 100vw, 380px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-green-800/60 hidden lg:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-green-800/70 to-transparent lg:hidden" />
              </div>

              {/* Stats side */}
              <div className="relative p-8 md:p-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-semibold mb-4">
                  <span role="img" aria-hidden="true">💡</span>
                  Did you know?
                </span>
                <h3 className="text-2xl md:text-3xl font-display font-semibold text-white mb-2 text-balance">
                  Every purchase powers youth-led green enterprise
                </h3>
                <p className="text-sm text-white/70 max-w-xl mb-8">
                  SWK Marketplace is run by SWK Ghana, a youth-focused nonprofit. The platform&rsquo;s
                  commission goes straight back into training, onboarding and growing young
                  entrepreneurs across Ghana and Africa.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {IMPACT_STATS.map(stat => (
                    <div key={stat.label}>
                      <div className="text-3xl md:text-4xl font-display font-bold text-white">
                        <CountUp end={stat.end} suffix={stat.suffix} />
                      </div>
                      <div className="mt-1 text-[11px] leading-snug text-white/60 font-medium">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Trust badge row */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <span className="trust-badge">
            <span role="img" aria-hidden="true">🔒</span>
            100% Escrow Protected
          </span>
          <span className="trust-badge">
            <span role="img" aria-hidden="true">✅</span>
            SDG 12 Verified Listings
          </span>
          <span className="trust-badge">
            <span role="img" aria-hidden="true">🌍</span>
            Youth-Led Vendors
          </span>
        </div>
      </div>
    </section>
  )
}
