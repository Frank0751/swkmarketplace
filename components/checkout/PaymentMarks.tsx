import { CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CardBrand } from '@/lib/payments/test-cards'
import type { MomoNetwork } from '@/types'

// Compact marks for card brands and mobile money networks: styled names and
// brand colours, decorative (the text next to them says the same thing).

export function CardBrandMark({ brand, className }: { brand?: CardBrand | string | null; className?: string }) {
  const base = 'inline-flex items-center justify-center w-11 h-7 rounded-md border text-[10px] leading-none flex-shrink-0'
  if (brand === 'visa') {
    return (
      <span aria-hidden="true" className={cn(base, 'bg-white border-sand-200 text-[#1a1f71] italic font-black text-[11px] tracking-tight', className)}>
        VISA
      </span>
    )
  }
  if (brand === 'mastercard') {
    return (
      <span aria-hidden="true" className={cn(base, 'bg-white border-sand-200', className)}>
        <span className="w-3.5 h-3.5 rounded-full bg-[#eb001b]" />
        <span className="w-3.5 h-3.5 rounded-full bg-[#f79e1b] -ml-1.5 mix-blend-multiply" />
      </span>
    )
  }
  if (brand === 'verve') {
    return (
      <span aria-hidden="true" className={cn(base, 'bg-[#00425f] border-[#00425f] text-white font-bold', className)}>
        Verve
      </span>
    )
  }
  return (
    <span aria-hidden="true" className={cn(base, 'bg-sand-50 border-sand-200 text-sand-600', className)}>
      <CreditCard className="w-4 h-4" />
    </span>
  )
}

const MOMO_STYLE: Record<MomoNetwork, { text: string; className: string }> = {
  'MTN MoMo':     { text: 'MTN',     className: 'bg-[#ffcc00] border-[#ffcc00] text-sand-900' },
  'Telecel Cash': { text: 'Telecel', className: 'bg-[#e40000] border-[#e40000] text-white' },
  'AT Money':     { text: 'AT',      className: 'bg-[#0047ba] border-[#0047ba] text-white' },
}

export function MomoMark({ network, className }: { network?: MomoNetwork | string | null; className?: string }) {
  const style = network && network in MOMO_STYLE ? MOMO_STYLE[network as MomoNetwork] : null
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center w-11 h-7 rounded-md border text-[10px] font-bold leading-none flex-shrink-0',
        style?.className ?? 'bg-sand-50 border-sand-200 text-sand-600',
        className,
      )}
    >
      {style?.text ?? 'MoMo'}
    </span>
  )
}
