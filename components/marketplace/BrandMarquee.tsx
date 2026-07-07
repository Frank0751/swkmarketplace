const ITEMS = [
  '🌿 SDG 12 Verified',
  '🛡️ 100% Escrow Protected',
  '✊ Youth-Led Vendors',
  '🇬🇭 Made in Ghana',
  '♻️ Zero Greenwashing',
  '🤝 15% Reinvested in Youth',
  '📦 Nationwide Delivery',
  '⭐ Verified Buyer Reviews',
] as const

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
            {ITEMS.map(item => (
              <span
                key={`${copy}-${item}`}
                className="flex items-center gap-2 px-6 text-sm font-bold uppercase tracking-wider text-white whitespace-nowrap"
              >
                {item}
                <span className="text-green-500 text-lg leading-none">•</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
