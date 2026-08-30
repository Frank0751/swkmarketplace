import {
  BadgeCheck,
  ShieldCheck,
  Users,
  MapPin,
  Recycle,
  HandCoins,
  Truck,
  Star,
  type LucideIcon,
} from 'lucide-react'

const ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: BadgeCheck, label: 'SDG 12 Verified' },
  { icon: ShieldCheck, label: '100% Escrow Protected' },
  { icon: Users, label: 'Youth-Led Vendors' },
  { icon: MapPin, label: 'Made in Ghana' },
  { icon: Recycle, label: 'Zero Greenwashing' },
  { icon: HandCoins, label: '15% Reinvested in Youth' },
  { icon: Truck, label: 'Nationwide Delivery' },
  { icon: Star, label: 'Verified Buyer Reviews' },
]

// Animated brand ribbon. The list is rendered twice so the CSS marquee
// (translateX -50%) loops seamlessly. Pauses on hover, off for reduced motion.
export function BrandMarquee() {
  return (
    <div
      className="relative overflow-hidden bg-sand-900 py-3 border-y-4 border-green-600"
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee">
        {[0, 1].map(copy => (
          <div key={copy} className="flex items-center flex-shrink-0">
            {ITEMS.map(item => {
              const Icon = item.icon
              return (
                <span
                  key={`${copy}-${item.label}`}
                  className="flex items-center gap-2.5 px-6 text-sm font-bold uppercase tracking-wider text-white whitespace-nowrap"
                >
                  <Icon className="w-4 h-4 text-green-500" />
                  {item.label}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
