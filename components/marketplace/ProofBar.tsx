import { CountUp } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

// SWK Ghana in four numbers, straight under the hero: the credibility a first-time
// buyer looks for before trusting a new marketplace with money.
const STATS = [
  { end: 236, suffix: '+', label: 'Young people reached by SWK programmes' },
  { end: 9,   suffix: '+', label: 'Countries reached across Africa and beyond' },
  { end: 100, suffix: '%', label: 'Of orders protected by escrow' },
  { end: 15,  suffix: '%', label: 'Commission, reinvested in youth enterprise' },
]

export function ProofBar() {
  return (
    <section aria-label="SWK Ghana in numbers" className="bg-green-900 text-white">
      <dl className="container-app grid grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              'flex flex-col px-4 sm:px-6 py-7 lg:py-9 border-white/10',
              i % 2 === 1 && 'border-l',
              i >= 2 && 'border-t lg:border-t-0',
              i === 2 && 'lg:border-l',
            )}
          >
            <dt className="order-2 mt-1.5 text-xs sm:text-sm leading-snug text-green-100">{stat.label}</dt>
            <dd className="order-1 text-3xl md:text-4xl font-bold tracking-tight">
              <span aria-hidden="true">
                <CountUp end={stat.end} />
                <span className="text-green-200">{stat.suffix}</span>
              </span>
              <span className="sr-only">{stat.end}{stat.suffix}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
