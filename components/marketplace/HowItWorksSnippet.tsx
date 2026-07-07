import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/motion'

const STEPS = [
  {
    number: 1,
    emoji: '🛍️',
    title: 'Browse & Choose',
    description:
      'Find SDG-verified products from young Ghanaian entrepreneurs. Filter by category, values, or region.',
  },
  {
    number: 2,
    emoji: '🔒',
    title: 'Pay Securely',
    description:
      'Your payment is processed via Paystack and held in escrow by SWK Ghana — completely safe until delivery.',
  },
  {
    number: 3,
    emoji: '✅',
    title: 'Confirm & Deliver',
    description:
      'Once your order arrives, confirm delivery to release payment to the vendor. Dispute if anything goes wrong.',
  },
] as const

export function HowItWorksSnippet() {
  return (
    <section className="section bg-white">
      <div className="container-app">
        {/* Header */}
        <FadeIn className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold mb-4">
            Simple &amp; Transparent
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-sand-900">
            How it works
          </h2>
          <p className="mt-3 text-base text-sand-500 max-w-xl mx-auto">
            Three easy steps from discovery to delivery — backed by our escrow guarantee.
          </p>
        </FadeIn>

        {/* Steps */}
        <Stagger className="flex flex-col md:flex-row items-start gap-8 md:gap-6 relative">
          {/* Connector line — desktop only */}
          <div
            className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-sand-200"
            style={{ left: '10%', right: '10%', top: '1.5rem' }}
            aria-hidden="true"
          />

          {STEPS.map((step, idx) => (
            <StaggerItem
              key={step.number}
              className="flex-1 flex flex-col items-center text-center relative"
            >
              {/* Number circle */}
              <div className="relative z-10 w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-lg font-bold font-display shadow-card mb-4 ring-4 ring-white">
                {step.number}
              </div>

              {/* Connector arrow — mobile only (between steps) */}
              {idx < STEPS.length - 1 && (
                <div className="md:hidden mb-4 text-sand-300" aria-hidden="true">
                  <ArrowRight className="w-5 h-5 rotate-90 mx-auto" />
                </div>
              )}

              <div className="text-3xl mb-3" role="img" aria-hidden="true">
                {step.emoji}
              </div>

              <h3 className="text-lg font-semibold text-sand-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-sand-500 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </StaggerItem>
          ))}
        </Stagger>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors group"
          >
            Learn more about how SWK Marketplace works
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
