import { ShieldCheck, BadgeCheck, Users } from 'lucide-react'

const PILLARS = [
  {
    icon: ShieldCheck,
    emoji: '🛡️',
    title: 'Escrow-Protected Payments',
    description:
      'Your money is held safely by SWK Ghana and only released to the vendor after you confirm delivery. Zero risk, full peace of mind.',
    color: 'bg-teal-50 text-teal-600',
    iconBg: 'bg-teal-100',
  },
  {
    icon: BadgeCheck,
    emoji: '✅',
    title: 'SDG 12 Verified Vendors',
    description:
      'Every vendor on our platform is individually reviewed and approved against UN SDG 12 responsible consumption standards before they can list.',
    color: 'bg-green-50 text-green-600',
    iconBg: 'bg-green-100',
  },
  {
    icon: Users,
    emoji: '🌍',
    title: 'Youth-Led Entrepreneurs',
    description:
      'We exclusively support young green entrepreneurs across Ghana and Africa, channelling every sale back into sustainable economic empowerment.',
    color: 'bg-gold-50 text-gold-500',
    iconBg: 'bg-gold-100',
  },
] as const

export function TrustSection() {
  return (
    <section className="section bg-teal-50">
      <div className="container-app">
        {/* Headline */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold mb-4">
            <span role="img" aria-hidden="true">🔒</span>
            Safe · Verified · Impactful
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-sand-900 text-balance">
            Why shop at SWK Marketplace?
          </h2>
          <p className="mt-3 text-base text-sand-500 max-w-2xl mx-auto">
            We built every layer of this marketplace to protect buyers, empower vendors, and advance sustainability across Africa.
          </p>
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {PILLARS.map(pillar => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.title}
                className="flex flex-col items-start bg-white rounded-2xl p-6 shadow-card border border-sand-200 hover:shadow-card-md transition-shadow"
              >
                {/* Icon circle */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${pillar.iconBg}`}>
                  <Icon className={`w-6 h-6 ${pillar.color.split(' ')[1]}`} aria-hidden="true" />
                </div>

                <h3 className="text-lg font-semibold text-sand-900 mb-2">
                  <span role="img" aria-hidden="true" className="mr-1.5">{pillar.emoji}</span>
                  {pillar.title}
                </h3>
                <p className="text-sm text-sand-500 leading-relaxed flex-1">
                  {pillar.description}
                </p>
              </div>
            )
          })}
        </div>

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
            230+ Youth Vendors
          </span>
        </div>
      </div>
    </section>
  )
}
