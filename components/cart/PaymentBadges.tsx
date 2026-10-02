import { cn } from '@/lib/utils'

// Text marks for the ways to pay, shown on the cart and checkout. Plain
// styled names rather than the networks' artwork.

const BADGES = [
  { label: 'VISA',         className: 'text-[#1a1f71] italic font-black tracking-tight' },
  { label: 'Mastercard',   className: 'text-[#eb001b] font-bold' },
  { label: 'MTN MoMo',     className: 'text-sand-900 bg-[#ffcc00] border-[#ffcc00] font-bold' },
  { label: 'Telecel Cash', className: 'text-white bg-[#e40000] border-[#e40000] font-bold' },
  { label: 'AT Money',     className: 'text-white bg-[#0047ba] border-[#0047ba] font-bold' },
]

export function PaymentBadges({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-1.5', className)} aria-label="Ways to pay">
      {BADGES.map(b => (
        <li
          key={b.label}
          className={cn('px-2 py-0.5 rounded-md border border-sand-200 bg-white text-[10px] leading-4', b.className)}
        >
          {b.label}
        </li>
      ))}
    </ul>
  )
}
